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
