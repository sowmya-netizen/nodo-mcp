[English](README.md) · [中文](README.zh.md) · 日本語

# nodo-mcp

利回りを生む資産、それを担保にした借り入れ、そしてその市場がこれまで払ってきた利率を、読み取り専用で見る。

## 状況

利回りを払う資産がある。トークン化された国債やプライベートクレジットがその例である。同じ資産は担保にでき、保有者は通常ドルを借り、借りた資金で同じ資産をさらに買うこともある。

増えたリターンが実在するのは、次の三つが同時に成り立つときだけである。

- 資産の利回りが、借り入れの利息より高い。
- 借り入れが、担保が売却される水準より下にある。
- 数字が現在のものである。昨日の金利は、今日借りられる金利ではない。

この数字は複数の貸出市場に分かれており、市場ごとに規則と履歴が違う。一つずつ調べる、あるいは昨日保存した写しを使うと、すでに動いた数字で判断することになる。

顧客残高の資産を比べるネオバンク、借り入れを比べる保有者、そして同じ市場を自社のプロダクトに出す別のプロジェクトは、同じ現在の一覧を必要とする。

## NODO とは

NODO はその一覧を集め、現在の状態に保つ。資金は預からない。一覧は三つに分かれる。

- **プロダクト。** 利回りを生む資産。名称、ティッカー、発行者、支払っている利回り、規模。
- **オポチュニティ。** 一つの資産を一つの市場で担保にしたもの。利息を引いたあとに残る利回りと、担保が売却される点より手前に収まる最大の借り入れ。
- **市場。** 貸出市場そのもの。何が担保か、何を借りるか、担保が売却される水準、金利の履歴。

