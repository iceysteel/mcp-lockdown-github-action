import { MCPLockdownClient } from './api-client';
import { ScanHandle, PollOptions, TestReport, TestResult } from './types';

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

/**
 * Poll a scan (single test or queue) until all techniques complete or timeout.
 * Calls onTechniqueComplete as each technique finishes.
 * Returns the list of all completed reports.
 */
export async function pollScan(
  client: MCPLockdownClient,
  scan: ScanHandle,
  options: PollOptions
): Promise<TestReport[]> {
  const { timeoutMs, pollIntervalMs, onTechniqueComplete } = options;
  const startTime = Date.now();
  const completedTechniques = new Set<string>();
  const allReports: TestReport[] = [];

  while (Date.now() - startTime < timeoutMs) {
    if (scan.type === 'test') {
      // Single test — just poll the one test
      const detail = await client.getTestDetail(scan.id);

      if (
        TERMINAL_STATUSES.includes(detail.status) &&
        !completedTechniques.has(detail.technique_id)
      ) {
        completedTechniques.add(detail.technique_id);

        const report = extractReport(detail.result, detail.technique_id);
        allReports.push(report);
        await onTechniqueComplete(detail.test_id, report);
      }

      if (TERMINAL_STATUSES.includes(detail.status)) {
        break;
      }
    } else {
      // Queue — poll the queue and derive per-technique status
      const queue = await client.getQueueDetail(scan.id);

      for (const techniqueId of queue.technique_ids) {
        const testId = queue.test_ids[techniqueId];
        if (!testId) continue; // technique hasn't started yet

        const isCompleted = queue.completed_techniques.includes(techniqueId);
        const isFailed = queue.failed_techniques.includes(techniqueId);
        const isSkipped = queue.skipped_techniques.includes(techniqueId);

        if ((isCompleted || isFailed || isSkipped) && !completedTechniques.has(techniqueId)) {
          completedTechniques.add(techniqueId);

          // Fetch full test detail to get the report
          const detail = await client.getTestDetail(testId);
          const report = extractReport(detail.result, techniqueId);
          allReports.push(report);
          await onTechniqueComplete(testId, report);
        }
      }

      // Check if entire queue is done
      if (TERMINAL_STATUSES.includes(queue.status)) {
        break;
      }
    }

    await sleep(pollIntervalMs);
  }

  // Check for timeout — report any techniques that didn't complete
  const timedOut = scan.techniqueIds.filter(
    (id) => !completedTechniques.has(id)
  );
  if (timedOut.length > 0) {
    throw new Error(
      `Timed out waiting for techniques: ${timedOut.join(', ')}`
    );
  }

  return allReports;
}

/**
 * Extract a TestReport from the result field, with a fallback
 * for tests that failed without producing a report.
 */
function extractReport(
  result: TestResult | null | undefined,
  techniqueId: string
): TestReport {
  if (result && typeof result === 'object') {
    const report = result.report;
    if (report && typeof report === 'object') {
      return report;
    }
  }

  // Fallback for tests that failed without a report
  return {
    technique_id: techniqueId,
    repository: '',
    vulnerability_status: 'test_failed',
    deployment: { prompt: '', response: '', success: false, steps: 0 },
    attack_result: { prompt: '', response: '', success: false, steps: 0 },
    evidence: [],
    conversation_log: [],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
