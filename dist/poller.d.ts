import { MCPLockdownClient } from './api-client';
import { ScanHandle, PollOptions, TestReport } from './types';
/**
 * Poll a scan (single test or queue) until all techniques complete or timeout.
 * Calls onTechniqueComplete as each technique finishes.
 * Returns the list of all completed reports.
 */
export declare function pollScan(client: MCPLockdownClient, scan: ScanHandle, options: PollOptions): Promise<TestReport[]>;
