import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodoConfig } from "./credentials.js";
import { redactSecret } from "./credentials.js";
import { nodoGet, type QueryEntry } from "./http.js";
import { presentRead, type ReadKind } from "./present.js";
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

const LIST_PAGE = 10;

const ONLY_READS =
  "Read-only. This server cannot open, close, or estimate positions.";

export function createNodoServer(config: NodoConfig): McpServer {
  const server = new McpServer(
    { name: "nodo", version: "0.2.0" },
    {
      instructions:
        "This server only reads NODO assets, opportunities, and markets. It cannot open, close, or estimate positions. List tools return one compact row per record and a next offset when another page exists. Copy assetId into get_asset and opportunityId into get_opportunity. Copy protocolId and marketId into get_market_apy_history. A failed read is a tool error, including when the API returns HTTP 200 with an error code.",
    }
  );

  server.registerTool(
    "list_assets",
    {
      title: "List assets",
      description: `List NODO yield products. Defaults to ${LIST_PAGE} rows when limit is omitted. Copy assetId into get_asset. ${ONLY_READS}`,
      inputSchema: listAssetsInput,
      annotations: READ_ONLY,
    },
    async (args) =>
      read(
        config,
        ["assets"],
        [
          ["chainId", args.chainId],
          ["limit", args.limit ?? LIST_PAGE],
          ["offset", args.offset],
        ],
        "list_assets"
      )
  );

  server.registerTool(
    "get_asset",
    {
      title: "Get asset",
      description: `Get one NODO yield product by id. GET /assets/{assetId}. ${ONLY_READS}`,
      inputSchema: getAssetInput,
      annotations: READ_ONLY,
    },
    async (args) => read(config, ["assets", args.assetId], [], "get_asset")
  );

  server.registerTool(
    "list_opportunities",
    {
      title: "List opportunities",
      description: `List leveraged yield opportunities. Defaults to ${LIST_PAGE} rows when limit is omitted. Copy opportunityId into get_opportunity. ${ONLY_READS}`,
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
        ["limit", args.limit ?? LIST_PAGE],
        ["offset", args.offset],
      ],
      "list_opportunities")
  );

  server.registerTool(
    "get_opportunity",
    {
      title: "Get opportunity",
      description: `Get one leveraged yield opportunity by id. GET /opportunities/{opportunityId}. ${ONLY_READS}`,
      inputSchema: getOpportunityInput,
      annotations: READ_ONLY,
    },
    async (args) =>
      read(config, ["opportunities", args.opportunityId], [], "get_opportunity")
  );

  server.registerTool(
    "list_markets",
    {
      title: "List markets",
      description: `List lending markets that accept collateral. Copy protocolId and marketId into get_market_apy_history. ${ONLY_READS}`,
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => read(config, ["markets"], [], "list_markets")
  );

  server.registerTool(
    "get_market_apy_history",
    {
      title: "Get market APY history",
      description: `Get yield and borrowing-rate history for one market. Uses protocolId and marketId from list_markets. When nextCursor is set, call again with that cursor. ${ONLY_READS}`,
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
      ],
      "get_market_apy_history")
  );

  return server;
}

async function read(
  config: NodoConfig,
  segments: readonly string[],
  query: readonly QueryEntry[],
  kind: ReadKind
) {
  try {
    const body = await nodoGet(config, segments, query);
    const text = typeof body === "string" ? body : presentRead(kind, body);
    return {
      content: [{ type: "text" as const, text: redactSecret(text, config.apiSecret) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "NODO request failed";
    throw new Error(redactSecret(message, config.apiSecret));
  }
}
