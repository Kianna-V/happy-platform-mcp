# ServiceNow Docs Search

Happy MCP can search and retrieve the official ServiceNowDocs markdown repository without depending on QMD or any user-local index.

## Modes

- **Live GitHub mode:** zero setup for family discovery and direct document fetches from `ServiceNow/ServiceNowDocs`.
- **Local sync mode:** optional SQLite FTS5 index for fast local search and offline use.
- **Vector mode:** optional semantic search surface. It is disabled by default and requires a future sqlite-vec embedding configuration.

## Configuration

```bash
HAPPY_DOCS_CACHE_DIR=~/.happy-platform-mcp/docs/servicenow
HAPPY_DOCS_ENABLE_VECTOR=false
HAPPY_DOCS_EMBEDDING_PROVIDER=none
GITHUB_TOKEN=optional-token-for-higher-rate-limits
```

## Tools

- `SN-Docs-Families` - List available ServiceNowDocs families/releases.
- `SN-Docs-Status` - Show local cache, FTS, and vector status.
- `SN-Docs-Sync` - Download and index a docs family locally.
- `SN-Docs-Search` - Search the locally synced SQLite FTS index.
- `SN-Docs-Get` - Retrieve a markdown document from local cache or GitHub.

## Sync Example

```javascript
SN-Docs-Families({})
SN-Docs-Sync({ "family": "latest" })
SN-Docs-Search({ "query": "create a Flow Designer action", "family": "latest" })
SN-Docs-Get({ "family": "latest", "path": "platform/some-page.md" })
```

## Notes

- Docs sync does not use ServiceNow instance credentials.
- Search is local-first once a family has been synced.
- If a family is not synced, `SN-Docs-Search` returns a setup hint instead of failing hard.
- `SN-Docs-Get` falls back to GitHub raw markdown when a document is not in the local cache.
