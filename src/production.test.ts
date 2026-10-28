// Evaluation on recorded production responses: what a model receives from a
// real list and detail read, scored on the properties it needs to answer
// correctly. The fixture is published unchanged in the product OpenAPI
// document; its capture time, source URL and response hash are in the file.
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import * as z from "zod/v4";
import { presentRead } from "./present.js";
import {
  getAssetInput,
  getMarketApyHistoryInput,
  getOpportunityInput,
  listOpportunitiesInput,
} from "./schemas.js";
import { createNodoServer } from "./server.js";

type Json = Record<string, unknown>;

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/opportunities.production.json", import.meta.url), "utf8")
) as {
  list: { sourceUrl: string; value: Json };
  detail: { sourceUrl: string; value: Json };
};

const list = JSON.parse(presentRead("list_opportunities", fixture.list.value)) as {
  opportunities: Json[];
};
const detail = JSON.parse(presentRead("get_opportunity", fixture.detail.value)) as Json;
const row = list.opportunities[0] as Json;

test("units: amounts are whole tokens, never smallest-unit integers", () => {
  assert.deepEqual(row.availableLiquidity, { amount: "26097.074865", token: "USDC" });
  assert.deepEqual(detail.maximumBorrowable, { amount: "26097.074865", token: "USDC" });
  for (const [path, value] of strings({ list, detail })) {
    assert.doesNotMatch(value, /^\d{7,}$/, `${path} is an unscaled integer`);
  }
});

test("capacity: room before target utilization is separate from the hard limit", () => {
  assert.deepEqual(row.capacity, {
    beforeTargetUtilization: { amount: "0", token: "USDC" },
    beforeTargetUtilizationUsd: "0",
    toMaximum: { amount: "9191.128589", token: "USDC" },
    boundBy: "available-liquidity",
    collateralSupplyRemaining: null,
  });
  assert.deepEqual(detail.utilization, {
    targetUtilizationBps: "9000",
    borrowApyAtTarget: "0.033535615087221302",
    borrowApyAtMaximum: "0.134698095715293085",
  });
});

test("chaining: every id a row returns is accepted by the tool it names", () => {
  z.object(getAssetInput).parse({ assetId: row.assetId });
  z.object(getOpportunityInput).parse({ opportunityId: row.opportunityId });
  z.object(getMarketApyHistoryInput).parse({ protocol: row.protocolId, marketId: row.marketId });
  z.object({ debtToken: listOpportunitiesInput.debtToken }).parse({ debtToken: row.debtToken });
});

test("safety: acquisition routes and mechanisms never reach the caller", () => {
  for (const [path] of strings({ list, detail })) {
    assert.doesNotMatch(path, /acquisition|mechanism|route/i, path);
  }
  const text = JSON.stringify({ list, detail });
  assert.doesNotMatch(text, /route\.ethereum|mechanism\.ethereum|calldata/);
});

test("agreement: the list row and the detail read report the same position", () => {
  for (const key of ["opportunityId", "netApy", "leverage", "liquidationLtvBps", "capacity"]) {
    assert.deepEqual(detail[key], row[key], key);
  }
});

test("size: the presented read is well under half of the raw response", () => {
  const raw = JSON.stringify(fixture.list.value).length;
  const presented = JSON.stringify(list).length;
  assert.ok(presented < raw / 2, `${presented} of ${raw} characters`);
});

test("trajectory: list, then get_opportunity with the returned id, requests the recorded URL", async () => {
  const urls: string[] = [];
  const responses = [fixture.list.value, fixture.detail.value];
  const server = createNodoServer({
    baseUrl: "https://app.nodo.xyz/api/v2",
    apiKey: "nodo_10000000-0000-4000-8000-000000000001",
    apiSecret: throwawaySecret(),
    fetchImpl: async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify(responses[urls.length - 1]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const client = new Client({ name: "nodo-mcp-eval", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const first = await client.callTool({
      name: "list_opportunities",
      arguments: { search: "mAPOLLO", limit: 1 },
    });
    const listed = first.structuredContent as { opportunities: { opportunityId: string }[] };
    const opportunityId = listed.opportunities[0]?.opportunityId;
    assert.ok(opportunityId);
    const second = await client.callTool({ name: "get_opportunity", arguments: { opportunityId } });
    assert.equal(second.isError, undefined);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
  const recorded = new URL(fixture.detail.sourceUrl).pathname.split("/").pop();
  assert.equal(new URL(urls[1] ?? "").pathname.split("/").pop(), recorded);
});

function* strings(value: unknown, path = "$"): Generator<[string, string]> {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* strings(item, `${path}[${index}]`);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) yield* strings(item, `${path}.${key}`);
  }
}

function throwawaySecret(): string {
  const { privateKey } = generateKeyPairSync("ed25519");
  const der = Buffer.from(privateKey.export({ format: "der", type: "pkcs8" }));
  return `nodo_ed25519_sk_${der.toString("base64url")}`;
}
