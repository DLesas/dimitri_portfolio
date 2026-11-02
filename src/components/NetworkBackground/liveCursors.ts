/**
 * Live cursors: other visitors on the home page, over AppSync Events (infra/realtime.ts).
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
import { ANIMATION_CONFIG } from "./constants";
import type { MousePosition } from "./networkEngine";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";

/** Visitors' anonymous names. Messages send the index, so only ever append to this. */
export const ANIMALS = [
  "Hedgehog", "Hummingbird", "Butterfly", "Flamingo", "Dolphin", "Squirrel", "Wolf", "Kangaroo",
  "Cat", "Bear", "Duck", "Sloth", "Fox", "Camel", "Deer", "Octopus",
  "Panda", "Gorilla", "Turtle", "Penguin", "Beaver", "Shark", "Crab", "Parrot",
  "Lion", "Swan", "Snail", "Ladybird", "Raccoon", "Chameleon", "Horse", "Monkey",
] as const;

const visitorName = (animal: number) => `Anonymous ${ANIMALS[animal]}`;

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
  /** Their mouse repulsion radius, network world units: how far their glow and push reach */
  radius: number;
  /** 0 hidden – 1 shown, eased */
  weight: number;
}

/** Who is on the page, for the avatars: this tab, and everyone else */
export interface Presence {
  self: Visitor | null;
  others: Visitor[];
}

// a: animal index; r: mouse repulsion radius (on "hi" and "mv"); ci, co: city and
// country code (on "hi" once known)
interface BaseMessage {
  v: 1;
  id: string;
  c: string;
  a?: number;
  r?: number;
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
  /** When their cursor last moved */
  lastMove: number;
}

const HTTP_HOST = process.env.NEXT_PUBLIC_REALTIME_HTTP_HOST;
const WS_HOST = process.env.NEXT_PUBLIC_REALTIME_WS_HOST;
const API_KEY = process.env.NEXT_PUBLIC_REALTIME_API_KEY;
/** Production, preview deployments and local development each get their own channel */
const CHANNEL = `/cursors/${process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development"}`;

const liveCursorsAvailable = Boolean(HTTP_HOST && WS_HOST && API_KEY);

// Presence is event-driven: a visitor announces itself on joining (and when its colour,
// radius or location changes), everyone already here answers straight away, and leaving
// says goodbye. Heartbeats only cover what events can't:
/** With others here, a "still here" this often, so one who vanishes without a goodbye
 * (lost connection, crashed tab) is noticed */
const HEARTBEAT_MS = 30_000;
/** Alone, only this often: nobody is listening, except a newcomer whose own announcement
 * was lost */
const LONE_HEARTBEAT_MS = 120_000;
/** A visitor who hasn't been heard from for this long has left (2.5 heartbeats) */
const PEER_TIMEOUT_MS = 75_000;
/** A shown cursor that hasn't moved for this long has gone: a live one says "out" within
 * ~5s of its mouse going idle */
const CURSOR_STALE_MS = 10_000;
/** At most ~12 position updates a second */
const MOVE_INTERVAL_MS = 80;
const MAX_PEERS = 16;
const MAX_RECONNECT_DELAY_MS = 60_000;
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
const cleanRadius = (value: unknown) =>
  typeof value === "number" &&
  value >= ANIMATION_CONFIG.MOUSE_REPULSION_RADIUS_MIN &&
  value <= ANIMATION_CONFIG.MOUSE_REPULSION_RADIUS_MAX
    ? value
    : null;
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
  const saved = cleanAnimal(readJSON(STORAGE_KEYS.visitorAnimal));
  if (saved !== null) return saved;
  // Where storage is unavailable this is a new animal each visit, which is fine
  const animal = Math.floor(Math.random() * ANIMALS.length);
  writeJSON(STORAGE_KEYS.visitorAnimal, animal);
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
export function createLiveCursors(initialColor: string, initialRadius: number) {
  if (!liveCursorsAvailable) return null;

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const animal = ownAnimal();
  const auth = { host: HTTP_HOST!, "x-api-key": API_KEY! };
  const peers = new Map<string, Peer>();
  const visible: RemoteCursor[] = [];

  let color = initialColor;
  let radius = initialRadius;
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
  let lastHelloAt = 0;

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
    lastHelloAt = performance.now();
    const message: HelloMessage = { v: 1, id, t: "hi", c: color, a: animal, r: radius };
    if (location?.city) message.ci = location.city;
    if (location?.country) message.co = location.country;
    publish(message);
  }

  function heartbeat() {
    if (peers.size > 0 || performance.now() - lastHelloAt >= LONE_HEARTBEAT_MS) hello();
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
        // Visitors whose page predates the radius push and glow as at the default
        radius: cleanRadius(message.r) ?? ANIMATION_CONFIG.MOUSE_REPULSION_RADIUS,
        city: null,
        country: null,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        weight: 0,
        active: false,
        lastSeen: now,
        lastMove: 0,
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
    peer.radius = cleanRadius(message.r) ?? peer.radius;
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
      peer.lastMove = now;
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
        // After a dropped connection the others may still be showing this cursor, or may
        // have forgotten it: the next frame sends its state afresh, moving or gone
        sentActive = true;
        sentX = NaN;
        hello();
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);
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
      resetConnection();
      if (closed || document.hidden) return;
      // Jittered exponential backoff, as AppSync recommends
      const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** attempts++) * (0.5 + Math.random() / 2);
      reconnectTimer = window.setTimeout(connect, delay);
    };
  }

  /** Forgets the connection: no socket, not subscribed, and nothing sent on it */
  function resetConnection() {
    socket = null;
    subscribed = false;
    sentActive = false;
    window.clearInterval(heartbeatTimer);
    window.clearTimeout(keepAliveTimer);
  }

  function disconnect() {
    window.clearTimeout(reconnectTimer);
    if (!socket) return;
    publish({ v: 1, id, t: "bye", c: color, a: animal });
    const ws = socket;
    resetConnection();
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
          publish({ v: 1, id, t: "mv", c: color, a: animal, r: radius, x, y });
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
      if (peer.active && now - peer.lastMove > CURSOR_STALE_MS) peer.active = false;
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

  /** This visitor's mouse repulsion radius changed: the others size their glow from it */
  function setRadius(next: number) {
    if (next === radius) return;
    radius = next;
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
  return { update, setColor, setRadius, close };
}

export type LiveCursors = NonNullable<ReturnType<typeof createLiveCursors>>;
