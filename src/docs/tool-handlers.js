import fs from 'fs/promises';
import path from 'path';
import { getDocsConfig } from './config.js';
import { createServiceNowDocsClient } from './github-client.js';
import { createDocsStore } from './sqlite-store.js';
import { syncDocsFamily } from './sync.js';
import { createVectorIndex } from './vector-index.js';

function jsonContent(payload) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(payload, null, 2)
    }]
  };
}

async function createStore(config) {
  await fs.mkdir(config.cacheDir, { recursive: true });
  const store = createDocsStore(path.join(config.cacheDir, 'index.sqlite'));
  store.initialize();
  return store;
}

export async function handleDocsTool(name, args = {}, deps = {}) {
  const config = deps.config || getDocsConfig();
  const client = deps.client || createServiceNowDocsClient({ githubToken: config.githubToken });

  switch (name) {
    case 'SN-Docs-Families': {
      const families = await client.listFamilies();
      return jsonContent({ families });
    }

    case 'SN-Docs-Status': {
      const store = await createStore(config);
      const vector = createVectorIndex(config);
      try {
        return jsonContent({
          cacheDir: config.cacheDir,
          ...store.status(),
          vectorAvailable: vector.available,
          vectorReason: vector.reason
        });
      } finally {
        store.close();
      }
    }

    case 'SN-Docs-Sync': {
      const family = args.family;
      const branch = args.branch || family;
      const result = await syncDocsFamily({
        family,
        branch,
        cacheDir: config.cacheDir,
        client
      });
      return jsonContent(result);
    }

    case 'SN-Docs-Search': {
      const store = await createStore(config);
      try {
        const results = store.search({
          query: args.query,
          family: args.family,
          limit: args.limit || 10
        });
        return jsonContent({
          query: args.query,
          family: args.family || null,
          results,
          message: results.length > 0
            ? 'Found locally indexed ServiceNow documentation results.'
            : 'No local docs results found. If this family has not been synced, run SN-Docs-Sync first.'
        });
      } finally {
        store.close();
      }
    }

    case 'SN-Docs-Get': {
      const family = args.family;
      const documentPath = args.path;
      const store = await createStore(config);
      try {
        const document = store.getDocument({ family, path: documentPath });
        if (document) {
          return jsonContent({ source: 'local-cache', document });
        }
      } finally {
        store.close();
      }

      const markdown = await client.getMarkdown(family, documentPath);
      return jsonContent({
        source: 'github',
        document: {
          family,
          path: documentPath,
          markdown
        }
      });
    }

    default:
      throw new Error(`Unknown docs tool: ${name}`);
  }
}
