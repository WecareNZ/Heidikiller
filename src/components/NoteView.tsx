import { useState } from "react";
import { useStore } from "../state/store";

const STAGE_LABEL: Record<string, string> = {
  extracting: "Extracting clinical facts…",
  composing: "Drafting the note…",
  checking: "Checking against the transcript…",
};

export function NoteView() {
  const { docs, generating, genStage, updateNote } = useStore();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!docs) return;
    await navigator.clipboard.writeText(docs.note);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Patient note
        </h2>
        {docs && (
          <button
            onClick={copy}
            className="text-xs font-medium text-clinical-600 hover:text-clinical-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      {generating ? (
        <Placeholder
          text={(genStage && STAGE_LABEL[genStage]) ?? "Drafting your note…"}
          pulse
        />
      ) : docs ? (
        <textarea
          value={docs.note}
          onChange={(e) => updateNote(e.target.value)}
          spellCheck
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-white p-4 font-mono text-[13px] leading-relaxed text-gray-800 focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
        />
      ) : (
        <Placeholder text="Your formatted note will appear here. Review and edit before signing." />
      )}
    </div>
  );
}

function Placeholder({ text, pulse }: { text: string; pulse?: boolean }) {
  return (
    <div
      className={`flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 ${
        pulse ? "animate-pulse" : ""
      }`}
    >
      {text}
    </div>
  );
}
