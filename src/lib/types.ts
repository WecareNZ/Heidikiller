export interface TranscriptSegment {
  id: string;
  text: string;
  /** true while Deepgram is still refining this segment (interim result). */
  interim: boolean;
  at: number;
}

export interface Referral {
  /** Heading the model assigned, e.g. "Cardiology referral". */
  title: string;
  body: string;
}

export interface GeneratedDocuments {
  note: string;
  referrals: Referral[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ConsultStatus = "idle" | "recording" | "paused" | "stopped";
