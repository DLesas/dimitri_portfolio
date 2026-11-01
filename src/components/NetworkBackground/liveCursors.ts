/**
 * Live cursors: other visitors on the home page, over AppSync Events (infra/index.ts).
 *
 * Each tab joins one channel on a WebSocket. It announces itself every few seconds, and
 * while anyone else is there it sends its cursor position (network world units, so a
 * cursor over the title shows over the title for everyone) and its primary colour.
 * Remote cursors ease towards their latest position and fade in and out; they go once
 * their visitor's cursor leaves or stops, and the visitor themselves once they stop
 * announcing. Framework-free, like the network engine: the scene drives it every frame.
 */
import { VISUAL_CONFIG } from "./constants";
import type { MousePosition } from "./networkEngine";

export interface RemoteCursor {
  id: string;
  /** Eased position, network world units */
  x: number;
  y: number;
  /** Their primary colour, #rrggbb */
  color: string;
  /** 0 hidden – 1 shown, eased */
  weight: number;
}

type Message =
  | { v: 1; id: string; t: "hi" | "out" | "bye"; c: string }
  | { v: 1; id: string; t: "mv"; c: string; x: number; y: number };

interface Peer extends RemoteCursor {
  targetX: number;
  targetY: number;
  /** The cursor is on the page and moving */
  active: boolean;
  lastSeen: number;
}

const HTTP_HOST = process.env.NEXT_PUBLIC_REALTIME_HTTP_HOST;
const WS_HOST = process.env.NEXT_PUBLIC_REALTIME_WS_HOST;
const API_KEY = process.env.NEXT_PUBLIC_REALTIME_API_KEY;
/** Production, preview deployments and local development each get their own channel */
const CHANNEL = `/cursors/${process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development"}`;

export const liveCursorsAvailable = Boolean(HTTP_HOST && WS_HOST && API_KEY);

const HEARTBEAT_MS = 10_000;
/** A visitor who hasn't been heard from for this long has left */
const PEER_TIMEOUT_MS = 25_000;
/** At most ~12 position updates a second */
const MOVE_INTERVAL_MS = 80;
const MAX_PEERS = 16;
const MAX_RECONNECT_DELAY_MS = 60_000;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function base64Url(value: object) {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isMessage(m: unknown): m is Message {
  if (!m || typeof m !== "object") return false;
  const msg = m as Record<string, unknown>;
  if (msg.v !== 1 || typeof msg.id !== "string" || typeof msg.c !== "string") return false;
  if (!HEX_COLOR.test(msg.c)) return false;
  if (msg.t === "mv") return Number.isFinite(msg.x) && Number.isFinite(msg.y);
  return msg.t === "hi" || msg.t === "out" || msg.t === "bye";
}

/** Connects to the channel; returns null when the site isn't configured for live cursors */
export function createLiveCursors(initialColor: string) {
  if (!liveCursorsAvailable) return null;

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const auth = { host: HTTP_HOST!, "x-api-key": API_KEY! };
  const peers = new Map<string, Peer>();
  const visible: RemoteCursor[] = [];

  let color = initialColor;
  let socket: WebSocket | null = null;
  let subscribed = false;
  let closed = false;
  let attempts = 0;
  let publishId = 0;
  let reconnectTimer = 0;
  let heartbeatTimer = 0;
  let keepAliveTimer = 0;
  let keepAliveMs = 300_000;

  // What this tab last told the others
  let sentActive = false;
  let sentX = NaN;
  let sentY = NaN;
  let lastMoveAt = 0;

  function publish(message: Message) {
    if (!socket || !subscribed) return;
    socket.send(
      JSON.stringify({
        type: "publish",
        id: `p${++publishId}`,
        channel: CHANNEL,
        events: [JSON.stringify(message)],
        authorization: auth,
      })
    );
  }

  const hello = () => publish({ v: 1, id, t: "hi", c: color });

  function receive(message: Message) {
    if (message.id === id) return;
    const now = performance.now();
    let peer = peers.get(message.id);
    if (message.t === "bye") {
      // Fade the cursor out now; the visitor is dropped a moment later
      if (peer) {
        peer.active = false;
        peer.lastSeen = now - PEER_TIMEOUT_MS + 1000;
      }
      return;
    }
    if (!peer) {
      if (peers.size >= MAX_PEERS) return;
      peer = { id: message.id, x: 0, y: 0, targetX: 0, targetY: 0, color: message.c, weight: 0, active: false, lastSeen: now };
      peers.set(message.id, peer);
      // Answer a newcomer straight away rather than at the next heartbeat, and show them
      // where this tab's cursor is even if it isn't moving
      if (message.t === "hi") hello();
      sentActive = false;
    }
    peer.lastSeen = now;
    peer.color = message.c;
    if (message.t === "mv") {
      // A cursor that was hidden appears where it is rather than sliding in from its last spot
      if (peer.weight < 0.05) {
        peer.x = message.x;
        peer.y = message.y;
      }
      peer.targetX = message.x;
      peer.targetY = message.y;
      peer.active = true;
    } else if (message.t === "out") {
      peer.active = false;
    }
  }

  function onSocketMessage(event: MessageEvent) {
    let msg: { type?: string; event?: unknown; connectionTimeoutMs?: number };
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case "connection_ack":
        keepAliveMs = msg.connectionTimeoutMs ?? keepAliveMs;
        resetKeepAlive();
        socket?.send(JSON.stringify({ type: "subscribe", id: "cursors", channel: CHANNEL, authorization: auth }));
        break;
      case "subscribe_success":
        subscribed = true;
        attempts = 0;
        hello();
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = window.setInterval(hello, HEARTBEAT_MS);
        break;
      case "ka":
        resetKeepAlive();
        break;
      case "data": {
        // A single event arrives as a JSON string (sometimes wrapped in an array)
        const events = Array.isArray(msg.event) ? msg.event : [msg.event];
        for (const raw of events) {
          try {
            const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (isMessage(parsed)) receive(parsed);
          } catch {
            // Ignore anything malformed
          }
        }
        break;
      }
      case "subscribe_error":
      case "connection_error":
        socket?.close();
        break;
    }
  }

  function resetKeepAlive() {
    window.clearTimeout(keepAliveTimer);
    // AppSync sends a keep-alive every minute; without one the connection is gone
    keepAliveTimer = window.setTimeout(() => socket?.close(), keepAliveMs);
  }

  function connect() {
    if (closed || document.hidden || socket) return;
    const ws = new WebSocket(`wss://${WS_HOST}/event/realtime`, [
      "aws-appsync-event-ws",
      `header-${base64Url(auth)}`,
    ]);
    socket = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "connection_init" }));
    ws.onmessage = onSocketMessage;
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = null;
      subscribed = false;
      sentActive = false;
      window.clearInterval(heartbeatTimer);
      window.clearTimeout(keepAliveTimer);
      if (closed || document.hidden) return;
      // Jittered exponential backoff, as AppSync recommends
      const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** attempts++) * (0.5 + Math.random() / 2);
      reconnectTimer = window.setTimeout(connect, delay);
    };
  }

  function disconnect() {
    window.clearTimeout(reconnectTimer);
    if (!socket) return;
    publish({ v: 1, id, t: "bye", c: color });
    const ws = socket;
    socket = null;
    subscribed = false;
    sentActive = false;
    window.clearInterval(heartbeatTimer);
    window.clearTimeout(keepAliveTimer);
    ws.close();
    peers.clear();
  }

  // Only connected while the tab is in front
  const onVisibility = () => (document.hidden ? disconnect() : connect());
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", disconnect);
  connect();

  /**
   * Called every frame: sends this tab's cursor when others are around, and eases the
   * remote cursors. Returns the ones to draw.
   */
  function update(delta: number, mouse: MousePosition): RemoteCursor[] {
    const now = performance.now();

    for (const [peerId, peer] of peers) {
      if (now - peer.lastSeen > PEER_TIMEOUT_MS) peers.delete(peerId);
    }

    if (subscribed && peers.size > 0) {
      if (mouse.isActive) {
        const moved = mouse.x !== sentX || mouse.y !== sentY;
        if ((moved || !sentActive) && now - lastMoveAt >= MOVE_INTERVAL_MS) {
          sentX = Math.round(mouse.x * 100) / 100;
          sentY = Math.round(mouse.y * 100) / 100;
          publish({ v: 1, id, t: "mv", c: color, x: sentX, y: sentY });
          sentActive = true;
          lastMoveAt = now;
        }
      } else if (sentActive) {
        publish({ v: 1, id, t: "out", c: color });
        sentActive = false;
      }
    }

    const ease = Math.min(1, delta * 14);
    const fade = Math.min(1, delta * 5);
    visible.length = 0;
    for (const peer of peers.values()) {
      peer.x += (peer.targetX - peer.x) * ease;
      peer.y += (peer.targetY - peer.y) * ease;
      peer.weight += ((peer.active ? 1 : 0) - peer.weight) * fade;
      if (peer.weight > 0.01) visible.push(peer);
    }
    return visible;
  }

  function setColor(next: string) {
    if (next === color) return;
    color = next;
    hello();
  }

  function close() {
    closed = true;
    disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", disconnect);
  }

  return { update, setColor, close };
}

