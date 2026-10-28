import assert from "node:assert/strict";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  verify,
} from "node:crypto";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadConfig, type NodoConfig } from "./credentials.js";
import { nodoGet } from "./http.js";
import { createNodoServer } from "./server.js";

const API_KEY = "nodo_10000000-0000-4000-8000-000000000001";
const AUTHORIZATION_PATTERN =
  /^Bearer v2,nodo_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12},[0-9]+,[A-Za-z0-9_-]{86}$/;
const TOOL_NAMES = [
  "list_assets",
  "get_asset",
  "list_opportunities",
  "get_opportunity",
  "list_markets",
  "get_market_apy_history",
];

test("prompts name the two read workflows", async () => {
  const { apiSecret } = throwawayCredential();
  const names = await withClient(config(apiSecret), async (client) => {
    const listed = await client.listPrompts();
    return listed.prompts.map((prompt) => prompt.name);
  });
  assert.deepEqual(names, ["find-yield", "read-market"]);
});

test("tools/list names are exactly the six read tools", async () => {
  const { apiSecret } = throwawayCredential();
  const seen = await withClient(config(apiSecret), async (client) => {
    const listed = await client.listTools();
    return listed.tools.map((tool) => tool.name);
  });
  assert.deepEqual(seen, TOOL_NAMES);
});

test("list_assets sends one signed GET and the signature verifies locally", async () => {
  const { apiSecret, der } = throwawayCredential();
  const calls: Captured[] = [];
  const before = Math.floor(Date.now() / 1000);
  const result = await withClient(
    config(apiSecret, async (input, init) => {
      calls.push(capture(input, init));
      return jsonResponse({ data: { assets: [] } });
    }),
    (client) => client.callTool({ name: "list_assets", arguments: { limit: 1 } })
  );
  const after = Math.floor(Date.now() / 1000);

  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.method, "GET");
  assert.equal(call.body, undefined);
  assert.equal(call.url, "https://app.nodo.xyz/api/v2/assets?limit=1");
  const signedPath = new URL(call.url).pathname + new URL(call.url).search;
  assert.equal(signedPath, "/api/v2/assets?limit=1");
  assert.match(call.authorization, AUTHORIZATION_PATTERN);
  assertNoSecret(call.authorization, apiSecret);
  for (const value of call.headers.values()) assertNoSecret(value, apiSecret);
  assert.equal(result.isError, undefined);
  assert.ok(Array.isArray(result.content));
  const textBlock = result.content[0] as { type?: string; text?: string };
  assert.equal(textBlock.type, "text");
  assert.equal(typeof textBlock.text, "string");
  const text = textBlock.text ?? "";
  assert.deepEqual(result.structuredContent, JSON.parse(text));

  const expiredAt = Number(call.authorization.split(",")[2]);
  assert.ok(expiredAt >= before + 30 && expiredAt <= after + 30);
  assert.equal(
    verifyWorkloadSignature(call.authorization, der, "GET", "/api/v2/assets?limit=1"),
    true
  );
  assert.equal(
    verifyWorkloadSignature(call.authorization, der, "GET", "/assets?limit=1"),
    false
  );
  assertNoSecret(JSON.stringify(result), apiSecret);
});

test("get_market_apy_history signs the /api/v2 path and query it requests", async () => {
  const { apiSecret, der } = throwawayCredential();
  const calls: Captured[] = [];
  await withClient(
    config(apiSecret, async (input, init) => {
      calls.push(capture(input, init));
      return jsonResponse({ data: { points: [] } });
    }),
    (client) =>
      client.callTool({
        name: "get_market_apy_history",
        arguments: {
          protocol: "morpho-blue",
          marketId: "0xabc",
          windowDays: 7,
          from: "2026-09-01T00:00:00.000Z",
        },
      })
  );
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.method, "GET");
  const signedPath = new URL(call.url).pathname + new URL(call.url).search;
  assert.equal(
    signedPath,
    "/api/v2/markets/morpho-blue/0xabc/apy-history?windowDays=7&from=2026-09-01T00%3A00%3A00.000Z"
  );
  assert.equal(verifyWorkloadSignature(call.authorization, der, "GET", signedPath), true);
});

