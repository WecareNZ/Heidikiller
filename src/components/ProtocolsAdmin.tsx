import { useEffect, useState } from "react";
import type { ReferralProtocol } from "../config/protocols";
import { listProtocols, upsertProtocol, deleteProtocol } from "../lib/adminApi";

const BLANK: ReferralProtocol = {
  id: "",
  title: "",
  source: "HealthPathways",
  region: "",
  triggers: [],
  whenToRefer: "",
  requiredWorkup: "",
  redFlags: "",
  referralMustInclude: "",
  destination: "",
};

export function ProtocolsAdmin() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("hk_admin_token") ?? "",
  );
  const [authed, setAuthed] = useState(false);
  const [protocols, setProtocols] = useState<ReferralProtocol[]>([]);
  const [editing, setEditing] = useState<ReferralProtocol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (t: string) => {
    setBusy(true);
    setError(null);
    try {
      const { protocols } = await listProtocols(t);
      setProtocols(protocols);
      setAuthed(true);
      sessionStorage.setItem("hk_admin_token", t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load protocols.");
      setAuthed(false);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (token) void load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await upsertProtocol(token, editing);
      setEditing(null);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete protocol "${id}"?`)) return;
    setBusy(true);
    try {
      await deleteProtocol(token, id);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <div className="mx-auto mt-16 max-w-sm rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold">Protocol admin</h2>
        <p className="mb-4 text-sm text-gray-500">
          Enter the admin token to manage referral protocols.
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(token)}
          placeholder="Admin token"
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          onClick={() => load(token)}
          disabled={busy || !token}
          className="w-full rounded-lg bg-clinical-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Referral protocols</h2>
        <button
          onClick={() => setEditing({ ...BLANK })}
          className="rounded-lg bg-clinical-600 px-4 py-2 text-sm font-medium text-white"
        >
          + New protocol
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {editing ? (
        <ProtocolForm
          value={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
          busy={busy}
        />
      ) : protocols.length === 0 ? (
        <p className="text-sm text-gray-500">
          No protocols yet. (If you haven't applied the migration or set the
          Supabase env vars, the consult flow uses the synthetic fallback set.)
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {protocols.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium text-gray-800">{p.title}</div>
                <div className="text-xs text-gray-500">
                  {p.source}
                  {p.region ? ` · ${p.region}` : ""} → {p.destination}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(p)}
                  className="text-sm text-clinical-600 hover:text-clinical-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProtocolForm({
  value,
  onChange,
  onSave,
  onCancel,
  busy,
}: {
  value: ReferralProtocol;
  onChange: (p: ReferralProtocol) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const set = (patch: Partial<ReferralProtocol>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID (slug)">
          <input
            className={inputCls}
            value={value.id}
            onChange={(e) => set({ id: e.target.value })}
            placeholder="chest-pain-suspected-angina"
          />
        </Field>
        <Field label="Source">
          <input
            className={inputCls}
            value={value.source}
            onChange={(e) => set({ source: e.target.value })}
            placeholder="HealthPathways / WeCare"
          />
        </Field>
        <Field label="Title">
          <input
            className={inputCls}
            value={value.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>
        <Field label="Region (optional)">
          <input
            className={inputCls}
            value={value.region ?? ""}
            onChange={(e) => set({ region: e.target.value })}
          />
        </Field>
        <Field label="Destination">
          <input
            className={inputCls}
            value={value.destination}
            onChange={(e) => set({ destination: e.target.value })}
          />
        </Field>
        <Field label="Triggers (comma-separated)">
          <input
            className={inputCls}
            value={value.triggers.join(", ")}
            onChange={(e) =>
              set({
                triggers: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="chest pain, angina, exertional"
          />
        </Field>
      </div>
      <Field label="When to refer">
        <textarea className={areaCls} value={value.whenToRefer} onChange={(e) => set({ whenToRefer: e.target.value })} />
      </Field>
      <Field label="Required pre-referral workup">
        <textarea className={areaCls} value={value.requiredWorkup} onChange={(e) => set({ requiredWorkup: e.target.value })} />
      </Field>
      <Field label="Red flags (acute / ED — optional)">
        <textarea className={areaCls} value={value.redFlags ?? ""} onChange={(e) => set({ redFlags: e.target.value })} />
      </Field>
      <Field label="Referral must include">
        <textarea className={areaCls} value={value.referralMustInclude} onChange={(e) => set({ referralMustInclude: e.target.value })} />
      </Field>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-lg bg-clinical-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500";
const areaCls = `${inputCls} min-h-[4rem] resize-y`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
