# nodo-mcp

Read-only [Model Context Protocol](https://modelcontextprotocol.io) server for the NODO product API. It lists and fetches assets, opportunities, and markets. This server only reads; it cannot open, close, or estimate positions.

## Build

Requires Node.js 22 or newer.

```bash
npm install
npm run build
npm test
```

The build writes `dist/index.js`. Start the server with `node dist/index.js`. It speaks MCP over stdin and stdout.

## Credentials

`NODO_API_KEY` and `NODO_API_SECRET` are a NODO workload credential. NODO shows the secret once when the credential is created. Store it in the MCP client environment or a local secret store. The secret is never something you paste into chat, and this server never sends it as a header, log line, or tool result.

Both values are required. If either is missing or malformed, the process exits before it calls the network. The default API base is `https://app.nodo.xyz/api/v2`. Set `NODO_API_BASE_URL` only when you need another origin that still serves the `/api/v2` mount. The signed path is the request path the API verifies, including that `/api/v2` prefix and the exact query string.

## Cursor

Add this to `mcp.json` after `npm run build`. Replace the path with the absolute path to `dist/index.js` on your machine. Put the workload credential in `env`. Do not commit that file with real values.

```json
{
  "mcpServers": {
    "nodo": {
      "command": "node",
      "args": ["/absolute/path/to/nodo-mcp/dist/index.js"],
      "env": {
        "NODO_API_KEY": "nodo_<key-id>",
        "NODO_API_SECRET": "<workload secret shown once at creation>"
      }
    }
  }
}
```

`npx nodo-mcp` is not available from this checkout. Nothing has been published to npm.

## Registry

`server.json` names `io.github.sowmya-netizen/nodo` and points at `https://github.com/sowmya-netizen/nodo-mcp`. It has no `packages` entry and no remote URL. Registry publish still needs a package or a live remote. Publishing with `mcp-publisher` also needs a human GitHub device login as `sowmya-netizen`.

## Tools

| Tool | Request |
| --- | --- |
| `list_assets` | `GET /api/v2/assets` |
| `get_asset` | `GET /api/v2/assets/{assetId}` |
| `list_opportunities` | `GET /api/v2/opportunities` |
| `get_opportunity` | `GET /api/v2/opportunities/{opportunityId}` |
| `list_markets` | `GET /api/v2/markets` |
| `get_market_apy_history` | `GET /api/v2/markets/{protocol}/{marketId}/apy-history` |

There are no other tools.
