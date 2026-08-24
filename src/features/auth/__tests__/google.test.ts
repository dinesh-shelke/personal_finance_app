import { isAuthCallbackUrl, parseCallbackParams } from '../google';

describe('parseCallbackParams', () => {
  it('reads the authorisation code off a PKCE redirect', () => {
    const params = parseCallbackParams('pfa://auth/callback?code=abc123');
    expect(params.code).toBe('abc123');
  });

  it('reads several parameters', () => {
    const params = parseCallbackParams('pfa://auth/callback?code=abc&state=xyz');
    expect(params).toMatchObject({ code: 'abc', state: 'xyz' });
  });

  it('reads parameters out of the fragment as well as the query', () => {
    // Some provider errors come back on the fragment rather than the query.
    const params = parseCallbackParams('pfa://auth/callback#error=access_denied');
    expect(params.error).toBe('access_denied');
  });

  it('does not let a fragment bleed into the last query parameter', () => {
    const params = parseCallbackParams('pfa://auth/callback?code=abc#error=nope');
    expect(params.code).toBe('abc');
    expect(params.error).toBe('nope');
  });

  it('percent-decodes values', () => {
    const params = parseCallbackParams(
      'pfa://auth/callback?error=invalid&error_description=Access%20was%20denied',
    );
    expect(params.error_description).toBe('Access was denied');
  });

  it('treats + as a space, as form encoding requires', () => {
    const params = parseCallbackParams('pfa://auth/callback?error_description=Access+was+denied');
    expect(params.error_description).toBe('Access was denied');
  });

  it('survives a malformed percent-escape without losing other parameters', () => {
    // A bare % would throw inside decodeURIComponent.
    const params = parseCallbackParams('pfa://auth/callback?code=abc&bad=%E0%A4');
    expect(params.code).toBe('abc');
    expect(params.bad).toBe('%E0%A4');
  });

  it('returns an empty object when there is nothing to parse', () => {
    expect(parseCallbackParams('pfa://auth/callback')).toEqual({});
    expect(parseCallbackParams('')).toEqual({});
  });

  it('ignores empty pairs and valueless keys', () => {
    const params = parseCallbackParams('pfa://auth/callback?&code=abc&&flag');
    expect(params.code).toBe('abc');
    expect(params.flag).toBe('');
  });
});

describe('isAuthCallbackUrl', () => {
  it('recognises the callback path', () => {
    expect(isAuthCallbackUrl('pfa://auth/callback?code=abc')).toBe(true);
  });

  it('recognises a code parameter even on an unexpected path', () => {
    expect(isAuthCallbackUrl('pfa://somewhere?code=abc')).toBe(true);
  });

  it('rejects ordinary in-app deep links', () => {
    expect(isAuthCallbackUrl('pfa://transaction/new')).toBe(false);
    // `barcode` contains "code" but is not a code parameter.
    expect(isAuthCallbackUrl('pfa://scan?barcode=123')).toBe(false);
  });
});
