/**
 * Lights up a passage the site assistant cites (#c-…): its words in reading order, in
 * bands from the primary colour to the secondary (::highlight(cited-0…4), globals.css).
 * They stay lit a moment, then go out in the same order. Done with the CSS Custom
 * Highlight API, so the page's own markup is never touched; a browser without it just
 * lands on the passage.
 */

/** The colour bands along the passage, as globals.css styles them */
const BANDS = 5;
/** How long (ms) the words take to light up, stay lit, then take to go out */
const LIGHT = 1200;
const HOLD = 800;
const OUT = 1000;

/** Stops the light-up under way, if one is */
let stopLighting: (() => void) | undefined;

const easeInOut = (x: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;

/**
 * Each word's range in `passage`, in reading order, with the space after it, so a lit line
 * reads as one stroke: the text that's on screen, not icons'
 */
function wordsIn(passage: HTMLElement) {
  const words: Range[] = [];
  const walker = document.createTreeWalker(passage, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      !node.parentElement?.closest("svg, script, style, [aria-hidden='true']") && node.parentElement?.checkVisibility()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const match of (node.textContent ?? "").matchAll(/\S+\s*/g)) {
      const word = new Range();
      word.setStart(node, match.index);
      word.setEnd(node, match.index + match[0].length);
      words.push(word);
    }
  }
  return words;
}

export function lightUp(passage: HTMLElement) {
  stopLighting?.();
  if (typeof CSS === "undefined" || !CSS.highlights) return;
  const words = wordsIn(passage);
  if (!words.length) return;
  const bands = Array.from({ length: BANDS }, (_, i) => {
    const band = new Highlight();
    CSS.highlights.set(`cited-${i}`, band);
    return band;
  });
  const bandOf = (word: number) => bands[Math.floor((word * BANDS) / words.length)];
  // Without motion, the words are all lit at once, then all go out
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = performance.now();
  let lit = 0;
  let out = 0;
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    for (let i = 0; i < BANDS; i++) CSS.highlights.delete(`cited-${i}`);
    stopLighting = undefined;
  };
  const step = (now: number) => {
    const t = now - start;
    const toLight = still ? words.length : Math.round(words.length * easeInOut(t / LIGHT));
    const toOut = still ? (t < LIGHT + HOLD + OUT ? 0 : words.length) : Math.round(words.length * easeInOut((t - LIGHT - HOLD) / OUT));
    for (; lit < toLight; lit++) bandOf(lit).add(words[lit]);
    for (; out < toOut; out++) bandOf(out).delete(words[out]);
    if (out < words.length) frame = requestAnimationFrame(step);
    else stop();
  };
  stopLighting = stop;
  frame = requestAnimationFrame(step);
}

/** Lights up the passage the page's URL points to, if it's one the assistant cites */
export function lightUpTarget() {
  const passage = location.hash.startsWith("#c-") ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (passage) lightUp(passage);
}
