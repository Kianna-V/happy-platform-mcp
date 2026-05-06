import { describe, expect, jest, test } from '@jest/globals';
import {
  createServiceNowDocsClient,
  parseFamiliesFromLlms
} from '../src/docs/github-client.js';

describe('ServiceNowDocs GitHub client', () => {
  test('parses family links from llms.txt markdown', () => {
    const families = parseFamiliesFromLlms(`
# ServiceNow Docs
- [australia](https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/australia/llms.txt)
- [washingtondc](https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/washingtondc/llms.txt)
`);

    expect(families).toEqual([
      { name: 'australia', branch: 'australia' },
      { name: 'washingtondc', branch: 'washingtondc' }
    ]);
  });

  test('fetches llms.txt with optional GitHub token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '- [australia](https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/australia/llms.txt)'
    });
    const client = createServiceNowDocsClient({ fetchImpl: fetchMock, githubToken: 'token' });

    const families = await client.listFamilies();

    expect(families).toEqual([{ name: 'australia', branch: 'australia' }]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
  });

  test('returns actionable errors for GitHub failures', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'rate limited',
      text: async () => 'rate limit'
    });
    const client = createServiceNowDocsClient({ fetchImpl: fetchMock });

    await expect(client.listFamilies()).rejects.toThrow(/GitHub request failed.*403/);
  });
});
