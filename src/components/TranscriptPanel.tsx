import { useEffect, useRef } from "react";
import { useStore } from "../state/store";

export function TranscriptPanel() {
  const { finalLines, interim, status } = useStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [finalLines.length, interim]);

  const empty = finalLines.length === 0 && !interim;

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Live transcript
      </h2>
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-[15px] leading-relaxed text-gray-800">
        {empty ? (
          <p className="text-gray-400">
            {status === "recording"
              ? "Listening… speech will appear here."
              : "Press “Start consultation” and speak — the transcript appears here in real time."}
          </p>
        ) : (
          <p className="whitespace-pre-wrap">
            {finalLines.join(" ")}{" "}
            {interim && <span className="text-gray-400">{interim}</span>}
          </p>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
