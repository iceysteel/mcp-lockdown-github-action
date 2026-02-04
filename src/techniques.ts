/**
 * Technique ID presets and resolution.
 */

/** OWASP Top 10 for MCP — the most common attack vectors */
export const OWASP_TOP_10: string[] = [
  'SAFE-T1001', // Tool Poisoning
  'SAFE-T1101', // Command Injection
  'SAFE-T1102', // Prompt Injection
  'SAFE-T1201', // Data Exfiltration
  'SAFE-T1301', // Privilege Escalation
  'SAFE-T1401', // Unauthorized Access
  'SAFE-T1501', // Denial of Service
  'SAFE-T1601', // Information Disclosure
  'SAFE-T1602', // Tool Enumeration
  'SAFE-T1605', // Capability Mapping
];

/**
 * Resolve a techniques input string to an array of technique IDs.
 *
 * Accepts:
 * - "owasp-top-10" → preset list
 * - Comma-separated IDs: "SAFE-T1001,SAFE-T1002"
 */
export function resolveTechniques(input: string): string[] {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'owasp-top-10') {
    return [...OWASP_TOP_10];
  }

  // Parse comma-separated IDs
  const ids = input
    .split(',')
    .map((id) => id.trim().toUpperCase())
    .filter((id) => id.length > 0);

  if (ids.length === 0) {
    throw new Error(
      'No techniques specified. Use "owasp-top-10" or provide comma-separated IDs.'
    );
  }

  // Validate format
  for (const id of ids) {
    if (!/^SAFE-T\d{4}$/.test(id)) {
      throw new Error(
        `Invalid technique ID "${id}". Expected format: SAFE-TXXXX`
      );
    }
  }

  return ids;
}
