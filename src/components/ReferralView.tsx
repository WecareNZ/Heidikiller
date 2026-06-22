import { useState } from "react";
import { useStore } from "../state/store";

export function ReferralView() {
  const { docs } = useStore();

  if (!docs || docs.referrals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
        Any referral letters needed will be drafted here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {docs.referrals.map((r, i) => (
        <ReferralCard key={i} title={r.title} body={r.body} />
      ))}
    </div>
  );
}

function ReferralCard({ title, body }: { title: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <h3 className="font-medium text-gray-800">{title}</h3>
        <button
          onClick={copy}
          className="text-xs font-medium text-clinical-600 hover:text-clinical-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-gray-800">
        {body}
      </pre>
    </div>
  );
}
