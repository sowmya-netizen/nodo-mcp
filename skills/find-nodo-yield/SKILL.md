---
name: find-nodo-yield
description: Look up yield-bearing assets and the loans available against them in NODO's live list. Use when someone asks what an asset pays, which loans exist, the yield left after interest, the collateral, or the borrowed asset. Do not use it to open or submit a loan.
---

# Find a yield-bearing asset or a loan against it

NODO keeps one current list of yield-bearing assets and of loans that use those assets as collateral. A neobank, a holder, and another project can all read it. Read the list. Do not borrow, buy, or prepare a loan.

Use the `nodo` server. If it is not connected, stop and say so. Do not invent rows.

## Products

1. Call `list_assets`. Omit `limit` for 10 rows. Pass `offset` from `nextOffset` until it is null or the answer is enough.
2. Call `get_asset` with `assetId` copied from that list. Do not build an id from a name or ticker.
3. Report name, ticker, issuer, yield, size, and terms. Include `asOfTime` when it is present so the reader knows when the figures were taken.

`get_asset` does not include purchase or redemption routes. Do not reconstruct them.

## Opportunities

An opportunity is one yield-bearing asset posted as collateral in one lending market. The useful figures are the yield left after interest, and the largest loan that still sits short of the point where the collateral is sold.

1. Call `list_opportunities`. Use `search` for a ticker or name. Use `yieldToken`, `protocolIds`, `debtToken`, or `minNetApy` when the user named them.
2. Call `get_opportunity` with `opportunityId` copied unchanged.
3. Report venue (`protocolId`), collateral, debt, base yield, net APY, leverage, max LTV, and access. Quote `projectionStatus` when it is not `available`.

`get_opportunity` does not include acquisition routes. Do not draft calldata or an open-position request.

## Stop

If someone asks to size, open, authorize, or confirm a loan, say this program cannot do that. The NODO API is where a loan is prepared. Do not look for another tool here to get around that.
