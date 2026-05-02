import fs from 'fs/promises';
import path from 'path';
import { getDocsConfig } from './config.js';
import { createServiceNowDocsClient } from './github-client.js';
import { createDocsStore, getSqliteAvailability } from './sqlite-store.js';
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
  const store = await createDocsStore(path.join(config.cacheDir, 'index.sqlite'));
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
      const sqlite = await getSqliteAvailability();
      const vector = createVectorIndex(config);
      if (!config.localIndexEnabled || !sqlite.available) {
        return jsonContent({
          cacheDir: config.cacheDir,
          localIndexEnabled: config.localIndexEnabled,
          ftsAvailable: false,
          sqliteAvailable: sqlite.available,
          sqliteReason: sqlite.reason || (config.localIndexEnabled ? undefined : 'Local docs index disabled'),
          vectorAvailable: vector.available,
          vectorReason: vector.reason,
          families: []
        });
      }

      const store = await createStore(config);
      try {
        return jsonContent({
          cacheDir: config.cacheDir,
          localIndexEnabled: config.localIndexEnabled,
          sqliteAvailable: sqlite.available,
          sqliteReason: sqlite.reason,
          ...store.status(),
          vectorAvailable: vector.available,
          vectorReason: vector.reason
        });
      } finally {
        store.close();
      }
    }

    case 'SN-Docs-Sync': {
      if (!config.localIndexEnabled) {
        return jsonContent({
          synced: false,
          message: 'Local ServiceNow docs indexing is disabled. Set docs.localIndexEnabled=true in config/servicenow-instances.json or HAPPY_DOCS_ENABLE_LOCAL_INDEX=true to enable SN-Docs-Sync.'
        });
      }

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
      if (!config.localIndexEnabled) {
        return jsonContent({
          query: args.query,
          family: args.family || null,
          results: [],
          message: 'Local ServiceNow docs search is disabled. Use SN-Docs-Get for direct GitHub retrieval, or set docs.localIndexEnabled=true / HAPPY_DOCS_ENABLE_LOCAL_INDEX=true and run SN-Docs-Sync.'
        });
      }

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
      if (config.localIndexEnabled) {
        const store = await createStore(config);
        try {
          const document = store.getDocument({ family, path: documentPath });
          if (document) {
            return jsonContent({ source: 'local-cache', document });
          }
        } finally {
          store.close();
        }
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
