# nodo-mcp

Read-only [Model Context Protocol](https://modelcontextprotocol.io) server for the NODO product API at `https://app.nodo.xyz/api/v2`. It calls that API. It does not keep a copy of the catalog, and it cannot change anything.

Use it when an agent needs to look up yield products, leveraged opportunities, or lending markets. Opening, closing, and estimating positions stay on the API itself.

## What it can read

| Tool | API request | What you get back |
| --- | --- | --- |
| `list_assets` | `GET /api/v2/assets` | One row per product: `assetId`, name, ticker, platform, symbols, TVL, APY, and `nextOffset` |
| `get_asset` | `GET /api/v2/assets/{assetId}` | Identity, terms, APY, and TVL. Pass `assetId` from `list_assets` unchanged |
| `list_opportunities` | `GET /api/v2/opportunities` | One row per opportunity: id, asset, venue, collateral, debt, base yield, net APY, leverage, and `nextOffset` |
| `get_opportunity` | `GET /api/v2/opportunities/{opportunityId}` | The same figures as the list row, for one id. Pass `opportunityId` unchanged |
| `list_markets` | `GET /api/v2/markets` | One row per market: `protocolId`, `marketId`, collateral, debt, LTV, and rate. Optional filters narrow that list |
| `get_market_apy_history` | `GET /api/v2/markets/{protocol}/{marketId}/apy-history` | Window, borrow summary, points, and `nextCursor` |

There are no other tools. None of them return purchase, redemption, or acquisition routes. List results include `asOfTime` when the API sends it.

`list_markets` reads the whole market list in one request. `network`, `protocolId`, `collateral`, and `debt` then narrow those rows. They are not sent as API query parameters. A filter result sets `page.total` to the unfiltered count and `page.matched` to the rows kept.

When `nextOffset` is a number, call the same list tool again with that offset. When it is null, the page is the last one. `list_assets` and `list_opportunities` ask for 10 rows when `limit` is omitted. The API accepts 1 to 100. Opportunity offset stops at 10000.

`get_market_apy_history` takes `protocolId` and `marketId` from `list_markets`. Its `limit` defaults to 168 at the API and caps at 1000. When `nextCursor` is set, call again with that cursor and the same protocol, market, asset, window, and resolution.

## What it cannot do

It does not estimate, open, authorize, or confirm a position. It does not read positions, liquidation, organization, or admin routes. It does not send `POST`. A workload key still needs the API's `common.read` permission. This server does not grant that permission.

## Credentials

Set `NODO_API_KEY` and `NODO_API_SECRET` in the MCP client environment. NODO shows the secret once, when the workload credential is created. Keep it in that environment or a local secret store. Do not paste it into chat.

The server signs every read with workload signature v2. The secret is the signing key. It is never sent, logged, or returned. A missing or malformed credential stops the process before any network call. Each signature expires 30 seconds after it is created.

The default base URL is `https://app.nodo.xyz/api/v2`. Set `NODO_API_BASE_URL` only for another origin that still serves the `/api/v2` mount. The signed path is the path the API checks: `/api/v2`, the route, and the exact query string.

## Errors

The product API reports a failed read as HTTP 200 with a body whose only field is `error`, shaped as `{ "code", "message" }`. This server turns that envelope into a tool error, for example `NODO API auth_invalid: API key is invalid or revoked`. HTTP statuses outside 200–299 are also tool errors. A normal resource body is returned as JSON even if some nested field contains the word error.

If the API echoes the secret, the tool text replaces it with `[redacted]`.

## Cursor

Build first, then point `mcp.json` at `dist/index.js`. Replace the path with the absolute path on your machine. Put the credential in `env`. Do not commit that file with real values.

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

`npx nodo-mcp` is not available. This package is not on npm.

## Build

Requires Node.js 22 or newer.

```bash
npm install
npm test
```

`npm test` compiles TypeScript and runs the suite. The server speaks MCP over stdin and stdout: `node dist/index.js`.

## Registry

`server.json` names `io.github.sowmya-netizen/nodo` and points at `https://github.com/sowmya-netizen/nodo-mcp`. The official MCP registry does not list it yet. Publishing needs a package or a live remote, then `mcp-publisher login github` as `sowmya-netizen`.
