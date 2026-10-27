---
name: find-nodo-yield
description: Look up savings assets and the spread after funding cost in NODO's live book. Use when someone asks what an asset pays, which collateralised loans exist, net yield after interest, collateral, or the currency borrowed. Do not use it to book a loan or move customer money.
---

# Find a savings asset and the spread

A neobank pays a rate on deposits. NODO's book shows which assets can earn that rate, and what is left after the cost of borrowing against them. Customer money stays at the neobank. Read the book. Do not book a loan or move money.

Use the `nodo` server. If it is not connected, stop and say so. Do not invent rows.

## Products

1. Call `list_assets`. Omit `limit` for 10 rows. Pass `offset` from `nextOffset` until it is null or the answer is enough.
2. Call `get_asset` with `assetId` copied from that list. Do not build an id from a name or ticker.
3. Report name, ticker, issuer, yield, size, and terms. Include `asOfTime` when it is present so the reader knows when the figures were taken.

`get_asset` does not include purchase or redemption routes. Do not reconstruct them.

## Opportunities

An opportunity is one savings asset pledged as collateral at one lending desk. The number a treasury team needs is the spread left after funding cost, and the largest loan that still sits short of a margin call.

1. Call `list_opportunities`. Use `search` for a ticker or name. Use `yieldToken`, `protocolIds`, `debtToken`, or `minNetApy` when the user named them.
2. Call `get_opportunity` with `opportunityId` copied unchanged.
3. Report venue (`protocolId`), collateral, debt, base yield, net APY, leverage, max LTV, and access. Quote `projectionStatus` when it is not `available`.

`get_opportunity` does not include acquisition routes. Do not draft calldata or an open-position request.

## Stop

If someone asks to size, open, authorize, or confirm a loan, or to move customer money, say this program cannot do that. The NODO API is where a loan is prepared, under the neobank's own approval. Do not look for another tool here to get around that.
