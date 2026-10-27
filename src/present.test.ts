import assert from "node:assert/strict";
import { test } from "node:test";
import { presentRead } from "./present.js";

test("list_opportunities keeps the id and the next page, and drops route payloads", () => {
  const text = presentRead("list_opportunities", {
    data: {
      counts: { total: 88, matched: 12, returned: 1 },
      query: { limit: 10, offset: 0 },
      opportunities: [
        {
          id: "opportunity-v2:ethereum:mAPOLLO",
          asset: {
            id: "35673",
            display: { name: "Midas mAPOLLO", ticker: "mAPOLLO" },
            platform: { name: "Midas" },
          },
          borrowMarket: {
            network: "ethereum",
            protocolId: "morpho-blue",
            nativeId: "0xabc",
            collateralToken: { symbol: "mAPOLLO" },
            debtToken: { symbol: "USDC" },
            rate: { kind: "variable" },
          },
          accessRequirement: "permissionless",
          safeMaximumLtvBps: "8170",
          maximumOpenRounds: 5,
          projection: {
            status: "available",
            value: {
              netApy: { selected: { current: "0.21" } },
              leverage: { selected: "3.8" },
            },
          },
          acquisitionRoutes: [{ calldata: "0xdead" }],
        },
      ],
    },
  });
  assert.match(text, /opportunity-v2:ethereum:mAPOLLO/);
  assert.match(text, /"nextOffset": 1/);
  assert.match(text, /"netApy": "0.21"/);
  assert.match(text, /"marketId": "0xabc"/);
  assert.doesNotMatch(text, /acquisitionRoutes/);
  assert.doesNotMatch(text, /0xdead/);
});

test("list_assets reports the next offset from total", () => {
  const text = presentRead("list_assets", {
    data: {
      counts: { total: 3, returned: 1 },
      query: { limit: 1, offset: 1 },
      assets: [
        {
          id: "asset-2",
          display: { name: "HYB", ticker: "HYB" },
          platform: { name: "Issuer" },
          tokens: [{ symbol: "HYB" }],
          tvlUsd: "10",
          economics: { apy: "0.05" },
        },
      ],
    },
  });
  assert.match(text, /"assetId": "asset-2"/);
  assert.match(text, /"nextOffset": 2/);
  assert.match(text, /"symbols": \[\s*"HYB"/);
});

test("the last page has no next offset", () => {
  const text = presentRead("list_markets", {
    data: {
      markets: [
        {
          network: "ethereum",
          executionAvailable: true,
          market: {
            definition: {
              id: { protocolId: "aave-v3", nativeId: "usdc" },
              collateralToken: { symbol: "HYB" },
              debtToken: { symbol: "USDC" },
              liquidationLtvBps: "8000",
              marketMaximumLtvBps: "7500",
            },
            economics: { rate: { kind: "variable", annualizedRate: "0.04" } },
          },
        },
      ],
    },
  });
  assert.match(text, /"protocolId": "aave-v3"/);
  assert.match(text, /"nextOffset": null/);
});

test("apy history keeps the cursor and the points", () => {
  const text = presentRead("get_market_apy_history", {
    data: {
      windowStart: "2026-09-01T00:00:00.000Z",
      windowEnd: "2026-09-02T00:00:00.000Z",
      nextCursor: "cursor-2",
      borrowSummary: { average7dApy: "0.03" },
      points: [{ timestamp: "2026-09-01T00:00:00.000Z", yieldApy: "0.08", borrowApy: "0.04" }],
    },
  });
  assert.match(text, /cursor-2/);
  assert.match(text, /"yieldApy": "0.08"/);
  assert.match(text, /"pointCount": 1/);
});

test("a single read returns the resource, not the list projection", () => {
  const text = presentRead("get_asset", {
    data: { id: "asset-1", display: { name: "HYB" }, acquisitionRoutes: [] },
  });
  assert.match(text, /"id": "asset-1"/);
  assert.match(text, /acquisitionRoutes/);
  assert.doesNotMatch(text, /nextOffset/);
});
