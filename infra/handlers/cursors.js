/*
 * AppSync Events handler for the `cursors` channel namespace (APPSYNC_JS runtime).
 *
 * The browser publishes with a public API key, so anyone could send anything here.
 * Only well-formed cursor messages are broadcast, rebuilt from their known fields, so
 * the key can't be used to push other data through the channel.
 *
 * A message: { v: 1, id, t, c, a?, r?, x?, y?, ci?, co? }
 *   id: the visitor's random id; t: "hi" (presence), "mv" (moved), "out" (cursor left
 *   or went idle), "bye" (left the page); c: their primary colour, "#rrggbb";
 *   a: their animal (an index, for "Anonymous Otter"-style names);
 *   r: their mouse repulsion radius in world units, within the settings slider's range
 *   (2-30), which sizes their cursor's glow and push for everyone (with "hi" and "mv");
 *   x, y: cursor position in the network's world units (only with "mv");
 *   ci, co: their approximate city and country code (only with "hi")
 * Optional fields that don't fit are dropped rather than rejecting the message.
 */
export function onPublish(ctx) {
  return ctx.events
    .filter((event) => isCursorMessage(event.payload))
    .map((event) => ({ id: event.id, payload: clean(event.payload) }));
}

function isCursorMessage(m) {
  if (!m || typeof m !== "object" || m.v !== 1) return false;
  if (typeof m.id !== "string" || m.id.length < 4 || m.id.length > 16) return false;
  if (m.t !== "hi" && m.t !== "mv" && m.t !== "out" && m.t !== "bye") return false;
  if (typeof m.c !== "string" || m.c.length !== 7 || m.c.charAt(0) !== "#") return false;
  if (m.t !== "mv") return true;
  return isCoordinate(m.x) && isCoordinate(m.y);
}

function isCoordinate(n) {
  return typeof n === "number" && n >= -200 && n <= 200;
}

function clean(m) {
  const out = { v: 1, id: m.id, t: m.t, c: m.c };
  if (typeof m.a === "number" && m.a >= 0 && m.a < 256) out.a = m.a;
  if ((m.t === "hi" || m.t === "mv") && typeof m.r === "number" && m.r >= 2 && m.r <= 30) out.r = m.r;
  if (m.t === "mv") {
    out.x = m.x;
    out.y = m.y;
  }
  if (m.t === "hi") {
    if (typeof m.ci === "string" && m.ci.length > 0 && m.ci.length <= 40) out.ci = m.ci;
    if (typeof m.co === "string" && m.co.length === 2) out.co = m.co;
  }
  return out;
}
