[说明](../../README.zh.md) · [英文指南](../../skills/find-nodo-yield/SKILL.md) · [日本語](../ja/find-yield.md)

# 查找生息资产，或以它为抵押的借款

NODO 保持一份当前名单：生息资产，以及用这些资产做抵押的借款。新型银行、持有人和其他项目都可以读它。读这份名单。不要借入、买入，也不要准备借款。

使用 `nodo`。如果没有连上，就停下来并说明。不要编造行。

## 产品

1. 调用 `list_assets`。省略 `limit` 时为 10 行。用返回的 `nextOffset` 作为下一次的 `offset`，直到它为空，或答案已经够用。
2. 用名单里的 `assetId` 调用 `get_asset`。不要用名称或代码拼出一个 id。
3. 报告名称、代码、发行方、收益、规模和条款。有 `asOfTime` 时一并给出，让读者知道数字取自何时。

`get_asset` 不包含买入或赎回路径。不要把它们补回去。

## 机会

一个机会，是一项生息资产在一个借贷市场里作为抵押。有用的数字是扣除利息后剩下的收益，以及仍低于抵押品被出售之点的最大借款。

1. 调用 `list_opportunities`。对方给出代码或名称时用 `search`。对方点名时使用 `yieldToken`、`protocolIds`、`debtToken` 或 `minNetApy`。
2. 用原样复制的 `opportunityId` 调用 `get_opportunity`。
3. 报告场所（`protocolId`）、抵押品、债务、基础收益、净年化、杠杆、最大贷款价值比，以及准入。`projectionStatus` 不是 `available` 时，把这个状态引出来。

`get_opportunity` 不包含取得路径。不要起草 calldata，也不要起草开仓请求。

## 停止

如果有人要求测算、开启、授权或确认一笔借款，说明本程序做不到。借款在 NODO 的 API 上准备。不要在本仓库里另找工具绕过去。