NODO はこの一覧を [`https://app.nodo.xyz/api/v2`](https://app.nodo.xyz/api/v2) で公開している。実際の借り入れの準備は、その API で行う。このプロジェクトはそこを行わない。

## このプロジェクト

`nodo-mcp` は一覧を読み、短い答えを返す。どの資産か、いくら払うか、借り入れにいくらかかるか、その市場が最近いくら払ったか。

借りることも、買うことも、売ることも、購入や償還の手順を返すこともできない。資金を出す人とプロジェクトは、引き続き NODO の API を使う。

NODO が発行したログインが必要である。ログインは読み取りだけに限れる。このプログラムはその範囲を広げない。

## 答えられる質問

| 質問 | 最初 | 次 |
| --- | --- | --- |
| どの利回り資産が載っていて、いくら払っているか | `list_assets` | その一覧の `assetId` で `get_asset` |
| この資産を担保にすると、利息のあと利回りはいくら残るか | `list_opportunities` | `opportunityId` で `get_opportunity` |
| どの市場がこの担保を受け、借り入れはいつ閉じられるか | `list_markets` | 市場、担保、借りる資産で絞る |
| この市場はいくら払い、借りるといくらかかったか | `get_market_apy_history` | 市場一覧の `protocolId` と `marketId` |

一覧は、増やさない限りおよそ 10 行を返す（最大 100）。`nextOffset` が次のページの開始位置である。`nextOffset` が空なら、次のページはない。API が `asOfTime` を含むとき、それは数字を読んだ時刻である。

市場の一覧は一度に全部返り、そのあと絞り込む。`network`、`protocolId`、`collateral`、`debt` はその結果に対する条件であり、API への追加の問い合わせではない。`page.total` は一覧全体の件数、`page.matched` は絞り込んだあとに残った行数である。

## 動かし方

Node.js 22 以降と、NODO の読み取り用ログインが必要である。秘密は、ログインを作ったとき一度だけ表示される。このプログラムを動かすマシンに置き、git には入れない。

```bash
npm install
npm test
node dist/index.js
```

`npm test` はプログラムをコンパイルして確認する。そのあと、プログラムは標準入力で要求を待つ。

一覧の出どころは [`https://app.nodo.xyz/api/v2`](https://app.nodo.xyz/api/v2) である。同じ `/api/v2` の一覧を出す別のホストがあるときだけ、`NODO_API_BASE_URL` を設定する。

このパッケージは npm に公開されていない。`npx nodo-mcp` は使えない。

### Cursor または Claude Desktop

どちらも同じ JSON を読む。Cursor は `mcp.json` を使う。Mac の Claude Desktop は `~/Library/Application Support/Claude/claude_desktop_config.json` を使う。パスを置き換える。コピー用のファイルは [examples/claude.mcp.json](examples/claude.mcp.json) である。

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

このリポジトリでは、Claude Code は [CLAUDE.md](CLAUDE.md) を読む。同じ JSON を `claude mcp add` で指すこともできる。この JSON はプロジェクトの `.mcp.json` としても使え、Claude Code と Kimi Code の両方が読む。

### Codex

[examples/codex.config.toml](examples/codex.config.toml) の内容を `~/.codex/config.toml` に加える。このリポジトリでは、Codex は [AGENTS.md](AGENTS.md) を読む。

```toml
[mcp_servers.nodo]
command = "node"
args = ["/absolute/path/to/nodo-mcp/dist/index.js"]

[mcp_servers.nodo.env]
NODO_API_KEY = "nodo_<key-id>"
NODO_API_SECRET = "<secret shown once when the login was created>"
```

### Kimi Code

Kimi Code（Kimi K3 を含む）は [AGENTS.md](AGENTS.md) を読む。Kimi 専用の説明ファイルはない。[examples/kimi.mcp.json](examples/kimi.mcp.json) を、このプロジェクトの `.kimi-code/mcp.json` にコピーする。すべてのプロジェクトで使うなら `~/.kimi-code/mcp.json` にコピーする。両方あるときは、プロジェクト側が優先される。

### Gemini CLI

Gemini CLI は [GEMINI.md](GEMINI.md) を読む。[examples/gemini.settings.json](examples/gemini.settings.json) を、このプロジェクトの `.gemini/settings.json`、または `~/.gemini/settings.json` にコピーする。

### GitHub Copilot

Copilot は [AGENTS.md](AGENTS.md) と [.github/copilot-instructions.md](.github/copilot-instructions.md) を読む。VS Code では [examples/vscode.mcp.json](examples/vscode.mcp.json) を `.vscode/mcp.json` にコピーする。

Cursor、Copilot のコーディングエージェント、Cline も [AGENTS.md](AGENTS.md) を読む。そのファイルと [CLAUDE.md](CLAUDE.md)、[GEMINI.md](GEMINI.md) の規則は同じである。

二つの案内：

- [利回り資産と、それを担保にした借り入れの調べ方](docs/ja/find-yield.md)
- [貸出市場と金利履歴の調べ方](docs/ja/read-markets.md)

ツールが実際に読む英語の案内は [skills/find-nodo-yield/SKILL.md](skills/find-nodo-yield/SKILL.md) と [skills/read-nodo-markets/SKILL.md](skills/read-nodo-markets/SKILL.md) にある。

[English](README.md) · [中文](README.zh.md)

[llms.txt](llms.txt) はこのリポジトリの短い地図で、英語が既定である。[中文](llms.zh.txt) · [日本語](llms.ja.txt)

## 要求が失敗したとき

拒否された読み取りでも、HTTP 200 と本文 `{ "error": { "code", "message" } }` で返ることが多い。このプログラムはそれを失敗として扱う。例は `NODO API auth_invalid: API key is invalid or revoked` である。それ以外の HTTP エラーも失敗である。

各読み取りは、このマシンで署名される。秘密は送られない。応答に秘密が含まれた場合は `[redacted]` に置き換える。ログインがない、または形式が違うときは、要求を出す前にプログラムが止まる。署名は 30 秒で期限が切れる。

## 掲載

`server.json` では、このプログラムの名前は `io.github.sowmya-netizen/nodo` である。公開 MCP レジストリにはまだ載っていない。載せるにはパッケージを公開し、GitHub に `sowmya-netizen` として入る必要がある。
