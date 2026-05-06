export const docsToolDefinitions = [
  {
    name: 'SN-Docs-Families',
    description: 'List available ServiceNow documentation families/releases from the official ServiceNowDocs GitHub repository.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'SN-Docs-Status',
    description: 'Show local ServiceNow docs cache, FTS index, and optional vector index status.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'SN-Docs-Sync',
    description: 'Download and index a ServiceNowDocs family into the local SQLite FTS cache.',
    inputSchema: {
      type: 'object',
      properties: {
        family: { type: 'string', description: 'Docs family to sync, such as australia. Defaults to australia.' },
        branch: { type: 'string', description: 'Optional GitHub branch. Defaults to the same value as family.' }
      }
    }
  },
  {
    name: 'SN-Docs-Search',
    description: 'Search locally synced ServiceNow documentation using SQLite FTS, with optional vector search when enabled.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        family: { type: 'string', description: 'Optional docs family filter. Defaults to australia.' },
        limit: { type: 'number', description: 'Maximum results to return.', default: 10 }
      },
      required: ['query']
    }
  },
  {
    name: 'SN-Docs-Get',
    description: 'Retrieve a ServiceNow documentation markdown document by family and path.',
    inputSchema: {
      type: 'object',
      properties: {
        family: { type: 'string', description: 'Docs family, such as australia. Defaults to australia.' },
        path: { type: 'string', description: 'Markdown path inside the docs family.' }
      },
      required: ['path']
    }
  }
];
