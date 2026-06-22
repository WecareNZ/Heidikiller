# Heidikiller

An AI medical scribe. During a consultation it:

1. **Listens** and transcribes in real time (Deepgram, medical-tuned model).
2. **Drafts the patient note and any referral letters** in _your_ format
   (Claude Opus 4.8).
3. **Answers clinical questions live** via a side chatbot — drug doses,
   guideline thresholds, differentials — while you keep talking to the patient.

> ⚠️ Every output is a **draft for a qualified clinician to review and sign**.
> It is not medical advice and must be verified. Handle patient data per your
> practice's privacy obligations (e.g. NZ Privacy Act / Health Information
> Privacy Code).

## Stage 1 (this MVP)

- Browser web app (Chrome/Edge recommended for microphone support).
- Live transcript → generate note + referrals → editable, copyable output.
- Clinical Q&A chatbot with consultation context.

## Architecture

```
Browser (React + Vite)
  │  mic audio ───────────────► Deepgram live STT  (token minted server-side)
  │  transcript + your formats ─► /.netlify/functions/claude ─► Anthropic API
  │  clinical questions ────────► /.netlify/functions/claude (streamed)
  └─ API keys never touch the browser; both live in serverless functions.
```

- **Frontend:** `src/` — React, Tailwind, Zustand.
- **Backend:** `netlify/functions/` — `claude.ts` (note/referral generation +
  chat) and `deepgram-token.ts` (short-lived STT token).
- **Your formats:** `src/config/templates.ts` — edit the note and referral
  structures here; the generated documents follow them.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Add your API keys**

   ```bash
   cp .env.example .env
   # then edit .env and fill in:
   #   ANTHROPIC_API_KEY   (https://console.anthropic.com/settings/keys)
   #   DEEPGRAM_API_KEY    (https://console.deepgram.com/)
   ```

3. **Run locally** (requires the Netlify CLI so the serverless functions run)

   ```bash
   npm install -g netlify-cli   # one-time
   netlify dev
   ```

   Open the URL it prints (default http://localhost:8888). Use Chrome or Edge
   and allow microphone access.

   > Running plain `npm run dev:vite` serves the UI but the `/.netlify/...`
   > functions won't be available — use `netlify dev` for the full app.

## Customising your note / referral format

Open `src/config/templates.ts`:

- `NOTE_TEMPLATES` — the headings and order your note should use. Paste a real
  (de-identified) example and the model will mirror it.
- `REFERRAL_TEMPLATES` — one entry per referral type, with `when` it applies and
  its letter `format`.
- `CLINICAL_INSTRUCTIONS` — global rules (no invented findings, NZ spelling…).

## Referral protocols (HealthPathways / WeCare)

Referrals are grounded in your protocol criteria, not the model's memory. Source
text lives in **Supabase** (server-side only — licensed content never reaches the
browser). Until Supabase is configured, the app falls back to the synthetic
placeholders in `src/config/protocols.ts`.

To enable the real store:

1. Apply the migration to your Supabase project (creates `referral_protocols`,
   RLS locked to server-only reads):

   ```bash
   # via the Supabase SQL editor, paste supabase/migrations/0001_referral_protocols.sql
   # or with the Supabase CLI:
   supabase db push
   ```

2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_TOKEN` in `.env`
   (local) and in the Netlify site's environment variables (deploy).

3. Open the app → **Protocols** tab → enter your `ADMIN_TOKEN` → add/edit
   protocols (when-to-refer, required workup, red flags, must-include,
   destination, and trigger keywords for matching).

> The admin token is lightweight gating for an internal tool. Replace with real
> auth (Supabase Auth / SSO) before production use.

## Deploying

```bash
netlify deploy --build --prod
```

Set `ANTHROPIC_API_KEY` and `DEEPGRAM_API_KEY` in the Netlify site's
environment variables (Site settings → Environment variables).

## Roadmap (beyond Stage 1)

- Patient/visit records & history (Supabase).
- Speaker separation (clinician vs patient).
- Custom template management in the UI (no code edits).
- Export to PMS / direct referral sending.
- Authentication and audit logging.
