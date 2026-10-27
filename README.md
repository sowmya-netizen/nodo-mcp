# nodo-mcp

A read-only feed of savings assets, what they pay, and what it costs to borrow against them.

## The situation

A neobank takes deposits and pays customers a rate. The cash behind those balances has to earn more than that rate, or the product loses money.

One way to earn the spread is to place cash into short-dated assets, such as government debt or private credit, and in some cases to borrow against those assets and buy more of them. The spread is the asset yield minus the interest on the borrowing. It only holds if three things are true at once:

- The asset pays more than the cost of funds.
- The loan stays under the loan-to-value where the collateral is sold. That is the margin call.
- The rates are from today. Yesterday's funding cost is not a price you can lock.

Those figures sit at several lending desks, each with its own rules. Checking them by hand, or from a spreadsheet saved yesterday, is how a savings rate gets offered on stale numbers.

## What NODO is

NODO is the live book a treasury or product team reads before it prices that savings rate. Customer money stays at the neobank. NODO does not hold deposits. It collects three lists from the lending desks:

- **Products.** The assets cash can go into: name, ticker, issuer, what they are paying, and how large they are.
- **Opportunities.** One asset used as collateral at one desk. This is the spread: yield left after funding cost, and the largest loan that still sits short of a margin call.
- **Markets.** The desks themselves: what they accept as collateral, what they lend (usually dollars), the loan-to-value at which they sell the collateral, and the history of what they have charged.

NODO publishes the book at `https://app.nodo.xyz/api/v2`. That same API is where a loan would later be prepared, under the neobank's own approval. This project does not do that.

## What this project is

`nodo-mcp` lets an internal tool read the book: the asset yield, the cost of funds, the loan-to-value, and the rate history. It is a data feed, not a payment rail.

It cannot move customer money, book a loan, or return the instructions for buying or redeeming an asset. A person still approves that on NODO's API.

The feed needs a NODO login, and that login can be limited to reading. This program cannot widen it.

## Questions it can answer

| Question a treasury or product team asks | Start here | Then |
| --- | --- | --- |
| Which assets can back a savings rate, and what do they pay? | `list_assets` | `get_asset` with the `assetId` from that list |
| If we borrow against one asset, what spread is left after funding cost? | `list_opportunities` | `get_opportunity` with the `opportunityId` |
| Which desks accept this collateral, and at what loan-to-value is there a margin call? | `list_markets` | Narrow by desk, collateral, or the currency borrowed |
| What has this desk paid, and what has it charged to borrow? | `get_market_apy_history` | Use `protocolId` and `marketId` from the market list |

A list returns about ten rows unless you ask for more (up to 100). `nextOffset` tells you where the next page starts. A null `nextOffset` means there is no further page. `asOfTime` is when the figures were read, when the API includes it.

The market list is returned in full, then narrowed. `network`, `protocolId`, `collateral`, and `debt` are filters on that result. They are not extra questions to the API. `page.total` is the size of the full list. `page.matched` is how many rows remain.

## Run it

You need Node.js 22 or newer, and a NODO read login. NODO shows the secret only once, when the login is created. Keep it on the machine that runs this program. Do not put it in git.

```bash
npm install
npm test
node dist/index.js
```

`npm test` compiles the program and checks it. The program then waits for requests on standard input.

The list comes from `https://app.nodo.xyz/api/v2`. Set `NODO_API_BASE_URL` only if you have another host that serves the same `/api/v2` list.

This package is not published to npm, so `npx nodo-mcp` will not work.

### Cursor or Claude Desktop

Both read the same JSON shape. Cursor uses `mcp.json`. Claude Desktop uses `~/Library/Application Support/Claude/claude_desktop_config.json` on a Mac. Replace the path. A ready-to-copy file is [examples/claude.mcp.json](examples/claude.mcp.json).

```json
{
  "mcpServers": {
    "nodo": {
      "command": "node",
      "args": ["/absolute/path/to/nodo-mcp/dist/index.js"],
      "env": {
        "NODO_API_KEY": "nodo_<key-id>",
        "NODO_API_SECRET": "<secret shown once when the login was created>"
      }
    }
  }
}
```

Claude Code in this repository reads [CLAUDE.md](CLAUDE.md). You can also point it at the same JSON with `claude mcp add`.

### Codex

Add the block in [examples/codex.config.toml](examples/codex.config.toml) to `~/.codex/config.toml`. Codex in this repository reads [AGENTS.md](AGENTS.md).

```toml
[mcp_servers.nodo]
command = "node"
args = ["/absolute/path/to/nodo-mcp/dist/index.js"]

[mcp_servers.nodo.env]
NODO_API_KEY = "nodo_<key-id>"
NODO_API_SECRET = "<secret shown once when the login was created>"
```

The same two guides are picked up from `skills/` by Cursor (`.cursor/skills`), Claude (`.claude/skills`), and Codex (`.agents/skills`):

- [How to look up a savings asset and the spread after funding cost](skills/find-nodo-yield/SKILL.md)
- [How to look up a lending desk, loan-to-value, and rate history](skills/read-nodo-markets/SKILL.md)

[llms.txt](llms.txt) is a short map of this repository for a reader who has not seen it before.

## When a request fails

A refused read often still comes back as HTTP 200, with a body of `{ "error": { "code", "message" } }`. This program reports that as a failure, for example `NODO API auth_invalid: API key is invalid or revoked`. Any other HTTP error is a failure too.

Each read is signed on this machine. The secret is not sent. If a response happens to contain the secret, it is replaced with `[redacted]`. A bad or missing login stops the program before it makes a request. A signature expires after 30 seconds.

## Listing

`server.json` names this program `io.github.sowmya-netizen/nodo`. It is not on the public MCP registry yet. That requires publishing a package and signing in to GitHub as `sowmya-netizen`.
