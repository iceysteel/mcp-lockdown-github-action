import type { GitHub } from '@actions/github/lib/utils';
import { TestReport, VulnerabilityStatus } from './types';

type Octokit = InstanceType<typeof GitHub>;

type CheckConclusion =
  | 'failure'
  | 'success'
  | 'neutral'
  | 'action_required'
  | 'cancelled'
  | 'skipped'
  | 'stale'
  | 'timed_out';

const CONCLUSION_MAP: Record<VulnerabilityStatus, CheckConclusion> = {
  vulnerable: 'failure',
  not_vulnerable: 'success',
  test_failed: 'neutral',
  unknown: 'neutral',
};

const STATUS_LABELS: Record<VulnerabilityStatus, string> = {
  vulnerable: 'Vulnerable — security issue found',
  not_vulnerable: 'Not Vulnerable — no issues found',
  test_failed: 'Test Failed — could not complete scan',
  unknown: 'Unknown — result could not be classified',
};

/**
 * Create a Check Run in "queued" state for a technique.
 * Returns the check run ID.
 */
export async function createCheckRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
  techniqueId: string
): Promise<number> {
  const response = await octokit.rest.checks.create({
    owner,
    repo,
    name: `MCP Lockdown: ${techniqueId}`,
    head_sha: sha,
    status: 'queued',
  });
  return response.data.id;
}

/**
 * Update a Check Run to "in_progress" state.
 */
export async function startCheckRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  checkRunId: number
): Promise<void> {
  await octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  });
}

/**
 * Complete a Check Run with the technique's result.
 */
export async function completeCheckRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  checkRunId: number,
  report: TestReport,
  apiUrl: string,
  testId: string
): Promise<void> {
  const conclusion = CONCLUSION_MAP[report.vulnerability_status] || 'neutral';
  const summary =
    STATUS_LABELS[report.vulnerability_status] || 'Unknown result';

  let details = '';
  if (report.evidence.length > 0) {
    details += '### Evidence\n\n';
    for (const e of report.evidence) {
      details += `- **${e.category}**: ${e.description}\n`;
    }
    details += '\n';
  }
  if (report.vulnerability_status === 'vulnerable' && report.attack_result.response) {
    const response = report.attack_result.response.slice(0, 1000);
    details += '### Attack Summary\n\n';
    details += `> ${response.replace(/\n/g, '\n> ')}\n`;
  }
  details += `\n[View Full Report](${apiUrl}/tests/${testId})`;

  await octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    status: 'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: `${report.technique_id}: ${summary}`,
      summary,
      text: details,
    },
  });
}
