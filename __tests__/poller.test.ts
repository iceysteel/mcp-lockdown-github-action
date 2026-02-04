import { pollScan } from '../src/poller';
import { MCPLockdownClient } from '../src/api-client';
import { ScanHandle, TestDetail, QueueDetail, TestReport } from '../src/types';

// Mock the client
jest.mock('../src/api-client');

function makeTestDetail(overrides: Partial<TestDetail> = {}): TestDetail {
  return {
    test_id: 'test-123',
    technique_id: 'SAFE-T1001',
    repo_url: 'https://github.com/test/repo',
    status: 'completed',
    created_at: '2025-01-01T00:00:00Z',
    started_at: '2025-01-01T00:00:01Z',
    completed_at: '2025-01-01T00:00:30Z',
    steps_completed: 5,
    current_step: null,
    error: null,
    steps: [],
    result: {
      test_id: 'test-123',
      mcp_server: 'test-server',
      technique: {},
      container_exit_code: 0,
      timestamp: '2025-01-01T00:00:30Z',
      report: {
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
        evidence: [],
        conversation_log: [],
      },
      success: true,
    },
    ...overrides,
  };
}

describe('pollScan', () => {
  let mockClient: jest.Mocked<MCPLockdownClient>;

  beforeEach(() => {
    mockClient = new MCPLockdownClient(
      'http://test',
      'key'
    ) as jest.Mocked<MCPLockdownClient>;
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls a single test until completed', async () => {
    const scan: ScanHandle = {
      id: 'test-123',
      type: 'test',
      techniqueIds: ['SAFE-T1001'],
    };

    mockClient.getTestDetail
      .mockResolvedValueOnce(makeTestDetail({ status: 'running' }))
      .mockResolvedValueOnce(makeTestDetail({ status: 'completed' }));

    const onComplete = jest.fn();

    const promise = pollScan(mockClient, scan, {
      timeoutMs: 60000,
      pollIntervalMs: 100,
      onTechniqueComplete: onComplete,
    });

    const reports = await promise;

    expect(reports).toHaveLength(1);
    expect(reports[0].technique_id).toBe('SAFE-T1001');
    expect(reports[0].vulnerability_status).toBe('vulnerable');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('polls a queue and reports per-technique completions', async () => {
    const scan: ScanHandle = {
      id: 'queue-456',
      type: 'queue',
      techniqueIds: ['SAFE-T1001', 'SAFE-T1002'],
    };

    const queueDetail1: QueueDetail = {
      queue_id: 'queue-456',
      repo_url: 'https://github.com/test/repo',
      status: 'running',
      technique_ids: ['SAFE-T1001', 'SAFE-T1002'],
      created_at: '2025-01-01T00:00:00Z',
      tests: [
        { test_id: 'test-a', technique_id: 'SAFE-T1001', status: 'completed' },
        { test_id: 'test-b', technique_id: 'SAFE-T1002', status: 'running' },
      ],
      completed: 1,
      total: 2,
      current_test_id: 'test-b',
    };

    const queueDetail2: QueueDetail = {
      ...queueDetail1,
      status: 'completed',
      tests: [
        { test_id: 'test-a', technique_id: 'SAFE-T1001', status: 'completed' },
        { test_id: 'test-b', technique_id: 'SAFE-T1002', status: 'completed' },
      ],
      completed: 2,
    };

    mockClient.getQueueDetail
      .mockResolvedValueOnce(queueDetail1)
      .mockResolvedValueOnce(queueDetail2);

    mockClient.getTestDetail
      .mockResolvedValueOnce(makeTestDetail({ test_id: 'test-a', technique_id: 'SAFE-T1001' }))
      .mockResolvedValueOnce(
        makeTestDetail({
          test_id: 'test-b',
          technique_id: 'SAFE-T1002',
          result: {
            test_id: 'test-b',
            mcp_server: 'test-server',
            technique: {},
            container_exit_code: 0,
            timestamp: '2025-01-01T00:01:00Z',
            report: {
              technique_id: 'SAFE-T1002',
              repository: 'https://github.com/test/repo',
              vulnerability_status: 'not_vulnerable',
              deployment: { prompt: '', response: '', success: true, steps: 0 },
              attack_result: {
                prompt: '',
                response: 'No issues found',
                success: true,
                steps: 3,
              },
              evidence: [],
              conversation_log: [],
            },
            success: true,
          },
        })
      );

    const onComplete = jest.fn();

    const reports = await pollScan(mockClient, scan, {
      timeoutMs: 60000,
      pollIntervalMs: 100,
      onTechniqueComplete: onComplete,
    });

    expect(reports).toHaveLength(2);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('creates fallback report when test has no result', async () => {
    const scan: ScanHandle = {
      id: 'test-fail',
      type: 'test',
      techniqueIds: ['SAFE-T1001'],
    };

    mockClient.getTestDetail.mockResolvedValueOnce(
      makeTestDetail({
        status: 'failed',
        result: null,
      })
    );

    const onComplete = jest.fn();

    const reports = await pollScan(mockClient, scan, {
      timeoutMs: 60000,
      pollIntervalMs: 100,
      onTechniqueComplete: onComplete,
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].vulnerability_status).toBe('test_failed');
  });
});
