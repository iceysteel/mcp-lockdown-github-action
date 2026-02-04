import { formatTechniqueComment } from '../src/comment';
import { TestReport } from '../src/types';

function makeReport(overrides: Partial<TestReport> = {}): TestReport {
  return {
    technique_id: 'SAFE-T1001',
    repository: 'https://github.com/test/mcp-server',
    vulnerability_status: 'vulnerable',
    deployment: { prompt: '', response: '', success: true, steps: 0 },
    attack_result: {
      prompt: 'test prompt',
      response: 'The agent executed unauthorized commands',
      success: true,
      steps: 5,
    },
    evidence: [
      {
        evidence_filename: 'payload.txt',
        description: 'Injected tool description',
        category: 'payload',
      },
    ],
    conversation_log: [],
    ...overrides,
  };
}

describe('formatTechniqueComment', () => {
  it('formats a vulnerable result', () => {
    const comment = formatTechniqueComment(
      makeReport(),
      'https://app.mcplockdown.com',
      'test-123'
    );

    expect(comment).toContain('🔴');
    expect(comment).toContain('SAFE-T1001');
    expect(comment).toContain('Vulnerable');
    expect(comment).toContain('Evidence');
    expect(comment).toContain('Injected tool description');
    expect(comment).toContain('Attack Summary');
    expect(comment).toContain('View Full Report');
    expect(comment).toContain('https://app.mcplockdown.com/tests/test-123');
  });

  it('formats a not_vulnerable result', () => {
    const comment = formatTechniqueComment(
      makeReport({ vulnerability_status: 'not_vulnerable' }),
      'https://app.mcplockdown.com',
      'test-456'
    );

    expect(comment).toContain('🟢');
    expect(comment).toContain('Not Vulnerable');
    expect(comment).not.toContain('Attack Summary');
  });

  it('formats a test_failed result with error details', () => {
    const comment = formatTechniqueComment(
      makeReport({
        vulnerability_status: 'test_failed',
        attack_result: {
          prompt: '',
          response: 'Container timeout after 120s',
          success: false,
          steps: 0,
        },
      }),
      'https://app.mcplockdown.com',
      'test-789'
    );

    expect(comment).toContain('🟡');
    expect(comment).toContain('Test Failed');
    expect(comment).toContain('Error Details');
    expect(comment).toContain('Container timeout after 120s');
  });

  it('truncates long attack responses', () => {
    const longResponse = 'x'.repeat(1000);
    const comment = formatTechniqueComment(
      makeReport({
        attack_result: {
          prompt: '',
          response: longResponse,
          success: true,
          steps: 0,
        },
      }),
      'https://app.mcplockdown.com',
      'test-long'
    );

    expect(comment).toContain('...');
    expect(comment.length).toBeLessThan(longResponse.length + 500);
  });

  it('handles empty evidence list', () => {
    const comment = formatTechniqueComment(
      makeReport({ evidence: [] }),
      'https://app.mcplockdown.com',
      'test-no-evidence'
    );

    expect(comment).not.toContain('### Evidence');
  });
});
