import { completeCheckRun, createCheckRun } from '../src/checks';
import { TestReport } from '../src/types';

function makeReport(overrides: Partial<TestReport> = {}): TestReport {
  return {
    technique_id: 'SAFE-T1001',
    repository: 'https://github.com/test/repo',
    vulnerability_status: 'vulnerable',
    deployment: { prompt: '', response: '', success: true, steps: 0 },
    attack_result: {
      prompt: '',
      response: 'Exploited',
      success: true,
      steps: 5,
    },
    evidence: [
      {
        evidence_filename: 'payload.txt',
        description: 'Injected payload',
        category: 'payload',
      },
    ],
    conversation_log: [],
    ...overrides,
  };
}

describe('createCheckRun', () => {
  it('creates a check run with queued status', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ data: { id: 42 } });
    const octokit = { rest: { checks: { create: mockCreate } } } as any;

    const id = await createCheckRun(
      octokit,
      'owner',
      'repo',
      'sha123',
      'SAFE-T1001'
    );

    expect(id).toBe(42);
    expect(mockCreate).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      name: 'MCP Lockdown: SAFE-T1001',
      head_sha: 'sha123',
      status: 'queued',
    });
  });
});

describe('completeCheckRun', () => {
  it('marks vulnerable result as failure', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    const octokit = { rest: { checks: { update: mockUpdate } } } as any;

    await completeCheckRun(
      octokit,
      'owner',
      'repo',
      42,
      makeReport({ vulnerability_status: 'vulnerable' }),
      'https://app.mcplockdown.com',
      'test-123'
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        check_run_id: 42,
        status: 'completed',
        conclusion: 'failure',
      })
    );
  });

  it('marks not_vulnerable result as success', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    const octokit = { rest: { checks: { update: mockUpdate } } } as any;

    await completeCheckRun(
      octokit,
      'owner',
      'repo',
      42,
      makeReport({ vulnerability_status: 'not_vulnerable' }),
      'https://app.mcplockdown.com',
      'test-456'
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: 'success',
      })
    );
  });

  it('marks test_failed result as neutral', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    const octokit = { rest: { checks: { update: mockUpdate } } } as any;

    await completeCheckRun(
      octokit,
      'owner',
      'repo',
      42,
      makeReport({ vulnerability_status: 'test_failed' }),
      'https://app.mcplockdown.com',
      'test-789'
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: 'neutral',
      })
    );
  });

  it('includes evidence in check run output', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    const octokit = { rest: { checks: { update: mockUpdate } } } as any;

    await completeCheckRun(
      octokit,
      'owner',
      'repo',
      42,
      makeReport(),
      'https://app.mcplockdown.com',
      'test-123'
    );

    const output = mockUpdate.mock.calls[0][0].output;
    expect(output.text).toContain('Injected payload');
    expect(output.text).toContain('View Full Report');
  });
});
