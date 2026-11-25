"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Device = {
  id: string;
  name: string;
  online: boolean;
  battery: number | null;
  lineNumber: string | null;
  carrier: string | null;
  lastHeartbeat: number | null;
};

type TapeRow = {
  id: string;
  direction: string;
  address: string;
  body: string;
  status: string;
  createdAt: number;
};

type Conversation = {
  address: string;
  messages: TapeRow[];
  latest: TapeRow;
};

const jsonHeaders = { "content-type": "application/json" };

function clock(value: number) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function preview(body: string) {
  const line = body.replace(/\s+/g, " ").trim();
  return line.length > 72 ? `${line.slice(0, 72)}…` : line;
}

export default function Desk({ publicUrl }: { lanBaseUrl: string; publicUrl: string }) {
  const threadRef = useRef<HTMLDivElement>(null);
  const [deskKey, setDeskKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [rows, setRows] = useState<TapeRow[]>([]);
  const [selected, setSelected] = useState("");
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [lineDraft, setLineDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("simdesk-operator-key");
    if (saved) {
      setDeskKey(saved);
      return;
    }
    void fetch("/api/session")
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { key?: string };
        if (!payload.key) return;
        sessionStorage.setItem("simdesk-operator-key", payload.key);
        setDeskKey(payload.key);
      })
      .catch(() => undefined);
  }, []);

  async function load() {
    if (!deskKey) return;
    const headers = { "x-operator-key": deskKey };
    const [deviceResponse, messageResponse] = await Promise.all([
      fetch("/api/devices", { headers }),
      fetch("/api/messages", { headers }),
    ]);
    if (deviceResponse.ok) {
      const payload = (await deviceResponse.json()) as { devices: Device[] };
      setDevices(payload.devices);
    }
    if (messageResponse.ok) {
      const payload = (await messageResponse.json()) as { messages: TapeRow[] };
      setRows(payload.messages);
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [deskKey]);

  const handset = devices[0];
  const from = handset?.lineNumber?.trim() || handset?.carrier?.trim() || "";
  const online = Boolean(handset?.online);

  useEffect(() => {
    if (handset?.lineNumber) setLineDraft(handset.lineNumber);
  }, [handset?.lineNumber]);

  const conversations = useMemo(() => {
    const groups = new Map<string, TapeRow[]>();
    for (const row of rows) {
      const bucket = groups.get(row.address) ?? [];
      bucket.push(row);
      groups.set(row.address, bucket);
    }
    const list: Conversation[] = [];
    for (const [address, messages] of groups) {
      const ordered = [...messages].sort((a, b) => a.createdAt - b.createdAt);
      list.push({ address, messages: ordered, latest: ordered[ordered.length - 1] });
    }
    list.sort((a, b) => b.latest.createdAt - a.latest.createdAt);
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((item) => item.address.toLowerCase().includes(needle) || item.latest.body.toLowerCase().includes(needle));
  }, [rows, query]);

  const active = conversations.find((item) => item.address === selected) ?? null;
  const visible = active ? active.messages.slice(-80) : [];

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [selected, visible.length, body]);

  async function saveLine() {
    if (!handset) return;
    setError("");
    const response = await fetch(`/api/devices/${handset.id}/line`, {
      method: "POST",
      headers: { ...jsonHeaders, "x-operator-key": deskKey },
      body: JSON.stringify({ lineNumber: lineDraft }),
    });
    const payload = (await response.json()) as { error?: string; lineNumber?: string };
    if (!response.ok) {
      setError(payload.error || "Could not save the sender number");
      return;
    }
    if (payload.lineNumber) setLineDraft(payload.lineNumber);
    await load();
  }

  async function pair() {
    setError("");
    const response = await fetch("/api/devices/pairing", { method: "POST", headers: { "x-operator-key": deskKey } });
    const payload = (await response.json()) as { code?: string; error?: string };
    if (!response.ok || !payload.code) {
      setError(payload.error || "Could not make a pairing code");
      return;
    }
    setCode(payload.code);
  }

  async function send(address: string) {
    setError("");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { ...jsonHeaders, "x-operator-key": deskKey },
      body: JSON.stringify({ to: [address], body }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Could not queue the text");
      return;
    }
    setBody("");
    setSelected(address);
    setComposing(false);
    await load();
  }

  function openNew() {
    setComposing(true);
    setSelected("");
    setTo("");
    setBody("");
    setError("");
  }

  const reading = Boolean(selected) || composing;

  return (
    <main className={reading ? "voice reading" : "voice"}>
      <aside className="inbox">
        <header className="brand">
          <img src="/logo.svg" alt="" width={40} height={40} />
          <div>
            <h1>SIM Desk</h1>
            <p className="from">{from ? `From ${from}` : handset ? `From ${handset.name}` : "No handset"}</p>
          </div>
          <span className={online ? "presence on" : "presence"} title={online ? "Online" : "Quiet"} />
        </header>
        <div className="tools">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
          <button type="button" onClick={openNew} disabled={!deskKey}>
            New message
          </button>
        </div>
        <div className="conversations">
          {conversations.length === 0 ? <p className="empty">No conversations yet.</p> : null}
          {conversations.map((item) => (
            <button
              type="button"
              key={item.address}
              className={item.address === selected ? "conversation selected" : "conversation"}
              onClick={() => {
                setSelected(item.address);
                setComposing(false);
                setError("");
              }}
            >
              <span className="avatar" aria-hidden="true">{item.address.replace(/\D/g, "").slice(-2) || "#"}</span>
              <span>
                <strong>{item.address}</strong>
                <em>{item.latest.direction === "out" ? "You: " : ""}{preview(item.latest.body)}</em>
              </span>
              <time dateTime={new Date(item.latest.createdAt).toISOString()}>{clock(item.latest.createdAt)}</time>
            </button>
          ))}
        </div>
        <details className="handset">
          <summary>Handset {handset ? `· ${online ? "online" : "quiet"}` : ""}</summary>
          <p>{handset ? `${handset.name}${handset.carrier ? ` · ${handset.carrier}` : ""} · battery ${handset.battery ?? "—"}` : "Pair a phone to send."}</p>
          <form
            className="line-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveLine();
            }}
          >
            <input
              value={lineDraft}
              onChange={(event) => setLineDraft(event.target.value)}
              placeholder="Sender number"
              aria-label="Sender number"
              inputMode="tel"
            />
            <button type="submit" disabled={!deskKey || !handset}>Save</button>
          </form>
          <button type="button" onClick={() => void pair()} disabled={!deskKey}>New pairing code</button>
          {code ? <code>{code}</code> : null}
          {publicUrl ? <p>Desk {publicUrl}</p> : null}
        </details>
        <details className="about">
          <summary>About SIM Desk</summary>
          <h2>What is SIM Desk?</h2>
          <p>SIM Desk queues SMS on this desk. The paired Android phone sends each text through its own SIM.</p>
          <h2>What can SIM Desk do?</h2>
          <p>It shows conversations, the number the texts are sent from, and whether each text was sent, delivered, or failed.</p>
          <h2>Who is SIM Desk for?</h2>
          <p>The operator at the desk, and the Android handset that acts as the gateway.</p>
        </details>
      </aside>
      <section className="thread">
        {!deskKey ? (
          <form
            className="unlock"
            onSubmit={(event) => {
              event.preventDefault();
              const next = draftKey.trim();
              if (!next) return;
              sessionStorage.setItem("simdesk-operator-key", next);
              setDeskKey(next);
            }}
          >
            <img src="/logo.svg" alt="" width={64} height={64} />
            <h2>Unlock SIM Desk</h2>
            <label>
              Operator key
              <input value={draftKey} onChange={(event) => setDraftKey(event.target.value)} autoComplete="off" required />
            </label>
            <button type="submit">Unlock</button>
          </form>
        ) : null}
        {deskKey && !reading ? (
          <div className="blank">
            <img src="/logo.svg" alt="" width={72} height={72} />
            <h2>Messages</h2>
            <p>Choose a conversation, or start a new one. Texts go out through {from || handset?.name || "the paired phone"}.</p>
          </div>
        ) : null}
        {deskKey && reading ? (
          <>
            <header className="thread-bar">
              <button type="button" className="back" onClick={() => { setSelected(""); setComposing(false); }}>
                Back
              </button>
              <div>
                <h2>{composing ? "New message" : selected}</h2>
                <p>{from ? `Sending from ${from}` : `Sending from ${handset?.name || "the handset"}`}</p>
              </div>
            </header>
            <div className="bubbles" ref={threadRef}>
              {composing ? <p className="empty">The message leaves from {from || "the paired phone"}.</p> : null}
              {visible.map((row) => (
                <article key={row.id} className={row.direction === "out" ? "bubble out" : "bubble in"}>
                  <p>{row.body}</p>
                  <span>
                    {clock(row.createdAt)}
                    {row.direction === "out" ? ` · ${row.status}` : ""}
                  </span>
                </article>
              ))}
            </div>
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                const address = composing ? to.trim() : selected;
                if (!address || !body.trim()) return;
                void send(address);
              }}
            >
              {composing ? (
                <label>
                  To
                  <input value={to} onChange={(event) => setTo(event.target.value)} inputMode="tel" autoComplete="tel" required />
                </label>
              ) : null}
              <label className="message">
                Message
                <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Text message" required />
              </label>
              <button type="submit">Send</button>
            </form>
            {error ? <p className="error">{error}</p> : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
