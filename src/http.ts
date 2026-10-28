import { assertWorkloadCredentials, redactSecret, type NodoConfig } from "./credentials.js";
import { signWorkloadAuthorization } from "./sign.js";

export type QueryEntry = readonly [string, string | number | undefined];

/**
 * Production reconstructs the signed path as `new URL(request.url).pathname +
 * new URL(request.url).search` (see organization-access route authentication).
 * The product API is mounted at `/api/v2`, so GET https://app.nodo.xyz/api/v2/assets?limit=1
 * is signed as `/api/v2/assets?limit=1`. The route suffix alone does not verify.
 */
export function buildRequestTarget(
  baseUrl: string,
  segments: readonly string[],
  query: readonly QueryEntry[]
): { href: string; signedPath: string } {
  const base = new URL(baseUrl);
  const prefix = base.pathname.replace(/\/+$/, "");
  const expectedPath = [prefix, ...segments.map(encodePathSegment)].join("/");
  const url = new URL(base.origin);
  url.pathname = expectedPath;
  if (url.pathname !== expectedPath) {
    throw new Error("path parameter cannot be encoded as a single path segment");
  }
  for (const [name, value] of query) {
    if (value === undefined) continue;
    url.searchParams.append(name, String(value));
  }
  const signedPath = url.pathname + url.search;
  const roundTrip = new URL(url.href);
  if (roundTrip.pathname + roundTrip.search !== signedPath) {
    throw new Error("signed path does not match the request URL");
  }
  return { href: url.href, signedPath };
}

export async function nodoGet(
  config: NodoConfig,
  segments: readonly string[],
  query: readonly QueryEntry[]
): Promise<unknown> {
  assertWorkloadCredentials(config.apiKey, config.apiSecret);
  const target = buildRequestTarget(config.baseUrl, segments, query);
  const authorization = signWorkloadAuthorization({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    method: "GET",
    path: target.signedPath,
  });
  const doFetch = config.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(target.href, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "application/json",
        authorization,
      },
    });
  } catch (error) {
    throw publicError(config.apiSecret, networkFailure(error), { status: null, code: null });
  }
  const body = redactSecret(await response.text(), config.apiSecret);
  if (response.status < 200 || response.status >= 300) {
    throw publicError(
      config.apiSecret,
      `NODO request failed with HTTP ${response.status}: ${body}`,
      { status: response.status, code: null }
    );
  }
  if (body === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return body;
  }
  const apiError = apiErrorMessage(parsed);
  if (apiError !== null) {
    const code = isRecord(parsed) && isRecord(parsed.error) ? String(parsed.error.code) : null;
    throw publicError(config.apiSecret, apiError, { status: response.status, code });
  }
  return parsed;
}

/** A failed read. `code` is the product error code, when the API sent one. */
export class NodoReadError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, failure: Readonly<{ status: number | null; code: string | null }>) {
    super(message);
    this.name = "NodoReadError";
    this.status = failure.status;
    this.code = failure.code;
  }
}

/**
 * Product v2 answers failed reads with HTTP 200 and `{ error: { code, message } }`.
 * A successful body is the resource itself, so only that exact envelope is a failure.
 */
export function apiErrorMessage(body: unknown): string | null {
  if (!isRecord(body) || Object.keys(body).some((key) => key !== "error")) {
    return null;
  }
  const error = body.error;
  if (
    !isRecord(error) ||
    typeof error.code !== "string" ||
    error.code === "" ||
    typeof error.message !== "string"
  ) {
    return null;
  }
  const details =
    error.details === undefined ? "" : ` ${JSON.stringify(error.details)}`;
  return `NODO API ${error.code}: ${error.message}${details}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function networkFailure(error: unknown): string {
  if (error instanceof Error) return `NODO request failed: ${error.message}`;
  return "NODO request failed";
}

function publicError(
  secret: string,
  message: string,
  failure: Readonly<{ status: number | null; code: string | null }>
): NodoReadError {
  return new NodoReadError(redactSecret(message, secret), failure);
}
