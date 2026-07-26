import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  isAdminConfigured,
  issueSession,
  sha256Hex,
  timingSafeEqual,
  verifyPassword,
  verifySession,
} from './auth';

const SECRET = 'a-secret-long-enough-to-pass';
const PASSWORD = 'korrektes-passwort';

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
  process.env.ADMIN_PASSWORD = await sha256Hex(PASSWORD);
});

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_PASSWORD;
});

describe('timingSafeEqual', () => {
  it('matches identical strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });

  it('rejects different strings of equal length', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
  });

  it('rejects a correct prefix', () => {
    // The whole reason not to use === on a signature: a prefix must not pass.
    expect(timingSafeEqual('abcdef', 'abc')).toBe(false);
  });
});

describe('session issue / verify', () => {
  it('accepts a freshly issued token', async () => {
    const { token } = await issueSession();
    expect(await verifySession(token)).toBe(true);
  });

  it('rejects a missing token', async () => {
    expect(await verifySession(undefined)).toBe(false);
    expect(await verifySession('')).toBe(false);
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await issueSession();
    process.env.ADMIN_SESSION_SECRET = 'a-completely-different-secret';
    expect(await verifySession(token)).toBe(false);
  });

  it('rejects a tampered expiry', async () => {
    const { token } = await issueSession();
    const signature = token.slice(token.lastIndexOf('.') + 1);
    // Extend the session by a year without re-signing.
    const forged = `${Date.now() + 31_536_000_000}.${signature}`;
    expect(await verifySession(forged)).toBe(false);
  });

  it('rejects an expired token even when correctly signed', async () => {
    const { token } = await issueSession();
    const signature = token.slice(token.lastIndexOf('.') + 1);
    expect(await verifySession(`1000.${signature}`)).toBe(false);
  });

  it('rejects malformed tokens instead of throwing', async () => {
    for (const bad of ['no-dot', '.', 'abc.def', '.sig', 'NaN.sig']) {
      expect(await verifySession(bad), bad).toBe(false);
    }
  });

  it('denies everything when no secret is configured', async () => {
    const { token } = await issueSession();
    delete process.env.ADMIN_SESSION_SECRET;
    // Fail closed: an unconfigured deployment must lock the panel, not open it.
    expect(await verifySession(token)).toBe(false);
    expect(isAdminConfigured()).toBe(false);
  });

  it('refuses a secret that is too short to be meaningful', async () => {
    process.env.ADMIN_SESSION_SECRET = 'kurz';
    expect(isAdminConfigured()).toBe(false);
    await expect(issueSession()).rejects.toThrow(/ADMIN_SESSION_SECRET/);
  });
});

describe('verifyPassword', () => {
  it('accepts the configured password', async () => {
    expect(await verifyPassword(PASSWORD)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    expect(await verifyPassword('falsch')).toBe(false);
  });

  it('rejects the hash itself being submitted as the password', async () => {
    expect(await verifyPassword(process.env.ADMIN_PASSWORD!)).toBe(false);
  });

  it('rejects everything when no password is configured', async () => {
    delete process.env.ADMIN_PASSWORD;
    expect(await verifyPassword(PASSWORD)).toBe(false);
    expect(await verifyPassword('')).toBe(false);
  });

  it('tolerates casing and whitespace in the stored hash', async () => {
    process.env.ADMIN_PASSWORD = `  ${(await sha256Hex(PASSWORD)).toUpperCase()}  `;
    expect(await verifyPassword(PASSWORD)).toBe(true);
  });
});
