import * as core from '@actions/core';
import * as github from '@actions/github';
import { MCPLockdownClient } from './api-client';
import { pollScan } from './poller';
import { createCheckRun, completeCheckRun } from './checks';
import { postTechniqueComment } from './comment';
import { generateSARIF, writeSARIF } from './sarif';
import { resolveTechniques } from './techniques';
import { TestReport } from './types';

async function run(): Promise<void> {
  try {
    // Parse inputs
    const apiKey = core.getInput('api-key', { required: true });
    const apiUrl = core.getInput('api-url');
    const techniques = core.getInput('techniques');
    const timeoutMinutes = parseInt(core.getInput('timeout-minutes'), 10);
    const pollIntervalSec = parseInt(
      core.getInput('poll-interval-seconds'),
      10
    );
    const failOnFindings = core.getBooleanInput('fail-on-findings');
    const commentOnPR = core.getBooleanInput('comment-on-pr');
    const createChecks = core.getBooleanInput('create-checks');
    const sarifOutput = core.getInput('sarif-output');

    // Auto-detect repo URL from GitHub context, allow override
    const repoUrl =
      core.getInput('repo-url') ||
      github.context.payload.repository?.clone_url;
    if (!repoUrl) {
      core.setFailed(
        'Could not determine repo URL. Set the repo-url input explicitly.'
      );
      return;
    }

    // Mask the API key in logs
    core.setSecret(apiKey);

    const client = new MCPLockdownClient(apiUrl, apiKey);
    const token = process.env.GITHUB_TOKEN || '';
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const prNumber = github.context.payload.pull_request?.number;
    const sha =
      github.context.payload.pull_request?.head?.sha || github.context.sha;

    // Resolve technique IDs from input
    const techniqueIds = resolveTechniques(techniques);
    core.info(
      `Running ${techniqueIds.length} technique(s): ${techniqueIds.join(', ')}`
    );

    // Create initial Check Runs for each technique (status: queued)
    const checkRunIds: Record<string, number> = {};
    if (createChecks && token) {
      for (const techId of techniqueIds) {
        try {
          checkRunIds[techId] = await createCheckRun(
            octokit,
            owner,
            repo,
            sha,
            techId
          );
        } catch (err) {
          core.warning(
            `Failed to create check run for ${techId}: ${err instanceof Error ? err.message : err}`
          );
        }
      }
    }

    // Start scan (queue or single test)
    const scan = await client.startScan(repoUrl, techniqueIds);
    core.setOutput('queue-id', scan.id);
    core.info(`Scan started: ${scan.id} (type: ${scan.type})`);

    // Poll and handle per-technique completions
    const allReports: TestReport[] = [];

    const reports = await pollScan(client, scan, {
      timeoutMs: timeoutMinutes * 60 * 1000,
      pollIntervalMs: pollIntervalSec * 1000,

      onTechniqueComplete: async (testId, report) => {
        allReports.push(report);
        core.info(
          `[${report.technique_id}] ${report.vulnerability_status}`
        );

        // Post PR comment for this technique
        if (commentOnPR && prNumber && token) {
          try {
            await postTechniqueComment(
              octokit,
              owner,
              repo,
              prNumber,
              report,
              apiUrl,
              testId
            );
          } catch (err) {
            core.warning(
              `Failed to post PR comment for ${report.technique_id}: ${err instanceof Error ? err.message : err}`
            );
          }
        }

        // Complete the Check Run for this technique
        if (createChecks && checkRunIds[report.technique_id]) {
          try {
            await completeCheckRun(
              octokit,
              owner,
              repo,
              checkRunIds[report.technique_id],
              report,
              apiUrl,
              testId
            );
          } catch (err) {
            core.warning(
              `Failed to update check run for ${report.technique_id}: ${err instanceof Error ? err.message : err}`
            );
          }
        }
      },
    });

    // Set outputs
    const vulnerable = allReports.filter(
      (r) => r.vulnerability_status === 'vulnerable'
    );
    const notVulnerable = allReports.filter(
      (r) => r.vulnerability_status === 'not_vulnerable'
    );
    const failed = allReports.filter(
      (r) => r.vulnerability_status === 'test_failed'
    );

    core.setOutput('total-techniques', String(allReports.length));
    core.setOutput('vulnerable-count', String(vulnerable.length));
    core.setOutput('not-vulnerable-count', String(notVulnerable.length));
    core.setOutput('failed-count', String(failed.length));

    // Write aggregated SARIF
    if (sarifOutput) {
      const sarif = generateSARIF(allReports);
      await writeSARIF(sarifOutput, sarif);
      core.setOutput('sarif-file', sarifOutput);
      core.info(`SARIF report written to: ${sarifOutput}`);
    }

    // Summary
    core.info(
      `Scan complete: ${vulnerable.length} vulnerable, ${notVulnerable.length} not vulnerable, ${failed.length} failed`
    );

    // Fail if configured and vulnerabilities found
    if (failOnFindings && vulnerable.length > 0) {
      core.setFailed(
        `Found vulnerabilities in ${vulnerable.length} technique(s): ${vulnerable.map((r) => r.technique_id).join(', ')}`
      );
    }
  } catch (error) {
    core.setFailed(
      error instanceof Error ? error.message : 'Unexpected error'
    );
  }
}

run();
