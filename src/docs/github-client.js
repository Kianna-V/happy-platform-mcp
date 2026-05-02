const OWNER = 'ServiceNow';
const REPO = 'ServiceNowDocs';
const DEFAULT_BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}`;

function authHeaders(githubToken) {
  return githubToken ? { Authorization: `Bearer ${githubToken}` } : {};
}

async function fetchText(fetchImpl, url, githubToken) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'text/plain',
      ...authHeaders(githubToken)
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`GitHub request failed (${response.status} ${response.statusText}) for ${url}. ${body}`.trim());
  }

  return response.text();
}

export function parseFamiliesFromLlms(text) {
  const families = [];
  const seen = new Set();
  const linkPattern = /\[([^\]]+)\]\(https:\/\/raw\.githubusercontent\.com\/ServiceNow\/ServiceNowDocs\/([^/)]+)\/llms\.txt\)/g;

  for (const match of text.matchAll(linkPattern)) {
    const name = match[1].trim();
    const branch = match[2].trim();
    if (!seen.has(branch)) {
      seen.add(branch);
      families.push({ name, branch });
    }
  }

  return families;
}

export function createServiceNowDocsClient({
  fetchImpl = globalThis.fetch,
  githubToken = ''
} = {}) {
  if (!fetchImpl) {
    throw new Error('Fetch API is unavailable in this Node runtime');
  }

  return {
    async listFamilies() {
      const text = await fetchText(fetchImpl, `${RAW_BASE}/${DEFAULT_BRANCH}/llms.txt`, githubToken);
      return parseFamiliesFromLlms(text);
    },

    async getLlms(branch) {
      return fetchText(fetchImpl, `${RAW_BASE}/${branch}/llms.txt`, githubToken);
    },

    async getMarkdown(branch, relativePath) {
      const safePath = relativePath.replace(/^\/+/, '');
      return fetchText(fetchImpl, `${RAW_BASE}/${branch}/${safePath}`, githubToken);
    }
  };
}
