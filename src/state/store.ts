import { create } from "zustand";
import type {
  ConsultStatus,
  GeneratedDocuments,
  ChatMessage,
} from "../lib/types";

interface AppState {
  status: ConsultStatus;
  /** Stabilised transcript lines, in order. */
  finalLines: string[];
  /** The current in-progress utterance (not yet final). */
  interim: string;
  error: string | null;

  generating: boolean;
  docs: GeneratedDocuments | null;

  chat: ChatMessage[];
  chatBusy: boolean;

  // actions
  setStatus: (s: ConsultStatus) => void;
  addFinal: (text: string) => void;
  setInterim: (text: string) => void;
  setError: (e: string | null) => void;
  resetConsult: () => void;

  setGenerating: (b: boolean) => void;
  setDocs: (d: GeneratedDocuments | null) => void;
  updateNote: (note: string) => void;

  pushChat: (m: ChatMessage) => void;
  appendToLastChat: (chunk: string) => void;
  setChatBusy: (b: boolean) => void;

  /** Full transcript as a single string, for sending to the model. */
  transcriptText: () => string;
}

export const useStore = create<AppState>((set, get) => ({
  status: "idle",
  finalLines: [],
  interim: "",
  error: null,
  generating: false,
  docs: null,
  chat: [],
  chatBusy: false,

  setStatus: (status) => set({ status }),
  addFinal: (text) =>
    set((s) => ({ finalLines: [...s.finalLines, text], interim: "" })),
  setInterim: (interim) => set({ interim }),
  setError: (error) => set({ error }),
  resetConsult: () =>
    set({
      status: "idle",
      finalLines: [],
      interim: "",
      error: null,
      docs: null,
      chat: [],
    }),

  setGenerating: (generating) => set({ generating }),
  setDocs: (docs) => set({ docs }),
  updateNote: (note) =>
    set((s) => (s.docs ? { docs: { ...s.docs, note } } : {})),

  pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
  appendToLastChat: (chunk) =>
    set((s) => {
      const chat = s.chat.slice();
      const last = chat[chat.length - 1];
      if (last && last.role === "assistant") {
        chat[chat.length - 1] = { ...last, content: last.content + chunk };
      }
      return { chat };
    }),
  setChatBusy: (chatBusy) => set({ chatBusy }),

  transcriptText: () => {
    const { finalLines, interim } = get();
    return [...finalLines, interim].filter(Boolean).join(" ");
  },
}));
