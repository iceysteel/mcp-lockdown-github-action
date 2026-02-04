import { resolveTechniques, OWASP_TOP_10 } from '../src/techniques';

describe('resolveTechniques', () => {
  it('resolves "owasp-top-10" to the preset list', () => {
    const result = resolveTechniques('owasp-top-10');
    expect(result).toEqual(OWASP_TOP_10);
    expect(result).not.toBe(OWASP_TOP_10); // should be a copy
  });

  it('is case-insensitive for presets', () => {
    expect(resolveTechniques('OWASP-TOP-10')).toEqual(OWASP_TOP_10);
    expect(resolveTechniques('Owasp-Top-10')).toEqual(OWASP_TOP_10);
  });

  it('parses comma-separated technique IDs', () => {
    const result = resolveTechniques('SAFE-T1001,SAFE-T1002');
    expect(result).toEqual(['SAFE-T1001', 'SAFE-T1002']);
  });

  it('trims whitespace around IDs', () => {
    const result = resolveTechniques(' SAFE-T1001 , SAFE-T1002 ');
    expect(result).toEqual(['SAFE-T1001', 'SAFE-T1002']);
  });

  it('uppercases technique IDs', () => {
    const result = resolveTechniques('safe-t1001');
    expect(result).toEqual(['SAFE-T1001']);
  });

  it('throws on empty input', () => {
    expect(() => resolveTechniques('')).toThrow('No techniques specified');
  });

  it('throws on invalid technique ID format', () => {
    expect(() => resolveTechniques('INVALID-ID')).toThrow(
      'Invalid technique ID "INVALID-ID"'
    );
  });

  it('throws on partially valid input', () => {
    expect(() => resolveTechniques('SAFE-T1001,bad')).toThrow(
      'Invalid technique ID "BAD"'
    );
  });
});
