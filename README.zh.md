[English](README.md) · 中文 · [日本語](README.ja.md)

# nodo-mcp

只读查看生息资产、可以以这些资产为抵押的借款，以及这些市场已经支付过的利率。

## 情况

有些资产会支付收益。代币化国债和私人信贷是常见例子。同一项资产可以当作抵押，持有人可以借出资金，通常是美元，有时再用借到的钱买入更多该资产。

多出来的收益，只有这三件事同时成立时才算数：

- 资产收益高于借款利息。
- 借款停留在抵押品被出售的水平之下。
- 数字是当前的。昨天的利率不是今天能借到的利率。

这些数字分散在多个借贷市场里，每个市场有自己的规则和历史。一个一个去查，或者拿昨天保存的副本来用，等于按一个可能已经变了的数字做决定。

为客户余额比较资产的新型银行、比较借款的持有人，以及要在自己的产品里展示这些市场的其他项目，需要的是同一份当前名单。

## NODO 是什么

NODO 收集这份名单，并保持它是当前的。NODO 不保管资金。名单有三部分：

- **产品。** 生息资产：名称、代码、发行方、正在支付的收益，以及规模。
- **机会。** 一项资产在一个市场里作为抵押：扣除利息后剩下的收益，以及仍低于抵押品被出售之点的最大借款。
- **市场。** 借贷市场本身：哪项资产是抵押品，借入的是哪项资产，抵押品在什么水平被出售，以及利率历史。

