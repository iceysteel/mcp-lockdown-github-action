import type { GitHub } from '@actions/github/lib/utils';
import { TestReport, VulnerabilityStatus } from './types';

type Octokit = InstanceType<typeof GitHub>;

const STATUS_ICONS: Record<VulnerabilityStatus, string> = {
  vulnerable: '🔴',
  not_vulnerable: '🟢',
  test_failed: '🟡',
  unknown: '⚪',
};

const STATUS_LABELS: Record<VulnerabilityStatus, string> = {
  vulnerable: 'Vulnerable',
  not_vulnerable: 'Not Vulnerable',
  test_failed: 'Test Failed',
  unknown: 'Unknown',
};

/**
 * Post a PR comment for a single completed technique.
 */
export async function postTechniqueComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  report: TestReport,
  apiUrl: string,
  testId: string
): Promise<void> {
  const body = formatTechniqueComment(report, apiUrl, testId);
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}

/**
 * Format a PR comment for a single technique result.
 */
export function formatTechniqueComment(
  report: TestReport,
  apiUrl: string,
  testId: string
): string {
  const icon = STATUS_ICONS[report.vulnerability_status] || '⚪';
  const label = STATUS_LABELS[report.vulnerability_status] || 'Unknown';

  let comment = `## ${icon} ${report.technique_id} — ${label}\n\n`;

  if (report.repository) {
    comment += `**Repository:** ${report.repository}\n`;
  }

  // Evidence section
  if (report.evidence.length > 0) {
    comment += `\n### Evidence\n\n`;
    for (const e of report.evidence) {
      comment += `- **${e.category}**: ${e.description}\n`;
    }
  }

  // Attack summary for vulnerable results
  if (
    report.vulnerability_status === 'vulnerable' &&
    report.attack_result.response
  ) {
    const summary = truncate(report.attack_result.response, 500);
    comment += `\n### Attack Summary\n\n`;
    comment += `> ${summary.replace(/\n/g, '\n> ')}\n`;
  }

  // Error info for failed tests
  if (
    report.vulnerability_status === 'test_failed' &&
    report.attack_result.response
  ) {
    const error = truncate(report.attack_result.response, 300);
    comment += `\n### Error Details\n\n`;
    comment += `\`\`\`\n${error}\n\`\`\`\n`;
  }

  comment += `\n---\n`;
  comment += `[View Full Report](${apiUrl}/tests/${testId})`;
  comment += ` | Scanned by [MCP Lockdown](https://mcplockdown.com)\n`;

  return comment;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
