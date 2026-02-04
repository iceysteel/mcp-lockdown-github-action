import { TestDetail, QueueDetail, ScanHandle } from './types';
export declare class MCPLockdownClient {
    private baseUrl;
    private apiKey;
    constructor(baseUrl: string, apiKey: string);
    private request;
    /**
     * Start a scan. Uses the queue API for multiple techniques,
     * single test API for one technique.
     */
    startScan(repoUrl: string, techniqueIds: string[]): Promise<ScanHandle>;
    /** Get test detail including the result/report. */
    getTestDetail(testId: string): Promise<TestDetail>;
    /** Get queue detail with per-technique status. */
    getQueueDetail(queueId: string): Promise<QueueDetail>;
    /** Start a queued scan (triggers execution). */
    startQueue(queueId: string): Promise<void>;
}
