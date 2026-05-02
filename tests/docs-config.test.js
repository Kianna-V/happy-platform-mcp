import os from 'os';
import path from 'path';
import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import {
  getDocsConfig,
  resolveDocsCachePath,
  normalizeSafeRelativePath
} from '../src/docs/config.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('docs config', () => {
  test('uses the default cache directory under the user home', () => {
    delete process.env.HAPPY_DOCS_CACHE_DIR;
    const config = getDocsConfig();
    expect(config.cacheDir).toBe(path.join(os.homedir(), '.happy-platform-mcp', 'docs', 'servicenow'));
    expect(config.enableVector).toBe(false);
  });

  test('allows cache directory and vector flag through env vars', () => {
    process.env.HAPPY_DOCS_CACHE_DIR = '/tmp/happy-docs';
    process.env.HAPPY_DOCS_ENABLE_VECTOR = 'true';
    const config = getDocsConfig();
    expect(config.cacheDir).toBe('/tmp/happy-docs');
    expect(config.enableVector).toBe(true);
  });

  test('rejects path traversal for relative docs paths', () => {
    expect(() => normalizeSafeRelativePath('../secret.md')).toThrow(/Unsafe docs path/);
    expect(() => normalizeSafeRelativePath('/absolute.md')).toThrow(/Unsafe docs path/);
    expect(normalizeSafeRelativePath('docs/platform/foo.md')).toBe('docs/platform/foo.md');
  });

  test('resolves safe cache paths inside the cache directory', () => {
    const fullPath = resolveDocsCachePath('/tmp/cache', 'australia/foo/bar.md');
    expect(fullPath).toBe(path.join('/tmp/cache', 'australia/foo/bar.md'));
  });
});
