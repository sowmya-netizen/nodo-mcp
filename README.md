English · [中文](README.zh.md) · [日本語](README.ja.md)

# nodo-mcp

Six signed GETs. That is the whole program.

NODO publishes one current list: yield-bearing assets (tokenized government debt and private credit are the usual cases), the loans that use one of those assets as collateral, and the lending markets those loans sit in. The extra return is the asset yield minus the interest on the loan, and it is only real while the loan stays short of the point where the collateral is sold and the figures are from today. The list is at `https://app.nodo.xyz/api/v2`. This process reads it. Preparing a loan stays on that API.

A neobank comparing assets, a holder comparing loans, and another project showing the same markets all read this list. NODO does not hold the money.

## The part that is easy to get wrong

Every request sends `Authorization: Bearer v2,<apiKey>,<expiredAt>,<sig>`.

`sig` is Ed25519 over six lines of UTF-8, joined by `\n`. The implementation is [src/sign.ts](src/sign.ts):

```
nodo-workload-v2
<api key>
<unix expiry, now + 30 seconds>
GET
<pathname + query of the URL that is fetched>
<sha256 hex of the body>
```

The signed path is `pathname + search` of the fetched URL, including `/api/v2`. `GET https://app.nodo.xyz/api/v2/assets?limit=1` is signed as `/api/v2/assets?limit=1`. The route suffix `/assets?limit=1` does not verify. [src/http.ts](src/http.ts) builds that path and checks it round-trips through `new URL`.

Ids are one path segment. An opportunity id contains colons, so `opportunity-v2:ethereum:demo` is signed as `/api/v2/opportunities/opportunity-v2%3Aethereum%3Ademo`. The form with literal colons does not verify. A redirect is not followed. The signature is bound to the URL that was requested, so a 3xx is a failure.

`list_markets` is one GET of `/api/v2/markets` with an empty query. `network`, `protocolId`, `collateral`, `debt`, `limit`, and `offset` are applied on this machine and never appear in the signed URL. The default page is 10 rows. `page.total` is the full list. `page.matched` is what remains after the filter. `nextOffset` is the next local page.

A refused read is often still HTTP 200. The body is then an object whose only key is `error`, with a string `code` and `message`. Anything else, including a resource that mentions the word error, is a successful read. `apiErrorMessage` is that test.

## Read it in this order

| File | What is there |
| --- | --- |
| [src/sign.ts](src/sign.ts) | The six-line string and the Ed25519 signature |
| [src/http.ts](src/http.ts) | GET only, the signed path, HTTP 200 failures |
| [src/present.ts](src/present.ts) | The compact object a caller receives. Purchase, redemption, and acquisition routes are dropped here |
| [src/server.ts](src/server.ts) | Six tools and two prompts. Lists default to 10 rows |
| [src/credentials.ts](src/credentials.ts) | Key and secret shape. The secret is replaced with `[redacted]` if it ever appears in a result |
| [src/index.ts](src/index.ts) | stdio. Load the login, then serve |

`npm test` compiles and runs the tests beside those files. They check the signed path, that a signature over `/assets?...` fails, that an HTTP 200 error envelope is a failure, and that the secret is absent from both results and errors.

## How it is evaluated

A model answers from what a tool returns, so the evaluation scores that output, not the code. [src/production.test.ts](src/production.test.ts) runs a recorded production list and detail read through the real server. The recording is [fixtures/opportunities.production.json](fixtures/opportunities.production.json), unchanged from the product's public OpenAPI document, with its capture time and source hash. It checks five things a model needs:

| Property | Failure it rules out |
| --- | --- |
| Units | Reading `26097074865` USDC base units as 26 billion. Amounts are whole tokens with the token named |
| Capacity | Reporting a closed opportunity because room before target utilization is zero while the hard limit is not |
| Chaining | An id from one tool that the next tool's input schema rejects |
| Safety | Acquisition routes or mechanisms reaching the caller |
| Agreement | A list row and its detail read disagreeing on the same position |

It also replays the two-step path a model takes: `list_opportunities`, then `get_opportunity` with the id it returned. The second request must be the URL production recorded.

A failed read ends with one line that says whether retrying helps and which call to make instead. An unknown `opportunityId` points back to `list_opportunities`. A refused key says retrying will not help. A server failure allows one retry and says not to fill in figures. The cases are in [src/server.test.ts](src/server.test.ts) and the mapping is `recovery` in [src/server.ts](src/server.ts).

APY and rate fields are decimals, so `0.05` is 5%. Fields ending in `Bps` are basis points, so `8600` is 86%.

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
