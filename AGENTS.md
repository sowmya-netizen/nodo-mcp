# nodo-mcp

This file is for tools that read `AGENTS.md`, including Codex, Kimi Code (Kimi K3), Cursor, and GitHub Copilot. Claude uses `CLAUDE.md`. Gemini CLI uses `GEMINI.md`. The rules are the same.

NODO keeps one current list of yield-bearing assets, the loans available against them, and the lending markets those loans sit in. A neobank, a holder, and another project can all read that list. This program only reads it. It cannot borrow, buy, sell, or prepare a loan.

## Before you answer

Read the skill that matches the question:

- Yield-bearing assets and loans against them: `skills/find-nodo-yield/SKILL.md`
- Lending markets and rate history: `skills/read-nodo-markets/SKILL.md`

Use the `nodo` tools. If they are not connected, say so. Do not invent rows, ids, yields, or rates.

Copy ids from a list into the next call. Do not build an id from a name or a ticker.

## What you may report

Name, ticker, issuer, yield, size, terms, collateral, borrowed asset, yield left after interest, leverage, the level where the collateral is sold, and rate history. Include `asOfTime` when it is present.

Leave out purchase, redemption, and the steps of a trade. Those are not in these results, and you should not reconstruct them.

## What you must not do

Do not size, open, authorize, or confirm a loan. Do not look for another tool in this repository to get around that. A loan is prepared on NODO's API, outside this program.
