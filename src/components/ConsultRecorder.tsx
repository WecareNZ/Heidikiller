import { useRef } from "react";
import { useStore } from "../state/store";
import { LiveTranscriber } from "../lib/transcriber";
import { generateDocuments } from "../lib/api";
import { NOTE_TEMPLATES } from "../config/templates";

export function ConsultRecorder() {
  const transcriberRef = useRef<LiveTranscriber | null>(null);
  const {
    status,
    setStatus,
    addFinal,
    setInterim,
    setError,
    resetConsult,
    setGenerating,
    setDocs,
    generating,
    transcriptText,
  } = useStore();

  const start = async () => {
    setError(null);
    const transcriber = new LiveTranscriber({
      onFinal: (text) => addFinal(text),
      onInterim: (text) => setInterim(text),
      onError: (msg) => setError(msg),
      onOpen: () => setStatus("recording"),
    });
    transcriberRef.current = transcriber;
    try {
      await transcriber.start();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the microphone.",
      );
      setStatus("idle");
    }
  };

  const stop = () => {
    transcriberRef.current?.stop();
    transcriberRef.current = null;
    setInterim("");
    setStatus("stopped");
  };

  const generate = async () => {
    const transcript = transcriptText();
    if (!transcript.trim()) {
      setError("There's no transcript yet to summarise.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const docs = await generateDocuments(transcript, NOTE_TEMPLATES[0].id);
      setDocs(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const isRecording = status === "recording";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!isRecording ? (
        <button
          onClick={start}
          className="inline-flex items-center gap-2 rounded-lg bg-clinical-600 px-4 py-2 font-medium text-white hover:bg-clinical-700"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white" />
          {status === "idle" ? "Start consultation" : "Resume"}
        </button>
      ) : (
        <button
          onClick={stop}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-sm bg-white" />
          Stop listening
        </button>
      )}

      <button
        onClick={generate}
        disabled={generating || isRecording}
        className="rounded-lg border border-clinical-600 px-4 py-2 font-medium text-clinical-700 hover:bg-clinical-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? "Drafting…" : "Generate note & referrals"}
      </button>

      <button
        onClick={resetConsult}
        disabled={isRecording || generating}
        className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40"
      >
        New patient
      </button>

      {isRecording && (
        <span className="ml-1 inline-flex items-center gap-2 text-sm text-red-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          Listening…
        </span>
      )}
    </div>
  );
}
