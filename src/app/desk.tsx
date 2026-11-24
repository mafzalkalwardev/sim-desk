"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Device = {
  id: string;
  name: string;
  online: boolean;
  battery: number | null;
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

const jsonHeaders = { "content-type": "application/json" };

function clock(value: number) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Desk({ operatorKey, lanBaseUrl }: { operatorKey: string; lanBaseUrl: string }) {
  const reduce = useReducedMotion();
  const tapeRef = useRef<HTMLDivElement>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rows, setRows] = useState<TapeRow[]>([]);
  const [code, setCode] = useState("");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!operatorKey) return;
    const headers = { "x-operator-key": operatorKey };
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
  }, [operatorKey]);

  useEffect(() => {
    if (reduce) return;
    const lamps = document.querySelectorAll(".lamp");
    if (lamps.length === 0) return;
    let cancelled = false;
    void import("gsap").then(({ default: gsap }) => {
      if (cancelled) return;
      gsap.to(lamps, { backgroundColor: online ? "#E39B2B" : "#1C1915", duration: 0.24 });
    });
    return () => {
      cancelled = true;
    };
  }, [online, reduce]);

  useEffect(() => {
    if (reduce || !tapeRef.current) return;
    let cancelled = false;
    void import("gsap").then(({ default: gsap }) => {
      if (cancelled || !tapeRef.current) return;
      gsap.from(tapeRef.current.querySelectorAll(".row"), {
        y: 8,
        opacity: 0,
        stagger: 0.04,
        duration: 0.35,
        clearProps: "transform,opacity",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reduce]);

  const handset = devices[0];
  const online = Boolean(handset?.online);

  async function pair() {
    setError("");
    const response = await fetch("/api/devices/pairing", { method: "POST", headers: { "x-operator-key": operatorKey } });
    const payload = (await response.json()) as { code?: string; error?: string };
    if (!response.ok || !payload.code) {
      setError(payload.error || "Could not make a pairing code");
      return;
    }
    setCode(payload.code);
  }

  async function send() {
    setError("");
    const recipients = to.split(",").map((item) => item.trim()).filter(Boolean);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { ...jsonHeaders, "x-operator-key": operatorKey },
      body: JSON.stringify({ to: recipients, body }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Could not queue the text");
      return;
    }
    setBody("");
    await load();
  }

  return (
    <main className="desk">
      <aside className="rail">
        <div className="mark">
          <img src="/logo.svg" alt="" width={48} height={48} />
          <h1>SIM Desk</h1>
        </div>
        <div className="lamp-row">
          <span className={online ? "lamp on" : "lamp"} aria-hidden="true" />
          <p className="handset-name">{handset?.name || "No handset"}</p>
        </div>
        <p className="meta">
          {handset
            ? `${online ? "Online" : "Quiet"} · battery ${handset.battery ?? "—"}`
            : "Pair the phone to light the lamp"}
        </p>
        <div className="pair">
          <button type="button" onClick={() => void pair()} disabled={!operatorKey}>
            New pairing code
          </button>
          {code ? <code>{code}</code> : null}
          <p className="meta">Phone URL while debugging: http://127.0.0.1:3000</p>
          {lanBaseUrl ? <p className="meta">LAN: {lanBaseUrl}</p> : null}
        </div>
      </aside>
      <section className="tape-wrap">
        <div className="narrow-status">
          <span className={online ? "lamp on" : "lamp"} aria-hidden="true" />
          <strong>{handset?.name || "No handset"}</strong>
          <span className="meta">{online ? "Online" : "Quiet"}</span>
        </div>
        <div className="tape" ref={tapeRef}>
          <h2>Message tape</h2>
          {!operatorKey ? <p className="empty">Set OPERATOR_KEY in .env and restart the desk.</p> : null}
          {rows.length === 0 ? <p className="empty">The tape is empty.</p> : null}
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <motion.article
                className={`row ${row.status}`}
                key={row.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.25 }}
              >
                <time dateTime={new Date(row.createdAt).toISOString()}>{clock(row.createdAt)}</time>
                <span>{row.direction === "in" ? "in" : "out"} {row.status}</span>
                <p>
                  {row.address}
                  {"\n"}
                  {row.body}
                </p>
              </motion.article>
            ))}
          </AnimatePresence>
          {error ? <p className="error">{error}</p> : null}
        </div>
        <form
          className="compose"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label>
            <span className="meta">Number</span>
            <input value={to} onChange={(event) => setTo(event.target.value)} inputMode="tel" autoComplete="tel" required />
          </label>
          <label>
            <span className="meta">Message</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} required />
          </label>
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}
