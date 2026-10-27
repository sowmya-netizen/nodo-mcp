export type ReadKind =
  | "list_assets"
  | "get_asset"
  | "list_opportunities"
  | "get_opportunity"
  | "list_markets"
  | "get_market_apy_history";

type Json = Record<string, unknown>;

export type MarketFilter = Readonly<{
  network?: string;
  protocolId?: string;
  collateral?: string;
  debt?: string;
}>;

/** Turn an API body into the text a tool returns. Lists are one row per record. */
export function presentRead(
  kind: ReadKind,
  body: unknown,
  options: Readonly<{ marketFilter?: MarketFilter }> = {}
): string {
  const data = envelope(body);
  switch (kind) {
    case "list_assets":
      return presentList(kind, data, "assets", projectAsset, "get_asset", "assetId");
    case "list_opportunities":
      return presentList(
        kind,
        data,
        "opportunities",
        projectOpportunity,
        "get_opportunity",
        "opportunityId"
      );
    case "list_markets":
      return presentMarkets(data, options.marketFilter);
    case "get_market_apy_history":
      return presentHistory(data, body);
    case "get_asset":
      return data ? pretty(projectAssetDetail(data)) : unrecognized(kind, null);
    case "get_opportunity":
      return data ? pretty(projectOpportunityDetail(data)) : unrecognized(kind, null);
  }
}

function presentList(
  kind: ReadKind,
  data: Json | null,
  field: string,
  project: (row: Json) => Json,
  detailTool: string | null,
  detailArgument: string | null
): string {
  const rows = data ? asArray(data[field]) : null;
  if (!data || !rows) return unrecognized(kind, data);
  const items = rows.map((row) => project(row));
  const page = pageFrom(data, items.length);
  const next =
    page.nextOffset === null
      ? null
      : `Call ${kind} again with offset ${page.nextOffset}.`;
  const detail =
    detailTool && detailArgument
      ? `Copy ${detailArgument} into ${detailTool}.`
      : "Copy protocolId and marketId into get_market_apy_history.";
  return pretty({
    read: kind,
    asOfTime: data.asOfTime ?? null,
    page,
    next,
    detail,
    [field]: items,
  });
}

function presentMarkets(data: Json | null, filter: MarketFilter | undefined): string {
  const rows = data ? asArray(data.markets) : null;
  if (!data || !rows) return unrecognized("list_markets", data);
  const active = activeFilter(filter);
  const selected = active ? rows.filter((row) => marketMatches(row, active)) : rows;
  const items = selected.map((row) => projectMarket(row));
  const page = active
    ? {
        returned: items.length,
        offset: 0,
        limit: null,
        matched: items.length,
        total: rows.length,
        nextOffset: null,
      }
    : pageFrom(data, items.length);
  return pretty({
    read: "list_markets",
    asOfTime: data.asOfTime ?? null,
    page,
    next: null,
    detail: active
      ? "Filters run on the full market list after one read. They are not API query parameters. Copy protocolId and marketId into get_market_apy_history."
      : "Copy protocolId and marketId into get_market_apy_history.",
    markets: items,
  });
}

function presentHistory(data: Json | null, body: unknown): string {
  if (!data || !Array.isArray(data.points)) return unrecognized("get_market_apy_history", data ?? record(body));
  const points = data.points.map((point) => {
    const row = record(point);
    if (!row) return point;
    return {
      timestamp: row.timestamp ?? null,
      resolution: row.resolution ?? null,
      yieldApy: row.yieldApy ?? null,
      borrowApy: row.borrowApy ?? null,
      estimatedApy: row.estimatedApy ?? null,
    };
  });
  const nextCursor = typeof data.nextCursor === "string" ? data.nextCursor : null;
  return pretty({
    read: "get_market_apy_history",
    windowStart: data.windowStart ?? null,
    windowEnd: data.windowEnd ?? null,
    borrowSummary: data.borrowSummary ?? null,
    pointCount: points.length,
    nextCursor,
    next: nextCursor
      ? "Call get_market_apy_history again with this cursor and the same protocol, marketId, assetId, from, to, windowDays, and resolution."
      : null,
    points,
  });
}

function projectAsset(row: Json): Json {
  const display = record(row.display);
  const platform = record(row.platform);
  const economics = record(row.economics);
  const tokens = asArray(row.tokens) ?? [];
  return {
    assetId: row.id ?? null,
    name: display?.name ?? null,
    ticker: display?.ticker ?? null,
    platform: platform?.name ?? null,
    symbols: tokens.map((token) => record(token)?.symbol ?? null).filter(Boolean),
    tvlUsd: row.tvlUsd ?? null,
    apy: economics?.apy ?? null,
  };
}

