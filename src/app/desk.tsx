"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { threadKey } from "@/lib/address";

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
  key: string;
  address: string;
  messages: TapeRow[];
  latest: TapeRow;
  unread: number;
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

function dayLabel(value: number) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: string) {
  if (status === "queued") return "Queued";
  if (status === "sent") return "Sent";
  if (status === "delivered") return "Delivered";
  if (status === "failed") return "Failed";
  if (status === "received") return "Received";
  return status;
}

export default function Desk({ publicUrl }: { lanBaseUrl: string; publicUrl: string }) {
  const threadRef = useRef<HTMLDivElement>(null);
  const loadGeneration = useRef(0);
  const signature = useRef("");
  const stickToBottom = useRef(true);
  const [deskKey, setDeskKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [rows, setRows] = useState<TapeRow[]>([]);
  const [selected, setSelected] = useState("");
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<"all" | "unread">("all");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [lineDraft, setLineDraft] = useState("");
  const [error, setError] = useState("");
  const [readReady, setReadReady] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [readMap, setReadMap] = useState<Record<string, number>>({});

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

  useEffect(() => {
    const saved = localStorage.getItem("simdesk-read-epoch");
    const now = Date.now();
    if (!saved) localStorage.setItem("simdesk-read-epoch", String(now));
    setEpoch(saved ? Number(saved) : now);
    try {
      setReadMap(JSON.parse(localStorage.getItem("simdesk-read") || "{}") as Record<string, number>);
    } catch {
      setReadMap({});
    }
    setReadReady(true);
  }, []);

  async function load() {
    if (!deskKey) return;
    const generation = ++loadGeneration.current;
    const headers = { "x-operator-key": deskKey };
    const [deviceResponse, messageResponse] = await Promise.all([
      fetch("/api/devices", { headers }),
      fetch("/api/messages", { headers }),
    ]);
    if (generation !== loadGeneration.current) return;
    if (deviceResponse.ok) {
      const payload = (await deviceResponse.json()) as { devices: Device[] };
      setDevices(payload.devices);
    }
    if (messageResponse.ok) {
      const payload = (await messageResponse.json()) as { messages: TapeRow[] };
      const nextSignature = payload.messages.map((row) => `${row.id}:${row.status}:${row.updatedAt}`).join("|");
      if (nextSignature !== signature.current) {
        signature.current = nextSignature;
        setRows(payload.messages);
      }
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [deskKey]);

  const handset = devices[0];
  const from = handset?.lineNumber?.trim() || "";
  const online = Boolean(handset?.online);

  useEffect(() => {
    if (handset?.lineNumber) setLineDraft(handset.lineNumber);
  }, [handset?.lineNumber]);

  const conversations = useMemo(() => {
    const groups = new Map<string, TapeRow[]>();
    for (const row of rows) {
      const key = threadKey(row.address);
      if (!key) continue;
      const bucket = groups.get(key) ?? [];
      bucket.push(row);
      groups.set(key, bucket);
    }
    const list: Conversation[] = [];
    for (const [key, messages] of groups) {
      const ordered = [...messages].sort((a, b) => a.createdAt - b.createdAt);
      const address = ordered.find((row) => row.address.startsWith("+"))?.address || ordered[ordered.length - 1].address;
      const seen = readMap[key] ?? epoch;
      const unread = readReady ? ordered.filter((row) => row.direction === "in" && row.createdAt > seen).length : 0;
      list.push({ key, address, messages: ordered, latest: ordered[ordered.length - 1], unread });
    }
    list.sort((a, b) => b.latest.createdAt - a.latest.createdAt);
    return list;
  }, [rows, readMap, epoch, readReady]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const searched = needle
      ? conversations.filter((item) => item.address.toLowerCase().includes(needle) || item.latest.body.toLowerCase().includes(needle))
      : conversations;
    return box === "unread" ? searched.filter((item) => item.unread > 0) : searched;
  }, [conversations, query, box]);

  const unreadTotal = useMemo(() => {
    if (!readReady) return 0;
    const groups = new Map<string, TapeRow[]>();
    for (const row of rows) {
      if (row.direction !== "in") continue;
      const key = threadKey(row.address);
      const bucket = groups.get(key) ?? [];
      bucket.push(row);
      groups.set(key, bucket);
    }
    let total = 0;
    for (const [key, messages] of groups) {
      const seen = readMap[key] ?? epoch;
      total += messages.filter((row) => row.createdAt > seen).length;
    }
    return total;
  }, [rows, readMap, epoch, readReady]);

  const active = conversations.find((item) => item.key === selected) ?? null;
  const visible = active ? active.messages.slice(-80) : [];

  useEffect(() => {
    if (!readReady || !selected || !active) return;
    const latest = active.latest.createdAt;
    setReadMap((current) => {
      if ((current[selected] ?? 0) >= latest) return current;
      const next = { ...current, [selected]: latest };
      localStorage.setItem("simdesk-read", JSON.stringify(next));
      return next;
    });
  }, [readReady, selected, active]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    if (stickToBottom.current) node.scrollTop = node.scrollHeight;
  }, [selected, visible.length, visible[visible.length - 1]?.id]);

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
    stickToBottom.current = true;
  }

  function openThread(key: string) {
    setSelected(key);
    setComposing(false);
    setError("");
    stickToBottom.current = true;
  }

  const reading = Boolean(selected) || composing;

  return (
    <main className={reading ? "voice reading" : "voice"}>
      <aside className="inbox">
        <header className="brand">
          <img src="/logo.svg" alt="" width={40} height={40} />
          <div>
            <h1>SIM Desk</h1>
            {from ? <p className="from">{from}</p> : null}
          </div>
          <span className={online ? "presence on" : "presence"} title={online ? "Online" : "Quiet"} />
        </header>
        <div className="tools">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
          <button type="button" onClick={openNew} disabled={!deskKey}>
            New message
          </button>
        </div>
        <div className="filters" role="tablist" aria-label="Conversation filter">
          <button type="button" className={box === "all" ? "on" : ""} onClick={() => setBox("all")}>All</button>
          <button type="button" className={box === "unread" ? "on" : ""} onClick={() => setBox("unread")}>
            Unread{unreadTotal > 0 ? ` ${unreadTotal}` : ""}
          </button>
        </div>
        <div className="conversations">
          {shown.length === 0 ? <p className="empty">{box === "unread" ? "No unread messages." : "No conversations yet."}</p> : null}
          {shown.map((item) => (
            <button
              type="button"
              key={item.key}
              className={item.key === selected ? "conversation selected" : item.unread > 0 ? "conversation unread" : "conversation"}
              onClick={() => openThread(item.key)}
            >
              <span className="avatar" aria-hidden="true">{item.address.replace(/\D/g, "").slice(-2) || "#"}</span>
              <span>
                <strong>{item.address}</strong>
                <em>{item.latest.direction === "out" ? "You: " : ""}{preview(item.latest.body)}</em>
              </span>
              <span className="meta">
                <time dateTime={new Date(item.latest.createdAt).toISOString()}>{clock(item.latest.createdAt)}</time>
                {item.unread > 0 ? <span className="count">{item.unread > 99 ? "99+" : item.unread}</span> : null}
              </span>
            </button>
          ))}
        </div>
        <details className="handset">
          <summary>Handset {handset ? `· ${online ? "online" : "quiet"}` : ""}</summary>
          <p>{handset ? `Battery ${handset.battery ?? "—"}` : "Pair a phone to send."}</p>
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
          <p>It shows conversations, unread replies, and whether each text was sent, delivered, or failed.</p>
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
            <p>Choose a conversation, or start a new one.</p>
          </div>
        ) : null}
        {deskKey && reading ? (
          <>
            <header className="thread-bar">
              <button type="button" className="back" onClick={() => { setSelected(""); setComposing(false); }}>
                Back
              </button>
              <div>
                <h2>{composing ? "New message" : active?.address || ""}</h2>
                {from ? <p>{from}</p> : null}
              </div>
            </header>
            <div
              className="bubbles"
              ref={threadRef}
              onScroll={() => {
                const node = threadRef.current;
                if (!node) return;
                stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
              }}
            >
              {composing ? <p className="empty">Write a message.</p> : null}
              {visible.map((row, index) => {
                const previous = visible[index - 1];
                const showDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(row.createdAt).toDateString();
                const failed = row.status === "failed";
                return (
                  <div key={row.id} className="turn">
                    {showDay ? <p className="day">{dayLabel(row.createdAt)}</p> : null}
                    <article className={failed ? "bubble out failed" : row.direction === "out" ? "bubble out" : "bubble in"}>
                      <p>{row.body}</p>
                      <span>
                        {clock(row.createdAt)}
                        {` · ${statusLabel(row.status)}`}
                      </span>
                    </article>
                  </div>
                );
              })}
            </div>
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                const address = composing ? to.trim() : active?.address || "";
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
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey) return;
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }}
                  placeholder="Text message"
                  required
                />
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
