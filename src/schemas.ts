import * as z from "zod/v4";

const chainId = z
  .union([z.literal(1), z.literal(101)])
  .describe(
    "Return only products with a Token on chain 1 (Ethereum) or 101 (retained Solana data). Omit to include both. Each returned product still lists all its Tokens, and the filter does not mean execution is supported on that chain."
  )
  .optional();

const assetId = z
  .string()
  .min(1)
  .max(512)
  .describe(
    "ID of the yield product. Call list_assets first and copy the product id. Pass the raw id; this server encodes it as one path segment. Do not substitute the product name, ticker, token address, or market id."
  );

const opportunityId = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^opportunity-v2:[A-Za-z0-9:._-]+$/)
  .describe(
    "Opportunity ID copied unchanged from list_opportunities. Pass the raw id; this server encodes it as one path segment. Do not build an id yourself."
  );

const protocol = z
  .string()
  .min(1)
  .describe(
    "Lending venue ID from list_markets, taken from the same market as marketId. Pass the raw id; this server encodes it as one path segment."
  );

const marketId = z
  .string()
  .min(1)
  .describe(
    "The venue's own market ID from list_markets. Pass the raw id; this server URL-encodes it as one path segment. Do not use NODO's canonical JSON market key, and do not pre-encode the id."
  );

export const listAssetsInput = {
  chainId,
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe(
      "Maximum products in this page; defaults to 25 when omitted. For the next page, add the returned count to offset."
    )
    .optional(),
  offset: z
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .describe(
      "Number of matching products to skip; defaults to 0 when omitted. Reset it when changing the chain filter."
    )
    .optional(),
};

export const getAssetInput = { assetId };

export const listOpportunitiesInput = {
  targetLtvBps: z
    .string()
    .regex(/^(?:[1-9][0-9]{0,3}|10000)$/)
    .describe(
      "Loan-to-value per round used for projections, in basis points: 7500 = 75%. If omitted, each market's safe maximum is used. Must stay below that market's liquidation LTV."
    )
    .optional(),
  rounds: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      "Number of borrow-and-reinvest rounds for the achievable projection, an integer from 1 to 5. If omitted, each market's maximum open rounds are used."
    )
    .optional(),
  network: z
    .enum(["ethereum", "solana"])
    .describe(
      "Network filter. Only Ethereum opportunities are currently published; solana is kept and returns an empty list. Omit for all published networks."
    )
    .optional(),
  search: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "Case-insensitive word search across the yield product token name and symbol, the product name and ticker, the platform, the lending venue, the market id, and the debt token symbol. Every word must appear in at least one of those values. Omit for no text search."
    )
    .optional(),
  accessRequirement: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      "Purchase eligibility. permissionless means no published purchase restriction. allowlist-required means purchase is restricted to approved buyers. Comma-separated; matches any selected value. Omit for all."
    )
    .optional(),
  protocolIds: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      "Comma-separated lending venue IDs. Values include aave-v3, morpho-blue, aave-horizon, termmax-v1.0.9, termmax-v2.0.0, termmax-v2.0.1, euler-v2, and kamino-lend. Omit for all venues."
    )
    .optional(),
  debtToken: z
    .string()
    .regex(/^1:0x[0-9a-fA-F]{40}$/)
    .describe(
      "One exact borrowed token, written as chainId:address. Build it from the opportunity debt token chain id and address. Symbols belong in search, not this filter. Omit for all borrowed tokens."
    )
    .optional(),
  category: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      "Comma-separated, case-sensitive product category names. Examples include US Treasury Debt, Active Strategies, and Stablecoins. Omit for all categories."
    )
    .optional(),
  yieldToken: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      "Comma-separated, case-sensitive yield product token symbols, for example mAPOLLO. This filters by display symbol, not by token address or product id. Omit for all yield products."
    )
    .optional(),
  borrowRateKind: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      "Loan interest rate type. variable is a floating borrowing rate. fixed-to-maturity is fixed until the loan matures. Comma-separated; matches any selected value. Omit for both."
    )
    .optional(),
  minNetApy: z
    .string()
    .regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
    .describe(
      "Inclusive minimum projected Net APY as a decimal: 0.05 = 5%, -0.02 = -2%. Opportunities without a projection never match. Omit for no minimum."
    )
    .optional(),
  maxNetApy: z
    .string()
    .regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
    .describe(
      "Inclusive maximum projected Net APY as a decimal: 0.05 = 5%. Use 0 for Net APY at or below zero. Opportunities without a projection never match. Omit for no maximum."
    )
    .optional(),
  sortBy: z
    .enum([
      "yield-token",
      "chain",
      "protocol",
      "rate-type",
      "net-apy",
      "net-apy-at-target-util",
      "deployable-net-apy",
      "deployable",
      "available-liquidity",
      "borrow-apy",
      "base-yield-apy",
      "liquidation-ltv",
      "max-leverage",
      "maturity",
    ])
    .describe(
      "Sort column. The default when omitted, deployable-net-apy, ranks rows that can be entered at size above higher-yielding rows that cannot. Unavailable values sort last."
    )
    .optional(),
  sortDirection: z
    .enum(["asc", "desc"])
    .describe(
      "asc is ascending and desc is descending. When omitted, the API default depends on the sort column."
    )
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Maximum opportunities in this page. Omit to use the API default.")
    .optional(),
  offset: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .describe("Number of matching opportunities to skip. Omit to start at the first row.")
    .optional(),
};

export const getOpportunityInput = { opportunityId };

export const getMarketApyHistoryInput = {
  protocol,
  marketId,
  windowDays: z
    .union([z.literal(7), z.literal(30)])
    .describe(
      "Length of the trailing window used to calculate each APY point, in days. Defaults to 30 when omitted. Repeat it on cursor requests."
    )
    .optional(),
  assetId: z
    .string()
    .min(1)
    .max(512)
    .describe(
      "Product ID for the selected market. Omit only when the current Ethereum market maps to exactly one product."
    )
    .optional(),
  resolution: z
    .enum(["hour", "day"])
    .describe(
      "Time bucket in UTC. Defaults to day when omitted. When continuing with a cursor, reuse its resolution."
    )
    .optional(),
  from: z
    .string()
    .min(1)
    .describe(
      "Start of the range, inclusive, as an RFC 3339 date-time with timezone, for example 2026-09-01T00:00:00.000Z. Send a timestamp, not a date-only value or a Unix number. If omitted, the latest 30 UTC dates are used."
    )
    .optional(),
  to: z
    .string()
    .min(1)
    .describe(
      "End of the range, inclusive, as an RFC 3339 date-time with timezone. Must be at or after from and not later than now. If omitted, the API uses the latest completed day or hour boundary."
    )
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe(
      "Maximum number of UTC time buckets in this page. Defaults to 168 when omitted."
    )
    .optional(),
  cursor: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      "Opaque continuation from a previous history response. Omit for the first page, then reuse the same protocol, marketId, assetId, from, to, windowDays, and resolution."
    )
    .optional(),
};