test("an opportunity id is signed as one encoded path segment", async () => {
  const { apiSecret, der } = throwawayCredential();
  const calls: Captured[] = [];
  await withClient(
    config(apiSecret, async (input, init) => {
      calls.push(capture(input, init));
      return jsonResponse({ data: { id: "opportunity-v2:ethereum:demo" } });
    }),
    (client) =>
      client.callTool({
        name: "get_opportunity",
        arguments: { opportunityId: "opportunity-v2:ethereum:demo" },
      })
  );
  const call = calls[0];
  assert.ok(call);
  const signedPath = new URL(call.url).pathname + new URL(call.url).search;
  assert.equal(signedPath, "/api/v2/opportunities/opportunity-v2%3Aethereum%3Ademo");
  assert.equal(verifyWorkloadSignature(call.authorization, der, "GET", signedPath), true);
  assert.equal(
    verifyWorkloadSignature(
      call.authorization,
      der,
      "GET",
      "/api/v2/opportunities/opportunity-v2:ethereum:demo"
    ),
    false
  );
});

test("a redirect is a failure and is not followed", async () => {
  const { apiSecret } = throwawayCredential();
  let fetches = 0;
  await assert.rejects(
    nodoGet(
      config(apiSecret, async () => {
        fetches += 1;
        return new Response(null, {
          status: 302,
          headers: { location: "https://example.test/elsewhere" },
        });
      }),
      ["assets"],
      []
    ),
    /HTTP 302/
  );
  assert.equal(fetches, 1);
});

test("missing credentials fail before fetch", async () => {
  let fetches = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = async () => {
    fetches += 1;
    throw new Error("fetch was called");
  };
  try {
    assert.throws(() => loadConfig({}), /NODO_API_KEY is missing/);
    assert.throws(
      () => loadConfig({ NODO_API_KEY: API_KEY }),
      /NODO_API_SECRET is missing/
    );
    await assert.rejects(
      nodoGet(
        {
          baseUrl: "https://app.nodo.xyz/api/v2",
          apiKey: "",
          apiSecret: "",
          fetchImpl: globalThis.fetch,
        },
        ["assets"],
        []
      ),
      /NODO_API_KEY is malformed/
    );
  } finally {
    globalThis.fetch = previous;
  }
  assert.equal(fetches, 0);
});

test("a malformed secret fails before fetch and is absent from the error", async () => {
  const secret = `nodo_ed25519_sk_${"a".repeat(64)}`;
  let fetches = 0;
  const fetchImpl: typeof fetch = async () => {
    fetches += 1;
    throw new Error("fetch was called");
  };
  await assert.rejects(
    nodoGet(
      {
        baseUrl: "https://app.nodo.xyz/api/v2",
        apiKey: API_KEY,
        apiSecret: secret,
        fetchImpl,
      },
      ["assets"],
      []
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /NODO_API_SECRET is malformed/);
      assertNoSecret(error.message, secret);
      return true;
    }
  );
  assert.equal(fetches, 0);
});

test("an omitted list limit asks the API for 10 rows", async () => {
  const { apiSecret } = throwawayCredential();
  const calls: Captured[] = [];
  await withClient(
    config(apiSecret, async (input, init) => {
      calls.push(capture(input, init));
      return jsonResponse({
        data: { counts: { total: 0, returned: 0 }, query: { limit: 10, offset: 0 }, assets: [] },
      });
    }),
    (client) => client.callTool({ name: "list_assets", arguments: {} })
  );
  assert.equal(calls[0]?.url, "https://app.nodo.xyz/api/v2/assets?limit=10");
});

test("list_opportunities returns the compact row and the next offset", async () => {
  const { apiSecret } = throwawayCredential();
  const result = await withClient(
    config(apiSecret, async () =>
      jsonResponse({
        data: {
          counts: { total: 4, matched: 4, returned: 1 },
          query: { limit: 1, offset: 0 },
          opportunities: [
            {
              id: "opportunity-v2:ethereum:demo",
              asset: { id: "9", display: { name: "Demo" } },
              borrowMarket: { protocolId: "morpho-blue", nativeId: "0x1" },
              acquisitionRoutes: [{ secretPath: "do-not-show" }],
            },
          ],
        },
      })
    ),
    (client) =>
      client.callTool({ name: "list_opportunities", arguments: { limit: 1 } })
  );
  const serialized = JSON.stringify(result);
  assert.equal(result.isError, undefined);
  assert.match(serialized, /opportunity-v2:ethereum:demo/);
  assert.match(serialized, /nextOffset/);
  assert.doesNotMatch(serialized, /do-not-show/);
});

