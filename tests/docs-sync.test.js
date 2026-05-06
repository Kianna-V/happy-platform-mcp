import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, jest, test } from '@jest/globals';
import { parseMarkdownLinks, syncDocsFamily } from '../src/docs/sync.js';

describe('syncDocsFamily', () => {
  test('downloads markdown paths from family llms and indexes them', async () => {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'happy-docs-sync-'));
    const client = {
      getLlms: jest.fn().mockResolvedValue('- [Flow Designer](platform/flow-designer.md)'),
      getMarkdown: jest.fn().mockResolvedValue('# Flow Designer\n\nCreate actions.')
    };

    const result = await syncDocsFamily({
      family: 'australia',
      branch: 'australia',
      cacheDir,
      client
    });

    expect(result.documentsSynced).toBe(1);
    expect(await fs.readFile(path.join(cacheDir, 'australia', 'platform', 'flow-designer.md'), 'utf8'))
      .toContain('Create actions');
  });

  test('parses markdown links from relative and raw GitHub URLs', () => {
    const links = parseMarkdownLinks(`
- [Relative](platform/relative.md)
- [Raw](https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/australia/platform/raw.md)
- [Duplicate](platform/relative.md)
`);

    expect(links).toEqual(['platform/relative.md', 'platform/raw.md']);
  });
});
