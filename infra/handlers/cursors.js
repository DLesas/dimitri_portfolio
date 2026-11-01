/*
 * AppSync Events handler for the `cursors` channel namespace (APPSYNC_JS runtime).
 *
 * The browser publishes with a public API key, so anyone could send anything here.
 * Only well-formed cursor messages are broadcast, rebuilt from their known fields, so
 * the key can't be used to push other data through the channel.
 *
 * A message: { v: 1, id, t, c, x?, y? }
 *   id: the visitor's random id; t: "hi" (presence), "mv" (moved), "out" (cursor left
 *   or went idle), "bye" (left the page); c: their primary colour, "#rrggbb";
 *   x, y: cursor position in the network's world units (only with "mv")
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
  if (m.t !== "mv") return { v: 1, id: m.id, t: m.t, c: m.c };
  return { v: 1, id: m.id, t: m.t, c: m.c, x: m.x, y: m.y };
}
