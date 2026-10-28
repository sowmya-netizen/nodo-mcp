English · [中文](README.zh.md) · [日本語](README.ja.md)

# nodo-mcp

A read-only look at yield-bearing assets, the loans available against them, and what those markets have paid.

## The situation

Some assets pay a yield. Tokenized government debt and private credit are common examples. The same asset can be posted as collateral, so the holder can borrow against it, usually in dollars, and sometimes buy more of the asset with the proceeds.

The extra return is real only when three things are true at the same time:

- The asset's yield is higher than the interest on the loan.
- The loan stays under the level where the collateral is sold.
- The figures are current. A rate from yesterday is not a rate available today.

Those figures sit in several lending markets, each with its own rules and history. Checking them one by one, or from a copy saved yesterday, means acting on a number that may already have moved.

A neobank comparing assets for customer balances, a holder comparing loans, and another project showing these markets in its own product all need the same current list.

## What NODO is

NODO collects that list and keeps it current. It does not hold the money. The list has three parts:

- **Products.** The yield-bearing assets: name, ticker, issuer, what they are paying, and how large they are.
- **Opportunities.** One asset posted as collateral in one market: the yield left after interest, and the largest loan that still sits short of the point where the collateral is sold.
- **Markets.** The lending markets themselves: which asset is collateral, which asset is borrowed, the level at which the collateral is sold, and the rate history.

NODO publishes the list at `https://app.nodo.xyz/api/v2`. Preparing a real loan stays on that API. This project does not do that.

## What this project is

`nodo-mcp` reads the list and returns a short answer: which asset, what it pays, what the loan costs, and what the market has paid recently.

It cannot borrow, buy, sell, or return the instructions for buying or redeeming an asset. The person or project that decides to commit money still uses NODO's API for that.

A login issued by NODO is required. The login can be limited to reading. This program does not raise that limit.

## Questions it can answer

| Question | Start here | Then |
| --- | --- | --- |
| Which yield-bearing assets are listed, and what are they paying? | `list_assets` | `get_asset` with the `assetId` from that list |
| If this asset is used as collateral, what yield is left after interest? | `list_opportunities` | `get_opportunity` with the `opportunityId` |
| Which markets accept this collateral, and when would the loan be closed out? | `list_markets` | Narrow by market, collateral, or the asset borrowed |
| What has this market paid, and what has it cost to borrow? | `get_market_apy_history` | Use `protocolId` and `marketId` from the market list |

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

Claude Code in this repository reads [CLAUDE.md](CLAUDE.md). You can also point it at the same JSON with `claude mcp add`. The same JSON works as a project `.mcp.json`, which Claude Code and Kimi Code both read.

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

### Kimi Code

Kimi Code, including Kimi K3, reads [AGENTS.md](AGENTS.md). There is no separate Kimi instruction file. Copy [examples/kimi.mcp.json](examples/kimi.mcp.json) to `.kimi-code/mcp.json` in this project, or to `~/.kimi-code/mcp.json` for every project. A project file wins when both exist.

### Gemini CLI

Gemini CLI reads [GEMINI.md](GEMINI.md). Copy [examples/gemini.settings.json](examples/gemini.settings.json) to `.gemini/settings.json` in this project, or to `~/.gemini/settings.json`.

### GitHub Copilot

Copilot reads [AGENTS.md](AGENTS.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md). In VS Code, copy [examples/vscode.mcp.json](examples/vscode.mcp.json) to `.vscode/mcp.json`.

Cursor, Copilot's coding agent, and Cline also read [AGENTS.md](AGENTS.md). The rules in that file, in [CLAUDE.md](CLAUDE.md), and in [GEMINI.md](GEMINI.md) are the same.

The two guides are picked up from `skills/` by Cursor (`.cursor/skills`), Claude (`.claude/skills`), Codex and Kimi (`.agents/skills`):

- [How to look up a yield-bearing asset and a loan against it](skills/find-nodo-yield/SKILL.md)
- [How to look up a lending market and its rate history](skills/read-nodo-markets/SKILL.md)

[中文说明](README.zh.md) · [日本語](README.ja.md)

[llms.txt](llms.txt) is a short map of this repository. [中文](llms.zh.txt) · [日本語](llms.ja.txt)

Clients that offer prompts can run `find-yield` or `read-market`. Each prompt only says how to read the list.

## When a request fails

A refused read often still comes back as HTTP 200, with a body of `{ "error": { "code", "message" } }`. This program reports that as a failure, for example `NODO API auth_invalid: API key is invalid or revoked`. Any other HTTP error is a failure too.

Each read is signed on this machine. The secret is not sent. If a response happens to contain the secret, it is replaced with `[redacted]`. A bad or missing login stops the program before it makes a request. A signature expires after 30 seconds.

## Listing

`server.json` names this program `io.github.sowmya-netizen/nodo` and points at the npm package `nodo-mcp`. The public registry checks that the published package's `mcpName` matches. This package is not on npm yet, so the registry entry is not live. Publishing it, then signing the registry in as `sowmya-netizen`, is the remaining step.
