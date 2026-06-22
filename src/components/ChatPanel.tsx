import { useState, useRef, useEffect } from "react";
import { useStore } from "../state/store";
import { askClinicalQuestion } from "../lib/api";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const {
    chat,
    chatBusy,
    pushChat,
    appendToLastChat,
    setChatBusy,
    transcriptText,
    setError,
  } = useStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const send = async () => {
    const question = input.trim();
    if (!question || chatBusy) return;
    setInput("");

    const history = chat.slice();
    pushChat({ role: "user", content: question });
    pushChat({ role: "assistant", content: "" });
    setChatBusy(true);

    try {
      await askClinicalQuestion(
        question,
        transcriptText(),
        history,
        (chunk) => appendToLastChat(chunk),
      );
    } catch (err) {
      appendToLastChat(
        `\n[error: ${err instanceof Error ? err.message : "failed"}]`,
      );
      setError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Clinical assistant
      </h2>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
        {chat.length === 0 && (
          <p className="text-sm text-gray-400">
            Ask anything mid-consult — drug doses, guideline thresholds,
            differentials. Answers are decision support, not a substitute for
            your judgement.
          </p>
        )}
        {chat.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-clinical-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {m.content || (chatBusy ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a clinical question…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
        />
        <button
          onClick={send}
          disabled={chatBusy || !input.trim()}
          className="rounded-lg bg-clinical-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-700 disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
