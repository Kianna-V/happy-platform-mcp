import fs from 'fs/promises';
import path from 'path';
import { chunkMarkdown } from './chunker.js';
import { resolveDocsCachePath } from './config.js';
import { createDocsStore } from './sqlite-store.js';

export function parseMarkdownLinks(llmsText) {
  const links = [];
  const seen = new Set();
  const pattern = /\[[^\]]+\]\(([^)]+\.md)\)/g;

  for (const match of llmsText.matchAll(pattern)) {
    const link = match[1].replace(/^https:\/\/raw\.githubusercontent\.com\/ServiceNow\/ServiceNowDocs\/[^/]+\//, '');
    if (!seen.has(link)) {
      seen.add(link);
      links.push(link);
    }
  }

  return links;
}

export async function syncDocsFamily({ family, branch, cacheDir, client }) {
  const familyDir = resolveDocsCachePath(cacheDir, family);
  await fs.mkdir(familyDir, { recursive: true });

  const dbPath = path.join(cacheDir, 'index.sqlite');
  const store = createDocsStore(dbPath);
  store.initialize();

  const llms = await client.getLlms(branch);
  const links = parseMarkdownLinks(llms);
  store.upsertFamily({ name: family, branch, syncedAt: new Date().toISOString() });

  let documentsSynced = 0;
  try {
    for (const link of links) {
      const markdown = await client.getMarkdown(branch, link);
      const outputPath = resolveDocsCachePath(cacheDir, path.posix.join(family, link));
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, markdown, 'utf8');

      const chunks = chunkMarkdown({ family, path: link, markdown });
      store.replaceDocument({
        family,
        path: link,
        sha: null,
        title: chunks[0]?.title || link,
        markdown
      }, chunks);
      documentsSynced += 1;
    }
  } finally {
    store.close();
  }

  return { family, branch, documentsSynced };
}
