import type { GitHub } from '@actions/github/lib/utils';
import { TestReport } from './types';
type Octokit = InstanceType<typeof GitHub>;
/**
 * Post a PR comment for a single completed technique.
 */
export declare function postTechniqueComment(octokit: Octokit, owner: string, repo: string, prNumber: number, report: TestReport, apiUrl: string, testId: string): Promise<void>;
/**
 * Format a PR comment for a single technique result.
 */
export declare function formatTechniqueComment(report: TestReport, apiUrl: string, testId: string): string;
export {};
