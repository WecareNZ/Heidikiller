import { ConsultRecorder } from "./components/ConsultRecorder";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { NoteView } from "./components/NoteView";
import { ReferralView } from "./components/ReferralView";
import { ChatPanel } from "./components/ChatPanel";
import { useStore } from "./state/store";

export default function App() {
  const { error, setError } = useStore();

  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-clinical-700">Heidikiller</h1>
            <p className="text-xs text-gray-500">
              AI scribe — listens, drafts your note &amp; referrals, answers
              clinical questions
            </p>
          </div>
          <ConsultRecorder />
        </div>
        {error && (
          <div className="mt-3 flex items-start justify-between gap-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-medium">
              Dismiss
            </button>
          </div>
        )}
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-12">
        <section className="flex min-h-0 flex-col lg:col-span-4">
          <TranscriptPanel />
        </section>

        <section className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-5">
          <div className="min-h-[18rem] flex-1">
            <NoteView />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Referrals
            </h2>
            <ReferralView />
          </div>
        </section>

        <section className="flex min-h-0 flex-col lg:col-span-3">
          <ChatPanel />
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-2 text-center text-xs text-gray-400">
        Drafts are for clinician review only — verify everything before signing.
        Handle patient data per your practice's privacy obligations.
      </footer>
    </div>
  );
}
