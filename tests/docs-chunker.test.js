import { describe, expect, test } from '@jest/globals';
import { chunkMarkdown } from '../src/docs/chunker.js';

describe('chunkMarkdown', () => {
  test('chunks markdown by headings with metadata', () => {
    const chunks = chunkMarkdown({
      family: 'australia',
      path: 'platform/admin/example.md',
      markdown: '# Page Title\n\nIntro.\n\n## First\n\nBody one.\n\n## Second\n\nBody two.'
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({
      family: 'australia',
      path: 'platform/admin/example.md',
      title: 'Page Title',
      heading: 'Page Title'
    });
    expect(chunks[1].heading).toBe('First');
    expect(chunks[2].body).toContain('Body two.');
  });

  test('keeps line ranges for citations', () => {
    const chunks = chunkMarkdown({
      family: 'latest',
      path: 'foo.md',
      markdown: '# Title\n\nLine 3\n\n## Details\n\nLine 7'
    });

    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(4);
    expect(chunks[1].startLine).toBe(5);
  });
});
