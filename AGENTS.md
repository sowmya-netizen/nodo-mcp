# nodo-mcp

This file is for Codex. Claude uses `CLAUDE.md`. The rules are the same.

A neobank pays a rate on deposits. NODO is the live book behind that rate: which assets cash can sit in, what they pay, what it costs to borrow against them, and the loan-to-value where the collateral is sold. Customer money stays at the neobank. This program only reads the book. It cannot move money or book a loan.

## Before you answer

Read the skill that matches the question:

- Savings assets and the spread after funding cost: `skills/find-nodo-yield/SKILL.md`
- Lending desks, loan-to-value, and rate history: `skills/read-nodo-markets/SKILL.md`

Use the `nodo` tools. If they are not connected, say so. Do not invent rows, ids, yields, or rates.

Copy ids from a list into the next call. Do not build an id from a name or a ticker.

## What you may report

Name, ticker, issuer, asset yield, size, terms, collateral, currency borrowed, spread after funding cost, leverage, the loan-to-value of a margin call, and rate history. Include `asOfTime` when it is present.

Leave out purchase, redemption, and the steps of a trade. Those are not in these results, and you should not reconstruct them.

## What you must not do

Do not size, open, authorize, or confirm a loan, and do not move customer money. Do not look for another tool in this repository to get around that. A loan is prepared on NODO's API, outside this program, under the neobank's own approval.
