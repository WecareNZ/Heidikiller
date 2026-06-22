import type { ReferralProtocol } from "../config/protocols";

/**
 * Client for the protocol admin function. The admin token is sent as a header
 * and held only in the browser session (never committed).
 */

async function call<T>(
  token: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("/.netlify/functions/protocols", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

export function listProtocols(token: string): Promise<{ protocols: ReferralProtocol[] }> {
  return call(token, { op: "list" });
}

export function upsertProtocol(
  token: string,
  protocol: ReferralProtocol,
): Promise<{ ok: true }> {
  return call(token, { op: "upsert", protocol });
}

export function deleteProtocol(token: string, id: string): Promise<{ ok: true }> {
  return call(token, { op: "delete", id });
}
