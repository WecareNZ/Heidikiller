import { createClient } from "@supabase/supabase-js";

/**
 * Admin CRUD for referral protocols. Uses the Supabase service role key
 * (server-only) and is gated by a shared ADMIN_TOKEN sent as `x-admin-token`.
 * This is lightweight gating for an internal tool — replace with proper auth
 * (Supabase Auth / SSO) before production use.
 *
 * Body: { op: "list" } | { op: "upsert", protocol } | { op: "delete", id }
 */

interface ProtocolInput {
  id: string;
  title: string;
  source: string;
  region?: string;
  triggers: string[];
  whenToRefer: string;
  requiredWorkup: string;
  redFlags?: string;
  referralMustInclude: string;
  destination: string;
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminToken = process.env.ADMIN_TOKEN;
const supabase = url && key ? createClient(url, key) : null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const toRow = (p: ProtocolInput) => ({
  id: p.id,
  title: p.title,
  source: p.source,
  region: p.region ?? null,
  triggers: p.triggers,
  when_to_refer: p.whenToRefer,
  required_workup: p.requiredWorkup,
  red_flags: p.redFlags ?? null,
  referral_must_include: p.referralMustInclude,
  destination: p.destination,
});

const fromRow = (r: Record<string, unknown>): ProtocolInput => ({
  id: r.id as string,
  title: r.title as string,
  source: r.source as string,
  region: (r.region as string) ?? undefined,
  triggers: (r.triggers as string[]) ?? [],
  whenToRefer: r.when_to_refer as string,
  requiredWorkup: r.required_workup as string,
  redFlags: (r.red_flags as string) ?? undefined,
  referralMustInclude: r.referral_must_include as string,
  destination: r.destination as string,
});

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!supabase) {
    return json({ error: "Supabase is not configured on the server." }, 503);
  }
  if (!adminToken) {
    return json({ error: "ADMIN_TOKEN is not configured on the server." }, 503);
  }
  if (req.headers.get("x-admin-token") !== adminToken) {
    return json({ error: "Unauthorized." }, 401);
  }

  let body: { op: string; protocol?: ProtocolInput; id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  try {
    if (body.op === "list") {
      const { data, error } = await supabase
        .from("referral_protocols")
        .select("*")
        .order("title");
      if (error) throw new Error(error.message);
      return json({ protocols: (data ?? []).map(fromRow) });
    }

    if (body.op === "upsert") {
      const p = body.protocol;
      if (!p?.id?.trim() || !p.title?.trim()) {
        return json({ error: "id and title are required." }, 400);
      }
      const { error } = await supabase
        .from("referral_protocols")
        .upsert(toRow(p));
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (body.op === "delete") {
      if (!body.id) return json({ error: "id is required." }, 400);
      const { error } = await supabase
        .from("referral_protocols")
        .delete()
        .eq("id", body.id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "Unknown op." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return json({ error: message }, 502);
  }
};
