---
name: read-nodo-markets
description: Read NODO lending markets and their yield and borrow history. Use when someone asks which market accepts an asset as collateral, the level at which the loan is closed out, the borrow rate, or rate history. Do not use it to open a loan.
---

# Read a lending market

A lending market is where a yield-bearing asset can be posted as collateral and borrowed against. The question is what the loan costs, and the level at which the collateral would be sold. This only reads. It does not borrow.

Use the `nodo` server. If it is not connected, stop and say so. Do not invent pools.

## Find a market

1. Call `list_markets`. The API returns the full list. Narrow it with `protocolId`, `collateral`, `debt`, or `network` when the user named them. Those filters run after the read. They are not API query parameters.
2. `page.total` is the full book. `page.matched` is how many rows remain after filters.
3. From the row, keep `protocolId` and `marketId` together. `marketId` is the venue's own id, not a NODO product id.

## History

1. Call `get_market_apy_history` with that `protocolId` and `marketId`.
2. Pass `assetId` from `list_assets` or `list_opportunities` when the market maps to more than one product.
3. Read `borrowSummary` before the point list. If `nextCursor` is set, call again with that cursor and the same protocol, market, asset, window, and resolution.
4. Tell the user the window (`windowStart`, `windowEnd`) and whether a point is yield, borrow, or estimated.

## Stop

Do not turn a market into a loan. If someone wants to borrow, say this program cannot do that.
