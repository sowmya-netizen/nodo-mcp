[説明](../../README.ja.md) · [英語の案内](../../skills/read-nodo-markets/SKILL.md) · [中文](../zh/read-markets.md)

# 貸出市場を読む

貸出市場は、利回りを生む資産を担保にして借りられる場所である。見るのは借り入れの費用と、担保が売却される水準である。ここは読むだけである。借りない。

`nodo` を使う。つながっていなければ止まり、その旨を言う。市場を作らない。

## 市場を見つける

1. `list_markets` を呼ぶ。API は一覧の全体を返す。相手が名指ししたときは `protocolId`、`collateral`、`debt`、`network` で絞る。この絞り込みは読んだあとに行い、API のクエリではない。
2. `page.total` は一覧全体の件数である。`page.matched` は絞ったあとに残った行数である。
3. 行から `protocolId` と `marketId` を組にして残す。`marketId` はその市場自身の id であり、NODO のプロダクト id ではない。

## 履歴

1. その `protocolId` と `marketId` で `get_market_apy_history` を呼ぶ。
2. 一つの市場が複数のプロダクトに対応するときは、`list_assets` か `list_opportunities` の `assetId` を渡す。
3. 点の列より先に `borrowSummary` を読む。`nextCursor` があるときは、そのカーソルで再度呼び、プロトコル、市場、資産、期間、解像度は同じにする。
4. 期間（`windowStart`、`windowEnd`）と、点が利回りか、借り入れ費用か、推定かを伝える。

## 止める

市場を借り入れにしない。借りたいと言われたら、このプログラムにはできないと伝える。