export type LiveCursors = NonNullable<ReturnType<typeof createLiveCursors>>;

// ---- Arrows: each visitor's pointer, drawn over their glow ----

const SVG_NS = "http://www.w3.org/2000/svg";
/** A pointer whose tip is at (3, 2) in its 20×22 box */
const ARROW_PATH = "M3 2 L3 19 L7.6 14.6 L10.6 21.4 L13.6 20.1 L10.7 13.4 L17 13.4 Z";
const arrowsByLayer = new WeakMap<HTMLElement, Map<string, SVGSVGElement>>();

function createArrow() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "22");
  svg.style.cssText =
    "position:absolute;left:-3px;top:-2px;filter:drop-shadow(0 1px 2px rgb(0 0 0 / 0.45));will-change:transform";
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ARROW_PATH);
  path.setAttribute("stroke", "white");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
}

/**
 * Places an arrow at each remote cursor in `layer`, which covers the network canvas.
 * World units convert to pixels as in the canvas: centred, CAMERA_ZOOM pixels per unit.
 */
export function drawCursorArrows(layer: HTMLElement, cursors: RemoteCursor[], width: number, height: number) {
  let arrows = arrowsByLayer.get(layer);
  if (!arrows) {
    arrows = new Map();
    arrowsByLayer.set(layer, arrows);
  }
  const zoom = VISUAL_CONFIG.CAMERA_ZOOM;
  const shown = new Set<string>();
  for (const cursor of cursors) {
    let arrow = arrows.get(cursor.id);
    if (!arrow) {
      arrow = createArrow();
      arrows.set(cursor.id, arrow);
      layer.appendChild(arrow);
    }
    shown.add(cursor.id);
    const px = cursor.x * zoom + width / 2;
    const py = -cursor.y * zoom + height / 2;
    arrow.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    arrow.style.opacity = cursor.weight.toFixed(3);
    arrow.firstElementChild!.setAttribute("fill", cursor.color);
  }
  for (const [cursorId, arrow] of arrows) {
    if (shown.has(cursorId)) continue;
    arrow.remove();
    arrows.delete(cursorId);
  }
}
