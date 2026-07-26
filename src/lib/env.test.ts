import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { deploymentEnv, isIndexable, isPreview } from './env';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('deploymentEnv', () => {
  it('maps the three Vercel environments through unchanged', () => {
    for (const env of ['production', 'preview', 'development'] as const) {
      process.env.VERCEL_ENV = env;
      expect(deploymentEnv(), env).toBe(env);
    }
  });

  it('falls back to NODE_ENV outside Vercel', () => {
    // Docker auf dem eigenen Server: kein VERCEL_ENV, NODE_ENV entscheidet.
    expect(deploymentEnv()).toBe(
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
    );
  });

  it('treats an unknown VERCEL_ENV value as non-production', () => {
    process.env.VERCEL_ENV = 'staging';
    // Nie raten und dabei indexierbar werden — im Zweifel gesperrt.
    expect(isIndexable()).toBe(false);
  });
});

describe('isIndexable', () => {
  it('erlaubt Indexierung ausschließlich in der echten Produktion', () => {
    process.env.VERCEL_ENV = 'production';
    expect(isIndexable()).toBe(true);
  });

  it('sperrt Preview-Deployments', () => {
    // Jede Preview läuft auf eigener Domain mit identischem Inhalt. Indexiert
    // wäre sie Duplicate Content gegen die eigene Produktionsseite — bei 269
    // generierten Landingpages kein Randfall.
    process.env.VERCEL_ENV = 'preview';
    expect(isIndexable()).toBe(false);
    expect(isPreview()).toBe(true);
  });

  it('sperrt Development-Deployments', () => {
    process.env.VERCEL_ENV = 'development';
    expect(isIndexable()).toBe(false);
  });
});

describe('isPreview', () => {
  it('ist nur für Previews wahr, nicht für Produktion oder Development', () => {
    process.env.VERCEL_ENV = 'production';
    expect(isPreview()).toBe(false);
    process.env.VERCEL_ENV = 'development';
    expect(isPreview()).toBe(false);
    process.env.VERCEL_ENV = 'preview';
    expect(isPreview()).toBe(true);
  });
});
