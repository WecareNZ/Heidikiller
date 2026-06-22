import { createClient } from "@supabase/supabase-js";

/**
 * Server-side referral-protocol lookup. Fetches your real (licensed)
 * HealthPathways / WeCare protocols from Supabase so the content NEVER reaches
 * the browser. Falls back to whatever the client passed (the public synthetic
 * set) when Supabase isn't configured.
 */

export interface Protocol {
  title: string;
  source: string;
  region?: string;
  whenToRefer: string;
  requiredWorkup: string;
  redFlags?: string;
  referralMustInclude: string;
  destination: string;
}

interface ProtocolRow {
  title: string;
  source: string;
  region: string | null;
  triggers: string[] | null;
  when_to_refer: string;
  required_workup: string;
  red_flags: string | null;
  referral_must_include: string;
  destination: string;
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = url && key ? createClient(url, key) : null;

/**
 * Returns protocols whose triggers match the consultation facts, or `null` if
 * Supabase isn't configured (so the caller can use its fallback).
 */
export async function fetchMatchingProtocols(
  factsText: string,
): Promise<Protocol[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("referral_protocols")
    .select(
      "title, source, region, triggers, when_to_refer, required_workup, red_flags, referral_must_include, destination",
    );
  if (error || !data) return [];

  const haystack = factsText.toLowerCase();
  return (data as ProtocolRow[])
    .filter((r) =>
      (r.triggers ?? []).some((t) => haystack.includes(t.toLowerCase())),
    )
    .slice(0, 6)
    .map((r) => ({
      title: r.title,
      source: r.source,
      region: r.region ?? undefined,
      whenToRefer: r.when_to_refer,
      requiredWorkup: r.required_workup,
      redFlags: r.red_flags ?? undefined,
      referralMustInclude: r.referral_must_include,
      destination: r.destination,
    }));
}
