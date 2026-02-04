import * as fs from 'fs/promises';
import { TestReport, VulnerabilityStatus } from './types';

interface SARIFReport {
  $schema: string;
  version: string;
  runs: SARIFRun[];
}

interface SARIFRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SARIFRule[];
    };
  };
  results: SARIFResult[];
}

interface SARIFRule {
  id: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  properties: {
    tags: string[];
    'security-severity': string;
  };
}

interface SARIFResult {
  ruleId: string;
  level: string;
  message: { text: string };
}

const SEVERITY_SCORE: Record<VulnerabilityStatus, string> = {
  vulnerable: '8.0',
  not_vulnerable: '0.0',
  test_failed: '0.0',
  unknown: '0.0',
};

const SARIF_LEVEL: Record<VulnerabilityStatus, string> = {
  vulnerable: 'error',
  not_vulnerable: 'note',
  test_failed: 'warning',
  unknown: 'note',
};

/**
 * Generate a SARIF 2.1.0 report from an array of technique reports.
 * Only includes techniques that found vulnerabilities or had failures.
 */
export function generateSARIF(reports: TestReport[]): SARIFReport {
  const rules: SARIFRule[] = [];
  const results: SARIFResult[] = [];

  for (const report of reports) {
    // Skip techniques that found nothing
    if (report.vulnerability_status === 'not_vulnerable') {
      continue;
    }

    const description = buildDescription(report);

    rules.push({
      id: report.technique_id,
      shortDescription: { text: `${report.technique_id} Security Check` },
      fullDescription: { text: description },
      properties: {
        tags: ['security', 'mcp'],
        'security-severity':
          SEVERITY_SCORE[report.vulnerability_status] || '0.0',
      },
    });

    results.push({
      ruleId: report.technique_id,
      level: SARIF_LEVEL[report.vulnerability_status] || 'note',
      message: { text: description },
    });
  }

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'MCP Lockdown',
            version: '1.0.0',
            informationUri: 'https://mcplockdown.com',
            rules,
          },
        },
        results,
      },
    ],
  };
}

/**
 * Write SARIF report to a file.
 */
export async function writeSARIF(
  path: string,
  sarif: SARIFReport
): Promise<void> {
  await fs.writeFile(path, JSON.stringify(sarif, null, 2), 'utf-8');
}

function buildDescription(report: TestReport): string {
  const parts: string[] = [];

  if (report.vulnerability_status === 'vulnerable') {
    parts.push(
      `Security vulnerability found for technique ${report.technique_id}.`
    );
    if (report.evidence.length > 0) {
      parts.push(
        `Evidence: ${report.evidence.map((e) => e.description).join('; ')}`
      );
    }
  } else if (report.vulnerability_status === 'test_failed') {
    parts.push(
      `Test failed for technique ${report.technique_id} — could not complete scan.`
    );
  } else {
    parts.push(`Technique ${report.technique_id}: ${report.vulnerability_status}`);
  }

  return parts.join(' ');
}
