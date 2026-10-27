import { createPrivateKey } from "node:crypto";

const API_KEY_PATTERN =
  /^nodo_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const API_SECRET_PATTERN = /^nodo_ed25519_sk_[A-Za-z0-9_-]{64}$/;
export const WORKLOAD_API_SECRET_PREFIX = "nodo_ed25519_sk_";
export const DEFAULT_API_BASE_URL = "https://app.nodo.xyz/api/v2";

export type NodoConfig = Readonly<{
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  fetchImpl?: typeof fetch;
}>;

export function redactSecret(message: string, secret: string | undefined): string {
  if (!secret) return message;
  return message.split(secret).join("[redacted]");
}

export function assertWorkloadCredentials(apiKey: string, apiSecret: string): void {
  if (!API_KEY_PATTERN.test(apiKey)) {
    throw new Error("NODO_API_KEY is malformed");
  }
  if (!isWellFormedSecret(apiSecret)) {
    throw new Error("NODO_API_SECRET is malformed");
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): NodoConfig {
  const apiKey = requiredEnv(env, "NODO_API_KEY");
  const apiSecret = requiredEnv(env, "NODO_API_SECRET");
  assertWorkloadCredentials(apiKey, apiSecret);
  return Object.freeze({
    baseUrl: parseBaseUrl(env.NODO_API_BASE_URL ?? DEFAULT_API_BASE_URL),
    apiKey,
    apiSecret,
  });
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is missing`);
  }
  return value.trim();
}

function parseBaseUrl(value: string): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("NODO_API_BASE_URL is malformed");
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("NODO_API_BASE_URL is malformed");
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname === "") {
    throw new Error("NODO_API_BASE_URL is malformed");
  }
  return `${url.origin}${pathname}`;
}

function isWellFormedSecret(apiSecret: string): boolean {
  if (!API_SECRET_PATTERN.test(apiSecret)) return false;
  const payload = apiSecret.slice(WORKLOAD_API_SECRET_PREFIX.length);
  const der = Buffer.from(payload, "base64url");
  if (der.byteLength !== 48 || der.toString("base64url") !== payload) return false;
  try {
    createPrivateKey({ key: der, format: "der", type: "pkcs8" });
    return true;
  } catch {
    return false;
  }
}
