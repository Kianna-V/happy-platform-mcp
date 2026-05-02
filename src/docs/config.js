import os from 'os';
import path from 'path';

const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.happy-platform-mcp', 'docs', 'servicenow');

export function getDocsConfig(env = process.env) {
  return {
    cacheDir: env.HAPPY_DOCS_CACHE_DIR || DEFAULT_CACHE_DIR,
    enableVector: env.HAPPY_DOCS_ENABLE_VECTOR === 'true',
    embeddingProvider: env.HAPPY_DOCS_EMBEDDING_PROVIDER || 'none',
    githubToken: env.GITHUB_TOKEN || ''
  };
}

export function normalizeSafeRelativePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Unsafe docs path: path is required');
  }

  const normalized = path.posix.normalize(relativePath.replaceAll('\\', '/'));
  if (normalized.startsWith('../') || normalized === '..' || path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe docs path: ${relativePath}`);
  }

  return normalized;
}

export function resolveDocsCachePath(cacheDir, relativePath) {
  const safePath = normalizeSafeRelativePath(relativePath);
  const resolved = path.resolve(cacheDir, safePath);
  const root = path.resolve(cacheDir);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Unsafe docs path: ${relativePath}`);
  }

  return resolved;
}
