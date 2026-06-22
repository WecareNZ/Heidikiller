import {
  createClient,
  LiveTranscriptionEvents,
  type LiveClient,
} from "@deepgram/sdk";
import { fetchDeepgramToken } from "./api";

/**
 * Captures microphone audio and streams it to Deepgram for live, medical-tuned
 * transcription. The Deepgram API key never reaches the browser — we mint a
 * short-lived token from our serverless function first.
 *
 * Swappable: to change STT providers later, reimplement this class's surface
 * (start/stop + the onFinal/onInterim callbacks) — nothing else needs to know.
 */

interface TranscriberCallbacks {
  /** A stabilised, final piece of transcript. */
  onFinal: (text: string) => void;
  /** The current in-progress utterance (replaces the previous interim). */
  onInterim: (text: string) => void;
  onError: (message: string) => void;
  onOpen?: () => void;
}

export class LiveTranscriber {
  private connection: LiveClient | null = null;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly cb: TranscriberCallbacks) {}

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const token = await fetchDeepgramToken();
    const deepgram = createClient({ accessToken: token });

    this.connection = deepgram.listen.live({
      model: "nova-2-medical",
      language: "en",
      smart_format: true,
      interim_results: true,
      punctuate: true,
      // utterance_end_ms helps segment naturally at pauses in conversation.
      utterance_end_ms: 1000,
    });

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      this.cb.onOpen?.();

      const recorder = new MediaRecorder(this.stream!, {
        mimeType: pickMimeType(),
      });
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0 && this.connection) {
          this.connection.send(event.data);
        }
      });
      recorder.start(250); // emit a chunk every 250ms
      this.recorder = recorder;

      // Deepgram closes idle sockets; ping to keep it alive during quiet spells.
      this.keepAlive = setInterval(() => this.connection?.keepAlive(), 8000);
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const alt = data.channel?.alternatives?.[0];
      const text: string = alt?.transcript ?? "";
      if (!text) return;
      if (data.is_final) this.cb.onFinal(text);
      else this.cb.onInterim(text);
    });

    this.connection.on(LiveTranscriptionEvents.Error, (err) => {
      this.cb.onError(err?.message ?? "Transcription error.");
    });
  }

  stop(): void {
    if (this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
    this.recorder?.state !== "inactive" && this.recorder?.stop();
    this.recorder = null;
    this.connection?.requestClose();
    this.connection = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}
