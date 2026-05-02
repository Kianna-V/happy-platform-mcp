import { describe, expect, test } from '@jest/globals';
import { createMcpServer } from '../src/mcp-server-consolidated.js';
import { docsToolDefinitions } from '../src/docs/tool-definitions.js';

describe('docs MCP tools', () => {
  test('defines initial docs tools', () => {
    expect(docsToolDefinitions.map((tool) => tool.name)).toEqual([
      'SN-Docs-Families',
      'SN-Docs-Status',
      'SN-Docs-Sync',
      'SN-Docs-Search',
      'SN-Docs-Get'
    ]);
  });

  test('adds docs tools to consolidated MCP tool list', async () => {
    const server = await createMcpServer({ setProgressCallback() {} });
    const handler = server._requestHandlers.get('tools/list');
    const result = await handler({ method: 'tools/list', params: {} }, {});
    const docsTools = result.tools.filter((tool) => tool.name.startsWith('SN-Docs-'));

    expect(docsTools.map((tool) => tool.name)).toEqual([
      'SN-Docs-Families',
      'SN-Docs-Status',
      'SN-Docs-Sync',
      'SN-Docs-Search',
      'SN-Docs-Get'
    ]);
  });
});
