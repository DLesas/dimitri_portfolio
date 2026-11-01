/**
 * Live cursors: other visitors on the home page, over AppSync Events (infra/index.ts).
 *
 * Each tab joins one channel on a WebSocket. It announces itself every few seconds, and
 * while anyone else is there it sends its cursor position (network world units, so a
 * cursor over the title shows over the title for everyone) and its primary colour.
 * Remote cursors ease towards their latest position and fade in and out; they go once
 * their visitor's cursor leaves or stops, and the visitor themselves once they stop
 * announcing. Framework-free, like the network engine: the scene drives it every frame.
 *
 * Like Google Docs, every visitor is an anonymous animal ("Anonymous Otter"), kept per
 * browser. Once someone else is on the page, each tab also shares its approximate
 * location (city and country from /api/location) for the avatars' hover cards.
 */
import { VISUAL_CONFIG } from "./constants";
import type { MousePosition } from "./networkEngine";

/** Visitors' anonymous names. Messages send the index, so only ever append to this. */
export const ANIMALS = [
  "Hedgehog", "Hummingbird", "Butterfly", "Flamingo", "Dolphin", "Squirrel", "Wolf", "Kangaroo",
  "Cat", "Bear", "Duck", "Sloth", "Fox", "Camel", "Deer", "Octopus",
  "Panda", "Gorilla", "Turtle", "Penguin", "Beaver", "Shark", "Crab", "Parrot",
  "Lion", "Swan", "Snail", "Ladybird", "Raccoon", "Chameleon", "Horse", "Monkey",
] as const;

export const visitorName = (animal: number) => `Anonymous ${ANIMALS[animal]}`;

export interface Visitor {
  id: string;
  name: string;
  /** Index into ANIMALS */
  animal: number;
  /** Their primary colour, #rrggbb */
  color: string;
  city: string | null;
  /** ISO 3166-1 alpha-2 code */
  country: string | null;
}

export interface RemoteCursor {
  id: string;
  name: string;
  /** Eased position, network world units */
  x: number;
  y: number;
  color: string;
  /** 0 hidden – 1 shown, eased */
  weight: number;
}

/** Who is on the page, for the avatars: this tab, and everyone else */
export interface Presence {
  self: Visitor | null;
  others: Visitor[];
}

// a: animal index; ci, co: city and country code (on "hi" once known)
interface BaseMessage {
  v: 1;
  id: string;
  c: string;
  a?: number;
}
type HelloMessage = BaseMessage & { t: "hi"; ci?: string; co?: string };
type Message =
  | HelloMessage
  | (BaseMessage & { t: "out" | "bye" })
  | (BaseMessage & { t: "mv"; x: number; y: number });