test("an HTTP 200 API error envelope is a tool error", async () => {
  const { apiSecret } = throwawayCredential();
  const result = await withClient(
    config(apiSecret, async () =>
      jsonResponse({
        error: {
          code: "auth_invalid",
          message: `API key is invalid or revoked ${apiSecret}`,
          details: { hint: apiSecret },
        },
      })
    ),
    (client) => client.callTool({ name: "list_markets", arguments: {} })
  );
  const serialized = JSON.stringify(result);
  assert.equal(result.isError, true);
  assert.match(serialized, /NODO API auth_invalid/);
  assert.match(serialized, /\[redacted\]/);
  assertNoSecret(serialized, apiSecret);
});

test("a resource body that mentions error is still a successful read", async () => {
  const { apiSecret } = throwawayCredential();
  const result = await withClient(
    config(apiSecret, async () =>
      jsonResponse({ assets: [{ id: "asset-1", note: "no error field here" }] })
    ),
    (client) => client.callTool({ name: "list_assets", arguments: { limit: 1 } })
  );
  assert.equal(result.isError, undefined);
  assert.match(JSON.stringify(result), /asset-1/);
});

test("the API secret is absent from a tool result and a tool error", async () => {
  const { apiSecret } = throwawayCredential();
  const leakedBody = `upstream said ${apiSecret}`;
  const result = await withClient(
    config(apiSecret, async () => new Response(leakedBody, { status: 500 })),
    (client) => client.callTool({ name: "list_markets", arguments: {} })
  );
  const serialized = JSON.stringify(result);
  assert.equal(result.isError, true);
  assertNoSecret(serialized, apiSecret);
  assert.match(serialized, /HTTP 500/);
  assert.match(serialized, /\[redacted\]/);
});

type Captured = {
  url: string;
  method: string;
  authorization: string;
  body: unknown;
  headers: Headers;
};

function throwawayCredential(): { apiSecret: string; der: Buffer } {
  const { privateKey } = generateKeyPairSync("ed25519");
  const exported = privateKey.export({ format: "der", type: "pkcs8" });
  const der = Buffer.from(exported);
  assert.equal(der.byteLength, 48);
  return {
    der,
    apiSecret: `nodo_ed25519_sk_${der.toString("base64url")}`,
  };
}

function config(
  apiSecret: string,
  fetchImpl?: typeof fetch
): NodoConfig {
  return {
    baseUrl: "https://app.nodo.xyz/api/v2",
    apiKey: API_KEY,
    apiSecret,
    fetchImpl,
  };
}

function capture(input: RequestInfo | URL, init: RequestInit | undefined): Captured {
  const headers = new Headers(init?.headers);
  return {
    url: requestUrl(input),
    method: init?.method ?? "GET",
    authorization: headers.get("authorization") ?? "",
    body: init?.body,
    headers,
  };
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function withClient<T>(
  nodo: NodoConfig,
  use: (client: Client) => Promise<T>
): Promise<T> {
  const server = createNodoServer(nodo);
  const client = new Client({ name: "nodo-mcp-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    return await use(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

function verifyWorkloadSignature(
  authorization: string,
  pkcs8Der: Buffer,
  method: string,
  path: string
): boolean {
  if (!AUTHORIZATION_PATTERN.test(authorization)) return false;
  const [, apiKey, expiredAt, encodedSignature] = authorization.match(
    /^Bearer v2,([^,]+),([0-9]+),([A-Za-z0-9_-]{86})$/
  ) ?? [];
  if (!apiKey || !expiredAt || !encodedSignature) return false;
  assert.equal(pkcs8Der.byteLength, 48);
  const signature = Buffer.from(encodedSignature, "base64url");
  if (signature.byteLength !== 64 || signature.toString("base64url") !== encodedSignature) {
    return false;
  }
  const publicKey = createPublicKey(
    createPrivateKey({ key: pkcs8Der, format: "der", type: "pkcs8" })
  );
  const spki = publicKey.export({ format: "der", type: "spki" });
  assert.equal(Buffer.from(spki).byteLength, 44);
  const bodySha256 = createHash("sha256").update("").digest("hex");
  assert.equal(
    bodySha256,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
  const text = [
    "nodo-workload-v2",
    apiKey,
    expiredAt,
    method.toUpperCase(),
    path,
    bodySha256,
  ].join("\n");
  return verify(
    null,
    Buffer.from(text),
    createPublicKey({ key: spki, format: "der", type: "spki" }),
    signature
  );
}

function assertNoSecret(text: string, secret: string): void {
  if (text.includes(secret)) {
    throw new Error("secret appeared in output");
  }
}