NODO 在 [`https://app.nodo.xyz/api/v2`](https://app.nodo.xyz/api/v2) 发布这份名单。准备一笔真实借款仍在这个 API 上完成。本项目不做这一步。

## 本项目是什么

`nodo-mcp` 读取这份名单，并返回一段短答案：是哪项资产、它支付多少、借款成本多少、这个市场最近支付了多少。

它不能借入、买入、卖出，也不返回买入或赎回的操作说明。决定投入资金的人或项目，仍使用 NODO 的 API。

需要 NODO 签发的登录凭证。该凭证可以限制为只读。本程序不会提高这个权限。

## 它能回答的问题

| 问题 | 从这里开始 | 然后 |
| --- | --- | --- |
| 列出了哪些生息资产，它们在支付多少？ | `list_assets` | 用名单里的 `assetId` 调用 `get_asset` |
| 如果用这项资产做抵押，扣除利息后还剩多少收益？ | `list_opportunities` | 用 `opportunityId` 调用 `get_opportunity` |
| 哪些市场接受这项抵押，借款会在什么时候被了结？ | `list_markets` | 按市场、抵押品或借入的资产缩小范围 |
| 这个市场支付过多少，借款成本是多少？ | `get_market_apy_history` | 使用市场名单里的 `protocolId` 和 `marketId` |

名单默认大约返回十行，也可以要求更多（最多 100）。`nextOffset` 是下一页的起点。`nextOffset` 为空表示没有下一页。API 带有 `asOfTime` 时，它表示这些数字的读取时间。

市场名单一次全部返回，再在本地缩小范围。`network`、`protocolId`、`collateral` 和 `debt` 是对这份结果的筛选，不是向 API 额外发问。`page.total` 是完整名单的大小。`page.matched` 是筛完后剩下的行数。

## 运行

需要 Node.js 22 或更新版本，以及 NODO 的只读登录。密钥只在创建登录时显示一次。把它留在运行本程序的机器上。不要放进 git。

```bash
npm install
npm test
node dist/index.js
```

`npm test` 会编译程序并检查它。然后程序在标准输入上等待请求。

名单来自 [`https://app.nodo.xyz/api/v2`](https://app.nodo.xyz/api/v2)。只有在另一台主机提供同一份 `/api/v2` 名单时，才设置 `NODO_API_BASE_URL`。

这个包没有发布到 npm，所以 `npx nodo-mcp` 不能用。

### Cursor 或 Claude Desktop

两者使用同一种 JSON。Cursor 用 `mcp.json`。在 Mac 上，Claude Desktop 用 `~/Library/Application Support/Claude/claude_desktop_config.json`。请替换路径。可直接复制的文件是 [examples/claude.mcp.json](examples/claude.mcp.json)。

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

在本仓库里，Claude Code 读取 [CLAUDE.md](CLAUDE.md)。也可以用 `claude mcp add` 指向同一份 JSON。这份 JSON 也可以作为项目里的 `.mcp.json`，Claude Code 和 Kimi Code 都会读它。

### Codex

把 [examples/codex.config.toml](examples/codex.config.toml) 里的内容加到 `~/.codex/config.toml`。在本仓库里，Codex 读取 [AGENTS.md](AGENTS.md)。

```toml
[mcp_servers.nodo]
command = "node"
args = ["/absolute/path/to/nodo-mcp/dist/index.js"]

[mcp_servers.nodo.env]
NODO_API_KEY = "nodo_<key-id>"
NODO_API_SECRET = "<secret shown once when the login was created>"
```

### Kimi Code

Kimi Code，包括 Kimi K3，读取 [AGENTS.md](AGENTS.md)。没有单独的 Kimi 说明文件。把 [examples/kimi.mcp.json](examples/kimi.mcp.json) 复制到本项目的 `.kimi-code/mcp.json`，或复制到 `~/.kimi-code/mcp.json` 以用于所有项目。两处都有时，以项目里的文件为准。

### Gemini CLI

Gemini CLI 读取 [GEMINI.md](GEMINI.md)。把 [examples/gemini.settings.json](examples/gemini.settings.json) 复制到本项目的 `.gemini/settings.json`，或复制到 `~/.gemini/settings.json`。

### GitHub Copilot

Copilot 读取 [AGENTS.md](AGENTS.md) 和 [.github/copilot-instructions.md](.github/copilot-instructions.md)。在 VS Code 里，把 [examples/vscode.mcp.json](examples/vscode.mcp.json) 复制到 `.vscode/mcp.json`。

Cursor、Copilot 的编程代理，以及 Cline，也会读取 [AGENTS.md](AGENTS.md)。该文件、[CLAUDE.md](CLAUDE.md) 和 [GEMINI.md](GEMINI.md) 里的规则相同。

两份指南：

- [如何查找生息资产，以及以它为抵押的借款](docs/zh/find-yield.md)
- [如何查找借贷市场及其利率历史](docs/zh/read-markets.md)

工具实际调用的英文指南在 [skills/find-nodo-yield/SKILL.md](skills/find-nodo-yield/SKILL.md) 和 [skills/read-nodo-markets/SKILL.md](skills/read-nodo-markets/SKILL.md)。

[English](README.md) · [日本語](README.ja.md)

[llms.txt](llms.txt) 是本仓库的简短目录，英文为默认。[中文](llms.zh.txt) · [日本語](llms.ja.txt)

支持提示的客户端可以运行 `find-yield` 或 `read-market`。每条提示只说明如何读取名单。

## 请求失败时

被拒绝的读取常常仍以 HTTP 200 返回，正文是 `{ "error": { "code", "message" } }`。本程序把这种情况报为失败，例如 `NODO API auth_invalid: API key is invalid or revoked`。其他 HTTP 错误同样是失败。

每次读取都在本机签名。密钥不会发出去。如果响应里碰巧出现密钥，会换成 `[redacted]`。登录缺失或格式不对时，程序会在发出请求之前停止。签名在 30 秒后过期。

## 名录

`server.json` 把本程序命名为 `io.github.sowmya-netizen/nodo`，并指向 npm 包 `nodo-mcp`。公开名录会核对已发布包里的 `mcpName`。这个包还没有发布到 npm，所以名录条目还没有生效。剩下的步骤是发布该包，再以 `sowmya-netizen` 登录名录。
