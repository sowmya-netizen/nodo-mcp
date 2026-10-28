import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodoConfig } from "./credentials.js";
import { redactSecret } from "./credentials.js";
import { NodoReadError, nodoGet, type QueryEntry } from "./http.js";
import { presentRead, type MarketFilter, type MarketPage, type ReadKind } from "./present.js";
import {
  getAssetInput,
  getMarketApyHistoryInput,
  getOpportunityInput,
  listAssetsInput,
  listMarketsInput,
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
    { name: "nodo", version: "0.4.0" },
    {
      instructions:
        "This server only reads NODO assets, opportunities, and markets. It cannot open, close, or estimate positions. List tools return one compact row per record and a next offset when another page exists. Copy assetId into get_asset and opportunityId into get_opportunity. Copy protocolId and marketId into get_market_apy_history. A failed read is a tool error, including when the API returns HTTP 200 with an error code. Units: APY and rate fields are decimals, so 0.05 is 5%. Fields ending in Bps are basis points, so 8600 is 86%. Token amounts are whole tokens with the token named.",
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
      description: `Read one yield product: identity, terms, APY, and TVL. Does not include purchase or redemption routes. ${ONLY_READS}`,
      inputSchema: getAssetInput,
      annotations: READ_ONLY,
    },
    async (args) => read(config, ["assets", args.assetId], [], "get_asset")
  );

  server.registerTool(
    "list_opportunities",
    {
      title: "List opportunities",
      description: `List leveraged yield opportunities. Each row includes the close-out LTV, how much can still be borrowed, and the yield left after interest. capacity.beforeTargetUtilization is what can be entered before the borrow rate turns steep; capacity.toMaximum is the hard limit. When projectionStatus is not available, projectionReason says why. Defaults to ${LIST_PAGE} rows when limit is omitted. Copy opportunityId into get_opportunity. ${ONLY_READS}`,
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
      description: `Read one leveraged opportunity: venue, collateral, debt, base yield, net APY, and leverage. Does not include acquisition routes. ${ONLY_READS}`,
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
      description: `List lending markets that accept collateral. One read returns the full list; network, protocolId, collateral, debt, limit, and offset are applied here. Defaults to ${LIST_PAGE} rows. Pass nextOffset with the same filters for the next page. Copy protocolId and marketId into get_market_apy_history. ${ONLY_READS}`,
      inputSchema: listMarketsInput,
      annotations: READ_ONLY,
    },
    async (args) =>
      read(config, ["markets"], [], "list_markets", {
        marketFilter: {
          network: args.network,
          protocolId: args.protocolId,
          collateral: args.collateral,
          debt: args.debt,
        },
        marketPage: { limit: args.limit ?? LIST_PAGE, offset: args.offset ?? 0 },
      })
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

  server.registerPrompt(
    "find-yield",
    {
      title: "Find a yield-bearing asset or a loan against it",
      description:
        "Read what an asset pays, and the yield left after interest. This prompt only reads.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Use the nodo tools to read the live list. Do not invent rows, ids, yields, or rates.",
              "Call list_assets or list_opportunities first. Copy assetId into get_asset and opportunityId into get_opportunity.",
              "Report name, ticker, issuer, yield, size, collateral, borrowed asset, yield left after interest, and asOfTime when it is present.",
              "Do not size, open, or prepare a loan. Purchase, redemption, and acquisition steps are not in these results.",
            ].join(" "),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "read-market",
    {
      title: "Read a lending market and its rate history",
      description:
        "Read which market accepts an asset as collateral, when a loan would be closed out, and the rate history. This prompt only reads.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Use the nodo tools to read lending markets. Do not invent pools or rates.",
              "Call list_markets. Keep protocolId and marketId together, then call get_market_apy_history with that pair.",
              "If nextCursor is set, call again with that cursor and the same protocol, market, asset, window, and resolution.",
              "Report the level where the collateral is sold, the borrow rate, and the window. Do not turn the market into a loan.",
            ].join(" "),
          },
        },
      ],
    })
  );

  return server;
}

function structuredObject(text: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function read(
  config: NodoConfig,
  segments: readonly string[],
  query: readonly QueryEntry[],
  kind: ReadKind,
  options: Readonly<{ marketFilter?: MarketFilter; marketPage?: MarketPage }> = {}
) {
  try {
    const body = await nodoGet(config, segments, query);
    const text = redactSecret(
      typeof body === "string" ? body : presentRead(kind, body, options),
      config.apiSecret
    );
    const structuredContent = structuredObject(text);
    return {
      content: [{ type: "text" as const, text }],
      ...(structuredContent ? { structuredContent } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "NODO request failed";
    const hint = recovery(kind, error);
    throw new Error(redactSecret(hint ? `${message}\n${hint}` : message, config.apiSecret));
  }
}

const SOURCE: Readonly<Partial<Record<ReadKind, string>>> = {
  get_asset: "Call list_assets and copy assetId unchanged.",
  get_opportunity: "Call list_opportunities and copy opportunityId unchanged.",
  get_market_apy_history:
    "Call list_markets and copy protocolId and marketId from the same row. Pass assetId when that market maps to more than one product.",
};

/** One line for the caller: whether retrying helps, and what to call instead. */
export function recovery(kind: ReadKind, error: unknown): string | null {
  if (!(error instanceof NodoReadError)) return null;
  switch (error.code) {
    case "not_found":
      return `Do not retry with the same id. ${SOURCE[kind] ?? "List again and copy the id unchanged."}`;
    case "invalid_input":
      return `Do not retry unchanged. Check the arguments against this tool's input schema. ${SOURCE[kind] ?? ""}`.trim();
    case "auth_invalid":
    case "unauthorized":
      return "Retrying will not help. NODO_API_KEY or NODO_API_SECRET is wrong, revoked, or from another environment.";
    case "permission_insufficient":
    case "organization_suspended":
      return "Retrying will not help. This key cannot read; it needs the common.read permission.";
    case "rate_limited":
      return "Wait before retrying. Do not loop on this call.";
    case "dependency_unavailable":
    case "not_ready":
      return "The data is not available yet. Try once later. Do not fill in figures yourself.";
  }
  if (error.code === null && error.status !== null && error.status >= 300 && error.status < 400) {
    return "Retrying will not help. NODO_API_BASE_URL answers with a redirect; set it to the API URL itself.";
  }
  if (error.code === null && (error.status === 401 || error.status === 403)) {
    return "Retrying will not help. NODO_API_KEY or NODO_API_SECRET was refused.";
  }
  if (error.code === null && (error.status === null || error.status >= 500)) {
    return "Try once more. If it fails again, report that the read failed. Do not fill in figures yourself.";
  }
  return null;
}
