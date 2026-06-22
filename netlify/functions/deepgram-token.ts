import { createClient } from "@deepgram/sdk";

/**
 * Mints a short-lived Deepgram token so the browser can open a live
 * transcription socket WITHOUT ever seeing the long-lived DEEPGRAM_API_KEY.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return json({ error: "DEEPGRAM_API_KEY is not configured on the server." }, 500);
  }

  try {
    const dg = createClient(apiKey);
    // Grant a temporary token (default ~30s TTL) scoped to listen access.
    // The browser uses it to authenticate the live WebSocket, then it expires.
    const { result, error } = await dg.auth.grantToken();
    if (error || !result?.access_token) {
      return json({ error: error?.message ?? "Failed to grant token." }, 502);
    }
    return json({ token: result.access_token, expiresIn: result.expires_in });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return json({ error: message }, 502);
  }
};
