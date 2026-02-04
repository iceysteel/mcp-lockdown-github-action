import { TestReport } from './types';
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
    shortDescription: {
        text: string;
    };
    fullDescription: {
        text: string;
    };
    properties: {
        tags: string[];
        'security-severity': string;
    };
}
interface SARIFResult {
    ruleId: string;
    level: string;
    message: {
        text: string;
    };
}
/**
 * Generate a SARIF 2.1.0 report from an array of technique reports.
 * Only includes techniques that found vulnerabilities or had failures.
 */
export declare function generateSARIF(reports: TestReport[]): SARIFReport;
/**
 * Write SARIF report to a file.
 */
export declare function writeSARIF(path: string, sarif: SARIFReport): Promise<void>;
export {};