function projectOpportunity(row: Json): Json {
  const asset = record(row.asset);
  const display = record(asset?.display);
  const platform = record(asset?.platform);
  const market = record(row.borrowMarket);
  const rate = record(market?.rate);
  const projection = record(row.projection);
  const projected = record(projection?.value);
  const netApy = record(record(projected?.netApy)?.selected);
  const leverage = record(projected?.leverage);
  const collateral = record(market?.collateralToken);
  const debt = record(market?.debtToken);
  return {
    opportunityId: row.id ?? null,
    assetId: asset?.id ?? null,
    name: display?.name ?? null,
    ticker: display?.ticker ?? null,
    platform: platform?.name ?? null,
    network: market?.network ?? null,
    protocolId: market?.protocolId ?? null,
    marketId: market?.nativeId ?? null,
    collateral: collateral?.symbol ?? null,
    debt: debt?.symbol ?? null,
    accessRequirement: row.accessRequirement ?? null,
    safeMaximumLtvBps: row.safeMaximumLtvBps ?? null,
    maximumOpenRounds: row.maximumOpenRounds ?? null,
    rateKind: rate?.kind ?? null,
    baseYieldApy: compactYield(row.baseYieldApy),
    projectionStatus: projection?.status ?? null,
    netApy: netApy?.current ?? null,
    leverage: leverage?.selected ?? null,
  };
}

function projectAssetDetail(row: Json): Json {
  const summary = projectAsset(row);
  const terms = record(row.terms);
  const economics = record(row.economics);
  return {
    read: "get_asset",
    ...summary,
    terms: terms
      ? {
          access: terms.access ?? null,
          isInvestable: terms.isInvestable ?? null,
          openEnded: terms.openEnded ?? null,
          maturesAt: terms.maturesAt ?? null,
          lockupPeriodMonths: terms.lockupPeriodMonths ?? null,
          holderRightToRedeem: terms.holderRightToRedeem ?? null,
        }
      : null,
    economics: economics
      ? {
          navUsd: economics.navUsd ?? null,
          priceUsd: economics.priceUsd ?? null,
          apy: economics.apy ?? null,
          apy30d: economics.apy30d ?? null,
          updatedAt: economics.updatedAt ?? null,
          freshness: economics.freshness ?? null,
        }
      : null,
    omitted:
      "Purchase, redemption, and acquisition routes are left out. This server cannot submit them.",
  };
}

function projectOpportunityDetail(row: Json): Json {
  return {
    read: "get_opportunity",
    ...projectOpportunity(row),
    assembledAt: row.assembledAt ?? null,
    omitted:
      "Acquisition routes are left out. This server cannot open, close, or estimate a position.",
  };
}

function projectMarket(row: Json): Json {
  const market = record(row.market);
  const definition = record(market?.definition);
  const id = record(definition?.id);
  const economics = record(market?.economics);
  const rate = record(economics?.rate);
  const collateral = record(definition?.collateralToken);
  const debt = record(definition?.debtToken);
  return {
    network: row.network ?? null,
    protocolId: id?.protocolId ?? null,
    marketId: id?.nativeId ?? null,
    collateral: collateral?.symbol ?? null,
    debt: debt?.symbol ?? null,
    liquidationLtvBps: definition?.liquidationLtvBps ?? null,
    maxLtvBps: definition?.marketMaximumLtvBps ?? null,
    rateKind: rate?.kind ?? null,
    annualizedRate: rate?.annualizedRate ?? null,
    executionAvailable: row.executionAvailable ?? null,
  };
}

function marketMatches(row: Json, filter: MarketFilter): boolean {
  const market = projectMarket(row);
  if (filter.network && !sameText(market.network, filter.network)) return false;
  if (filter.protocolId && !sameText(market.protocolId, filter.protocolId)) return false;
  if (filter.collateral && !sameText(market.collateral, filter.collateral)) return false;
  if (filter.debt && !sameText(market.debt, filter.debt)) return false;
  return true;
}

function activeFilter(filter: MarketFilter | undefined): MarketFilter | null {
  if (!filter) return null;
  const network = blankToUndefined(filter.network);
  const protocolId = blankToUndefined(filter.protocolId);
  const collateral = blankToUndefined(filter.collateral);
  const debt = blankToUndefined(filter.debt);
  if (!network && !protocolId && !collateral && !debt) return null;
  return { network, protocolId, collateral, debt };
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sameText(value: unknown, expected: string): boolean {
  return typeof value === "string" && value.toLowerCase() === expected.toLowerCase();
}

function compactYield(value: unknown): unknown {
  if (typeof value === "string" || typeof value === "number") return value;
  const row = record(value);
  if (!row) return null;
  return {
    status: row.status ?? null,
    current: row.current ?? row.value ?? null,
    basis: row.basis ?? null,
  };
}

function pageFrom(data: Json, returned: number): Json {
  const counts = record(data.counts);
  const query = record(data.query);
  const offset = numberValue(query?.offset) ?? 0;
  const matched = numberValue(counts?.matched) ?? numberValue(counts?.total);
  const nextOffset =
    matched !== null && offset + returned < matched ? offset + returned : null;
  return {
    returned,
    offset,
    limit: numberValue(query?.limit),
    matched,
    total: numberValue(counts?.total),
    nextOffset,
  };
}

function unrecognized(kind: ReadKind, data: Json | null): string {
  return pretty({
    read: kind,
    note: "The API body did not match the expected page, so the full body follows.",
    body: data,
  });
}

function envelope(body: unknown): Json | null {
  const root = record(body);
  if (!root) return null;
  return record(root.data) ?? root;
}

function record(value: unknown): Json | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Json;
  }
  return null;
}

function asArray(value: unknown): Json[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((item) => record(item) ?? {});
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
