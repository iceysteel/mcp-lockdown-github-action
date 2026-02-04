import {
  TestInfo,
  TestDetail,
  QueueInfo,
  QueueDetail,
  ScanHandle,
} from './types';

export class MCPLockdownClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Start a scan. Uses the queue API for multiple techniques,
   * single test API for one technique.
   */
  async startScan(
    repoUrl: string,
    techniqueIds: string[]
  ): Promise<ScanHandle> {
    if (techniqueIds.length === 1) {
      const test = await this.request<TestInfo>('/api/tests', {
        method: 'POST',
        body: JSON.stringify({
          repo_url: repoUrl,
          technique_id: techniqueIds[0],
        }),
      });
      return {
        id: test.test_id,
        type: 'test',
        techniqueIds,
      };
    }

    const queue = await this.request<QueueInfo>('/api/queues', {
      method: 'POST',
      body: JSON.stringify({
        repo_url: repoUrl,
        technique_ids: techniqueIds,
      }),
    });
    return {
      id: queue.queue_id,
      type: 'queue',
      techniqueIds,
    };
  }

  /** Get test detail including the result/report. */
  async getTestDetail(testId: string): Promise<TestDetail> {
    return this.request<TestDetail>(`/api/tests/${testId}`);
  }

  /** Get queue detail with per-technique status. */
  async getQueueDetail(queueId: string): Promise<QueueDetail> {
    return this.request<QueueDetail>(`/api/queues/${queueId}`);
  }

  /** Start a queued scan (triggers execution). */
  async startQueue(queueId: string): Promise<void> {
    await this.request(`/api/queues/${queueId}/start`, { method: 'POST' });
  }
}