interface Peer extends RemoteCursor, Visitor {
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
const ANIMAL_KEY = "lesas-visitor-animal";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const CITY = /^[\p{L}\p{M}0-9 .,'’()-]{1,40}$/u;
const COUNTRY = /^[A-Z]{2}$/;

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

// Optional fields are checked separately: a bad one is ignored rather than dropping the message
const cleanCity = (value: unknown) => (typeof value === "string" && CITY.test(value) ? value : null);
const cleanCountry = (value: unknown) => (typeof value === "string" && COUNTRY.test(value) ? value : null);
const cleanAnimal = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < ANIMALS.length ? (value as number) : null;

/** A stable animal for visitors whose messages don't name one */
function animalFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % ANIMALS.length;
}

/** This browser's animal: the same one on every visit */
function ownAnimal() {
  try {
    const saved = localStorage.getItem(ANIMAL_KEY);
    const animal = saved === null ? null : cleanAnimal(Number(saved));
    if (animal !== null) return animal;
  } catch {
    // Storage unavailable: a new animal each visit
  }
  const animal = Math.floor(Math.random() * ANIMALS.length);
  try {
    localStorage.setItem(ANIMAL_KEY, String(animal));
  } catch {
    // Not remembered, which is fine
  }
  return animal;
}

// ---- Presence, for the avatars (one connection at a time, so a single store) ----

const NO_PRESENCE: Presence = { self: null, others: [] };
let presence = NO_PRESENCE;
const presenceListeners = new Set<() => void>();

export const presenceStore = {
  subscribe(listener: () => void) {
    presenceListeners.add(listener);
    return () => {
      presenceListeners.delete(listener);
    };
  },
  getSnapshot: () => presence,
  getServerSnapshot: () => NO_PRESENCE,
};

function setPresence(next: Presence) {
  presence = next;
  presenceListeners.forEach((listener) => listener());
}

const toVisitor = ({ id, name, animal, color, city, country }: Visitor): Visitor => ({
  id,
  name,
  animal,
  color,
  city,
  country,
});

/** Connects to the channel; returns null when the site isn't configured for live cursors */
export function createLiveCursors(initialColor: string) {
  if (!liveCursorsAvailable) return null;

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const animal = ownAnimal();
  const auth = { host: HTTP_HOST!, "x-api-key": API_KEY! };
  const peers = new Map<string, Peer>();
  const visible: RemoteCursor[] = [];

  let color = initialColor;
  let location: { city: string | null; country: string | null } | null = null;
  let locating = false;
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

  function syncPresence() {
    setPresence({
      self: {
        id,
        name: visitorName(animal),
        animal,
        color,
        city: location?.city ?? null,
        country: location?.country ?? null,
      },
      others: Array.from(peers.values(), toVisitor),
    });
  }

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

  function hello() {
    const message: HelloMessage = { v: 1, id, t: "hi", c: color, a: animal };
    if (location?.city) message.ci = location.city;
    if (location?.country) message.co = location.country;
    publish(message);
  }

  /** Looks up this visitor's location, only once someone else is there to see it */
  function locate() {
    if (location || locating) return;
    locating = true;
    fetch("/api/location")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((data: { city?: unknown; country?: unknown } | null) => {
        location = { city: cleanCity(data?.city), country: cleanCountry(data?.country) };
        if (closed) return;
        syncPresence();
        hello();
      });
  }

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

    let changed = false;
    const peerAnimal = cleanAnimal(message.a) ?? animalFromId(message.id);
    if (!peer) {
      if (peers.size >= MAX_PEERS) return;
      peer = {
        id: message.id,
        name: visitorName(peerAnimal),
        animal: peerAnimal,
        color: message.c,
        city: null,
        country: null,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        weight: 0,
        active: false,
        lastSeen: now,
      };
      peers.set(message.id, peer);
      changed = true;
      locate();
      // Answer a newcomer straight away rather than at the next heartbeat, and show them
      // where this tab's cursor is even if it isn't moving
      if (message.t === "hi") hello();
      sentActive = false;
    }
    peer.lastSeen = now;
    if (peer.color !== message.c || peer.animal !== peerAnimal) {
      peer.color = message.c;
      peer.animal = peerAnimal;
      peer.name = visitorName(peerAnimal);
      changed = true;
    }

    if (message.t === "hi") {
      const city = cleanCity(message.ci);
      const country = cleanCountry(message.co);
      if (city !== peer.city || country !== peer.country) {
        peer.city = city;
        peer.country = country;
        changed = true;
      }
    } else if (message.t === "mv") {
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

    if (changed) syncPresence();
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
    publish({ v: 1, id, t: "bye", c: color, a: animal });
    const ws = socket;
    socket = null;
    subscribed = false;
    sentActive = false;
    window.clearInterval(heartbeatTimer);
    window.clearTimeout(keepAliveTimer);
    ws.close();
    peers.clear();
    syncPresence();
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

    let left = false;
    for (const [peerId, peer] of peers) {
      if (now - peer.lastSeen <= PEER_TIMEOUT_MS) continue;
      peers.delete(peerId);
      left = true;
    }
    if (left) syncPresence();

    if (subscribed && peers.size > 0) {
      if (mouse.isActive) {
        // Compared as sent (two decimals), so a still cursor whose position doesn't round
        // exactly isn't re-sent every interval
        const x = Math.round(mouse.x * 100) / 100;
        const y = Math.round(mouse.y * 100) / 100;
        const moved = x !== sentX || y !== sentY;
        if ((moved || !sentActive) && now - lastMoveAt >= MOVE_INTERVAL_MS) {
          sentX = x;
          sentY = y;
          publish({ v: 1, id, t: "mv", c: color, a: animal, x, y });
          sentActive = true;
          lastMoveAt = now;
        }
      } else if (sentActive) {
        publish({ v: 1, id, t: "out", c: color, a: animal });
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
    syncPresence();
    hello();
  }

  function close() {
    closed = true;
    disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", disconnect);
    setPresence(NO_PRESENCE);
  }

  syncPresence();
  return { update, setColor, close };
}

export type LiveCursors = NonNullable<ReturnType<typeof createLiveCursors>>;

// ---- Marks: each visitor's pointer and name, drawn over their glow ----

const SVG_NS = "http://www.w3.org/2000/svg";
/** A pointer whose tip is at (3, 2) in its 20×22 box */
const ARROW_PATH = "M3 2 L3 19 L7.6 14.6 L10.6 21.4 L13.6 20.1 L10.7 13.4 L17 13.4 Z";
const marksByLayer = new WeakMap<HTMLElement, Map<string, HTMLDivElement>>();

/** A visitor's colour, see-through: their pointers, names and avatars are tinted, not solid */
export function translucent(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
}

function createMark() {
  const mark = document.createElement("div");
  mark.style.cssText = "position:absolute;left:0;top:0;will-change:transform,opacity";

  // An outline pointer, in the visitor's colour
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "22");
  svg.style.cssText = "position:absolute;left:-3px;top:-2px;overflow:visible";
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ARROW_PATH);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-width", "1.6");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);

  // The name flag, as in Google Docs: a tint of their colour, in the page's text colour
  const label = document.createElement("span");
  label.style.cssText =
    "position:absolute;left:13px;top:17px;padding:2px 6px;border-radius:6px;white-space:nowrap;" +
    "font:600 11px/1.4 system-ui,sans-serif;color:var(--foreground);" +
    "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)";

  mark.append(svg, label);
  return mark;
}

/**
 * Places each remote cursor's pointer and name in `layer`, which covers the same area
 * as the network canvas. World units convert to pixels as in the canvas: centred,
 * CAMERA_ZOOM pixels per unit.
 */
export function drawCursorMarks(layer: HTMLElement, cursors: RemoteCursor[], width: number, height: number) {
  let marks = marksByLayer.get(layer);
  if (!marks) {
    marks = new Map();
    marksByLayer.set(layer, marks);
  }
  const zoom = VISUAL_CONFIG.CAMERA_ZOOM;
  const shown = new Set<string>();
  for (const cursor of cursors) {
    let mark = marks.get(cursor.id);
    if (!mark) {
      mark = createMark();
      marks.set(cursor.id, mark);
      layer.appendChild(mark);
    }
    shown.add(cursor.id);
    const px = cursor.x * zoom + width / 2;
    const py = -cursor.y * zoom + height / 2;
    mark.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    mark.style.opacity = cursor.weight.toFixed(3);
    // Colour and name rarely change: only touch them when they do
    if (mark.dataset.color !== cursor.color || mark.dataset.name !== cursor.name) {
      mark.dataset.color = cursor.color;
      mark.dataset.name = cursor.name;
      mark.querySelector("path")!.setAttribute("stroke", translucent(cursor.color, 0.85));
      const label = mark.querySelector("span")!;
      label.textContent = cursor.name;
      label.style.background = translucent(cursor.color, 0.45);
    }
  }
  for (const [cursorId, mark] of marks) {
    if (shown.has(cursorId)) continue;
    mark.remove();
    marks.delete(cursorId);
  }
}
