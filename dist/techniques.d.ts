/**
 * Technique ID presets and resolution.
 */
/** OWASP Top 10 for MCP — the most common attack vectors */
export declare const OWASP_TOP_10: string[];
/**
 * Resolve a techniques input string to an array of technique IDs.
 *
 * Accepts:
 * - "owasp-top-10" → preset list
 * - Comma-separated IDs: "SAFE-T1001,SAFE-T1002"
 */
export declare function resolveTechniques(input: string): string[];
