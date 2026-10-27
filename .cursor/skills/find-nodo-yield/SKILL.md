---
name: find-nodo-yield
description: Look up NODO yield products and leveraged opportunities with the read-only nodo MCP. Use when the user asks what a product earns, which opportunities exist, net APY, leverage, collateral, or debt for a NODO yield product. Do not use it to open, estimate, or submit a position.
---

# Find NODO yield

NODO's catalog is the source a fund uses before it commits money. This skill only reads it. The assistant briefs a person. It does not borrow, loop, or send a transaction.

Use the `nodo` MCP server. If it is not connected, stop and say so. Do not invent catalog rows.

## Products

1. Call `list_assets`. Omit `limit` for 10 rows. Pass `offset` from `nextOffset` until it is null or the answer is enough.
2. Call `get_asset` with `assetId` copied from that list. Do not build an id from a name or ticker.
3. Report name, ticker, platform, APY, TVL, and terms. Say `asOfTime` when it is present.

`get_asset` does not include purchase or redemption routes. Do not reconstruct them.

## Opportunities

An opportunity is one yield product posted as collateral on one lending market, with a projected net APY after borrow cost.

1. Call `list_opportunities`. Use `search` for a ticker or name. Use `yieldToken`, `protocolIds`, `debtToken`, or `minNetApy` when the user named them.
2. Call `get_opportunity` with `opportunityId` copied unchanged.
3. Report venue (`protocolId`), collateral, debt, base yield, net APY, leverage, max LTV, and access. Quote `projectionStatus` when it is not `available`.

`get_opportunity` does not include acquisition routes. Do not draft calldata or an open-position request.

## Stop

If the user asks to size, open, authorize, or confirm a trade, say this server cannot do that. Point them at the product API. Do not call any other NODO tool to work around it.
