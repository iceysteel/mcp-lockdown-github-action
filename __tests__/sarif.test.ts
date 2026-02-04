import { generateSARIF } from '../src/sarif';
import { TestReport } from '../src/types';

function makeReport(overrides: Partial<TestReport> = {}): TestReport {
  return {
    technique_id: 'SAFE-T1001',
    repository: 'https://github.com/test/mcp-server',
    vulnerability_status: 'vulnerable',
    deployment: { prompt: '', response: '', success: true, steps: 0 },
    attack_result: {
      prompt: '',
      response: 'Exploited successfully',
      success: true,
      steps: 5,
    },
    evidence: [
      {
        evidence_filename: 'payload.txt',
        description: 'Malicious payload injected',
        category: 'payload',
      },
    ],
    conversation_log: [],
    ...overrides,
  };
}

describe('generateSARIF', () => {
  it('generates valid SARIF 2.1.0 structure', () => {
    const sarif = generateSARIF([makeReport()]);

    expect(sarif.$schema).toBe(
      'https://json.schemastore.org/sarif-2.1.0.json'
    );
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('MCP Lockdown');
  });

  it('includes vulnerable techniques as error-level results', () => {
    const sarif = generateSARIF([makeReport()]);

    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].ruleId).toBe('SAFE-T1001');
    expect(sarif.runs[0].results[0].level).toBe('error');
  });

  it('excludes not_vulnerable techniques', () => {
    const sarif = generateSARIF([
      makeReport({ vulnerability_status: 'not_vulnerable' }),
    ]);

    expect(sarif.runs[0].results).toHaveLength(0);
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(0);
  });

  it('includes test_failed as warning-level results', () => {
    const sarif = generateSARIF([
      makeReport({
        technique_id: 'SAFE-T1002',
        vulnerability_status: 'test_failed',
      }),
    ]);

    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].level).toBe('warning');
  });

  it('handles multiple reports', () => {
    const sarif = generateSARIF([
      makeReport({ technique_id: 'SAFE-T1001' }),
      makeReport({
        technique_id: 'SAFE-T1002',
        vulnerability_status: 'not_vulnerable',
      }),
      makeReport({
        technique_id: 'SAFE-T1003',
        vulnerability_status: 'test_failed',
      }),
    ]);

    // Only SAFE-T1001 (vulnerable) and SAFE-T1003 (test_failed) should be included
    expect(sarif.runs[0].results).toHaveLength(2);
    expect(sarif.runs[0].results.map((r) => r.ruleId)).toEqual([
      'SAFE-T1001',
      'SAFE-T1003',
    ]);
  });

  it('handles empty report list', () => {
    const sarif = generateSARIF([]);

    expect(sarif.runs[0].results).toHaveLength(0);
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(0);
  });

  it('includes evidence in description', () => {
    const sarif = generateSARIF([makeReport()]);

    const description = sarif.runs[0].results[0].message.text;
    expect(description).toContain('Malicious payload injected');
  });
});
