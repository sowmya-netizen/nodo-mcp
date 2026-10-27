[说明](../../README.zh.md) · [英文指南](../../skills/read-nodo-markets/SKILL.md) · [日本語](../ja/read-markets.md)

# 查看一个借贷市场

借贷市场是可以把生息资产当作抵押、并借出资金的地方。要看的是借款成本，以及抵押品会在什么水平被出售。这里只读取。它不会去借。

使用 `nodo`。如果没有连上，就停下来并说明。不要编造市场。

## 找到市场

1. 调用 `list_markets`。API 返回完整名单。对方点名时，用 `protocolId`、`collateral`、`debt` 或 `network` 缩小范围。这些筛选发生在读取之后，不是 API 的查询参数。
2. `page.total` 是整本名单。`page.matched` 是筛选后剩下的行数。
3. 从一行里同时保留 `protocolId` 和 `marketId`。`marketId` 是该市场自己的 id，不是 NODO 的产品 id。

## 历史

1. 用这对 `protocolId` 和 `marketId` 调用 `get_market_apy_history`。
2. 一个市场对应不止一个产品时，传入来自 `list_assets` 或 `list_opportunities` 的 `assetId`。
3. 先读 `borrowSummary`，再读点列。如果有 `nextCursor`，用这个 cursor 再调用一次，并保持相同的协议、市场、资产、窗口和分辨率。
4. 告诉对方窗口（`windowStart`、`windowEnd`），以及一个点是收益、借款成本，还是估算。

## 停止

不要把一个市场变成一笔借款。如果有人想借，说明本程序做不到。
