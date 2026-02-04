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
      // Queue — poll the queue and check each technique's test
      const queue = await client.getQueueDetail(scan.id);

      for (const entry of queue.tests) {
        if (
          TERMINAL_STATUSES.includes(entry.status) &&
          !completedTechniques.has(entry.technique_id)
        ) {
          completedTechniques.add(entry.technique_id);

          // Fetch full test detail to get the report
          const detail = await client.getTestDetail(entry.test_id);
          const report = extractReport(
            detail.result,
            entry.technique_id
          );
          allReports.push(report);
          await onTechniqueComplete(entry.test_id, report);
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
