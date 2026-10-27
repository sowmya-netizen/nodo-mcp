# nodo-mcp

An assistant can look up NODO's live catalog. It cannot place a trade.

NODO already serves that catalog over its product API: yield products, leveraged opportunities, and the lending markets behind them. This server is the same information, shaped so a chat assistant can read it. A person asks a question in plain language. The assistant calls the API, then answers with ids, yields, and market rates from the current book.

## Why it exists

A fund using NODO has to answer three questions before anyone commits money:

1. Which yield products are on the book, and what are they earning?
2. Where can that product be used as collateral, and what does the leverage look like after borrow cost?
3. What has the lending market actually paid, not just the latest quote?

Those answers already live in the API. They were hard to reach from the tools people now use to think: Cursor, Claude, and other assistants. Rebuilding the catalog inside each assistant would drift from production. Giving an assistant the write API would let it estimate, open, or confirm a position.

This server takes the first path. It reads production. It leaves the decision, and the transaction, on the existing API.

That is the business case. The catalog stays one source. An assistant can brief an analyst. It cannot move funds, borrow, or submit a route.

## What you can ask

| Question | Tool to start with | Then |
| --- | --- | --- |
| What yield products are listed? | `list_assets` | `get_asset` with `assetId` from that list |
| Where can we lever a product, and what is the net APY? | `list_opportunities` | `get_opportunity` with `opportunityId` |
| Which markets lend against a token, and at what LTV? | `list_markets` | Filter by venue, collateral, or debt symbol |
| What did this market earn and cost to borrow? | `get_market_apy_history` | Use `protocolId` and `marketId` from the market list |

Lists come back as one row per record, plus `asOfTime` when the API sends it. When `nextOffset` is a number, ask again with that offset. When it is null, that was the last page. Lists ask for 10 rows if you do not set `limit`. The API allows 1 to 100.

`list_markets` reads the full market list once. `network`, `protocolId`, `collateral`, and `debt` narrow those rows afterward. They are not sent to the API as query parameters.

## What it will not do

It will not estimate, open, authorize, or confirm a position. It will not read positions, liquidation, or administration. It does not return purchase, redemption, or acquisition routes, because those are how a trade is built.

A workload key still needs the API's `common.read` permission. This server does not grant it.

## Connect it in Cursor

You need Node.js 22 or newer, and a NODO workload key. NODO shows the secret once, when the key is created. Put it in the MCP client environment. Do not paste it into chat, and do not commit it.

```bash
npm install
npm test
```

`npm test` compiles the server and runs the checks. Start it with `node dist/index.js`. It speaks MCP on stdin and stdout.

Add this to `mcp.json`. Replace the path. Leave the real secret out of git.

```json
{
  "mcpServers": {
    "nodo": {
      "command": "node",
      "args": ["/absolute/path/to/nodo-mcp/dist/index.js"],
      "env": {
        "NODO_API_KEY": "nodo_<key-id>",
        "NODO_API_SECRET": "<secret shown once when the key was created>"
      }
    }
  }
}
```

The default API is `https://app.nodo.xyz/api/v2`. Set `NODO_API_BASE_URL` only for another host that still serves `/api/v2`.

`npx nodo-mcp` is not available. The package is not on npm.

## For an assistant

Two skills in this repo describe the steps:

- [.cursor/skills/find-nodo-yield/SKILL.md](.cursor/skills/find-nodo-yield/SKILL.md) for products and leveraged opportunities
- [.cursor/skills/read-nodo-markets/SKILL.md](.cursor/skills/read-nodo-markets/SKILL.md) for lending markets and rate history

## If a call fails

The API reports a failed read as HTTP 200 with `{ "error": { "code", "message" } }`. This server turns that into a tool error, for example `NODO API auth_invalid: API key is invalid or revoked`. Other HTTP errors are tool errors too. If a response echoes the secret, the text shows `[redacted]`.

The server signs each read. The secret never leaves the machine. A missing or malformed key stops the process before any request. Each signature lasts 30 seconds.

## Publish status

`server.json` names `io.github.sowmya-netizen/nodo` and points at this repository. The official MCP registry does not list it yet. That step needs a published package, then a GitHub login as `sowmya-netizen`.
