import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, test, beforeEach } from '@jest/globals';
import { createDocsStore } from '../src/docs/sqlite-store.js';

let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'happy-docs-'));
});

describe('docs sqlite store', () => {
  test('indexes and searches chunks with FTS5', async () => {
    const store = await createDocsStore(path.join(tempDir, 'index.sqlite'));
    store.initialize();
    store.upsertFamily({ name: 'australia', branch: 'australia', syncedAt: '2026-05-02T00:00:00Z' });
    store.replaceDocument({
      family: 'australia',
      path: 'foo.md',
      sha: 'abc',
      title: 'Flow Designer',
      markdown: '# Flow Designer\n\nCreate actions.'
    }, [
      {
        family: 'australia',
        path: 'foo.md',
        title: 'Flow Designer',
        heading: 'Flow Designer',
        startLine: 1,
        endLine: 3,
        body: '# Flow Designer\n\nCreate actions.'
      }
    ]);

    const results = store.search({ query: 'create actions', family: 'australia', limit: 5 });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      family: 'australia',
      path: 'foo.md',
      title: 'Flow Designer'
    });
  });

  test('reports status', async () => {
    const store = await createDocsStore(path.join(tempDir, 'index.sqlite'));
    store.initialize();
    expect(store.status()).toMatchObject({ ftsAvailable: true, vectorAvailable: false });
  });
});
