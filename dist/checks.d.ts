import type { GitHub } from '@actions/github/lib/utils';
import { TestReport } from './types';
type Octokit = InstanceType<typeof GitHub>;
/**
 * Create a Check Run in "queued" state for a technique.
 * Returns the check run ID.
 */
export declare function createCheckRun(octokit: Octokit, owner: string, repo: string, sha: string, techniqueId: string): Promise<number>;
/**
 * Update a Check Run to "in_progress" state.
 */
export declare function startCheckRun(octokit: Octokit, owner: string, repo: string, checkRunId: number): Promise<void>;
/**
 * Complete a Check Run with the technique's result.
 */
export declare function completeCheckRun(octokit: Octokit, owner: string, repo: string, checkRunId: number, report: TestReport, apiUrl: string, testId: string): Promise<void>;
export {};
