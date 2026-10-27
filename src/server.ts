import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodoConfig } from "./credentials.js";
import { redactSecret } from "./credentials.js";
import { nodoGet, type QueryEntry } from "./http.js";
import {
  getAssetInput,
  getMarketApyHistoryInput,
  getOpportunityInput,
  listAssetsInput,
  listOpportunitiesInput,
} from "./schemas.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const ONLY_READS =
  "Read-only. This server cannot open, close, or estimate positions.";

export function createNodoServer(config: NodoConfig): McpServer {
  const server = new McpServer(
    { name: "nodo", version: "0.1.0" },
    {
      instructions:
        "This server only reads NODO assets, opportunities, and markets. It cannot open, close, or estimate positions.",
    }
  );

  server.registerTool(
    "list_assets",
    {
      title: "List assets",
      description: `List NODO yield products. GET /assets. ${ONLY_READS}`,
      inputSchema: listAssetsInput,
      annotations: READ_ONLY,
    },
    async (args) =>
      read(config, ["assets"], [
        ["chainId", args.chainId],
        ["limit", args.limit],
        ["offset", args.offset],
      ])
  );

  server.registerTool(
    "get_asset",
    {
      title: "Get asset",
      description: `Get one NODO yield product by id. GET /assets/{assetId}. ${ONLY_READS}`,
      inputSchema: getAssetInput,
      annotations: READ_ONLY,
    },
    async (args) => read(config, ["assets", args.assetId], [])
  );

  server.registerTool(
    "list_opportunities",
    {
      title: "List opportunities",
      description: `List leveraged yield opportunities. GET /opportunities. ${ONLY_READS}`,
      inputSchema: listOpportunitiesInput,
      annotations: READ_ONLY,
    },
    async (args) =>
      read(config, ["opportunities"], [
        ["targetLtvBps", args.targetLtvBps],
        ["rounds", args.rounds],
        ["network", args.network],
        ["search", args.search],
        ["accessRequirement", args.accessRequirement],
        ["protocolIds", args.protocolIds],
        ["debtToken", args.debtToken],
        ["category", args.category],
        ["yieldToken", args.yieldToken],
        ["borrowRateKind", args.borrowRateKind],
        ["minNetApy", args.minNetApy],
        ["maxNetApy", args.maxNetApy],
        ["sortBy", args.sortBy],
        ["sortDirection", args.sortDirection],
        ["limit", args.limit],
        ["offset", args.offset],
      ])
  );

  server.registerTool(
    "get_opportunity",
    {
      title: "Get opportunity",
      description: `Get one leveraged yield opportunity by id. GET /opportunities/{opportunityId}. ${ONLY_READS}`,
      inputSchema: getOpportunityInput,
      annotations: READ_ONLY,
    },
    async (args) => read(config, ["opportunities", args.opportunityId], [])
  );

  server.registerTool(
    "list_markets",
    {
      title: "List markets",
      description: `List lending markets that accept collateral. GET /markets. ${ONLY_READS}`,
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => read(config, ["markets"], [])
  );

  server.registerTool(
    "get_market_apy_history",
    {
      title: "Get market APY history",
      description: `Get yield and borrowing-rate history for one market. GET /markets/{protocol}/{marketId}/apy-history. ${ONLY_READS}`,
      inputSchema: getMarketApyHistoryInput,
      annotations: READ_ONLY,
    },
    async (args) =>
      read(config, ["markets", args.protocol, args.marketId, "apy-history"], [
        ["windowDays", args.windowDays],
        ["assetId", args.assetId],
        ["resolution", args.resolution],
        ["from", args.from],
        ["to", args.to],
        ["limit", args.limit],
        ["cursor", args.cursor],
      ])
  );

  return server;
}

async function read(
  config: NodoConfig,
  segments: readonly string[],
  query: readonly QueryEntry[]
) {
  try {
    const body = await nodoGet(config, segments, query);
    const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
    return {
      content: [{ type: "text" as const, text: redactSecret(text, config.apiSecret) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "NODO request failed";
    throw new Error(redactSecret(message, config.apiSecret));
  }
}
