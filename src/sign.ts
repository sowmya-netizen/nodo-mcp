// Authorization: `Bearer v2,<apiKey>,<expiredAt>,<sig>`
// `sig` is Ed25519 (PKCS#8 DER private key) over this UTF-8 text, joined by "\n":
//   nodo-workload-v2
//   apiKey
//   expiredAt          unix seconds, now + 30
//   METHOD
//   pathname + search  the fetched URL, so `/api/v2/...`, not the route suffix
//   sha256 hex         of the body; these calls are GETs, so the body is empty
// The secret is base64url after the prefix `nodo_ed25519_sk_`. It signs. It is not sent.
import { createHash, createPrivateKey, sign } from "node:crypto";
import {
  WORKLOAD_API_SECRET_PREFIX,
  assertWorkloadCredentials,
} from "./credentials.js";

export const WORKLOAD_SIGNATURE_LIFETIME_SECONDS = 30;

export function signWorkloadAuthorization(
  input: Readonly<{
    apiKey: string;
    apiSecret: string;
    method: string;
    path: string;
    body?: Uint8Array | string;
    nowUnixSeconds?: number;
  }>
): string {
  assertWorkloadCredentials(input.apiKey, input.apiSecret);
  const now = input.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(now)) {
    throw new Error("expiration is malformed");
  }
  const expiredAt = now + WORKLOAD_SIGNATURE_LIFETIME_SECONDS;
  const body = input.body ?? "";
  const bodySha256 = createHash("sha256").update(body).digest("hex");
  const text = [
    "nodo-workload-v2",
    input.apiKey,
    String(expiredAt),
    input.method.toUpperCase(),
    input.path,
    bodySha256,
  ].join("\n");
  const der = Buffer.from(
    input.apiSecret.slice(WORKLOAD_API_SECRET_PREFIX.length),
    "base64url"
  );
  let signature: Buffer;
  try {
    const privateKey = createPrivateKey({
      key: der,
      format: "der",
      type: "pkcs8",
    });
    signature = sign(null, Buffer.from(text), privateKey);
  } catch {
    throw new Error("NODO_API_SECRET is malformed");
  }
  return `Bearer v2,${input.apiKey},${expiredAt},${Buffer.from(signature).toString("base64url")}`;
}
