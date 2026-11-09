import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { REPLIES } from "@/lib/ask/replies";
import { checkLimit, currentLimit, isLimit, liftsAt, reachLimit, subscribeLimit } from "./limit";

const utc = (iso: string) => new Date(`${iso}Z`);

describe("liftsAt", () => {
  it("lifts the daily limit at the next UTC midnight", () => {
    assert.equal(liftsAt(REPLIES.daily, utc("2026-11-09T23:59:59")), utc("2026-11-10T00:00:00").getTime());
    assert.equal(liftsAt(REPLIES.daily, utc("2026-11-10T00:00:00")), utc("2026-11-11T00:00:00").getTime());
    assert.equal(liftsAt(REPLIES.daily, utc("2026-12-31T12:00:00")), utc("2027-01-01T00:00:00").getTime());
  });

  it("lifts the monthly limit at the start of the next UTC month", () => {
    assert.equal(liftsAt(REPLIES.monthly, utc("2026-11-09T12:00:00")), utc("2026-12-01T00:00:00").getTime());
    assert.equal(liftsAt(REPLIES.monthly, utc("2026-12-31T23:59:59")), utc("2027-01-01T00:00:00").getTime());
  });
});

describe("isLimit", () => {
  it("is the daily and monthly limits only", () => {
    assert.equal(isLimit(REPLIES.daily), true);
    assert.equal(isLimit(REPLIES.monthly), true);
    assert.equal(isLimit(REPLIES.busy), false);
  });
});

describe("the limit", () => {
  afterEach(() => {
    checkLimit();
    mock.timers.reset();
  });

  it("holds until its reset, then lifts and tells whoever's listening", () => {
    mock.timers.enable({ apis: ["setTimeout", "Date"], now: utc("2026-11-09T22:00:00") });
    let heard = 0;
    const unsubscribe = subscribeLimit(() => heard++);
    reachLimit(REPLIES.daily);
    assert.equal(currentLimit(), REPLIES.daily);
    mock.timers.tick(2 * 60 * 60 * 1000 - 1);
    assert.equal(currentLimit(), REPLIES.daily);
    mock.timers.tick(1);
    assert.equal(currentLimit(), undefined);
    assert.equal(heard, 2);
    unsubscribe();
  });

  it("lifts when checked after its reset, as when a computer wakes up", () => {
    mock.timers.enable({ apis: ["Date"], now: utc("2026-11-09T22:00:00") });
    reachLimit(REPLIES.daily);
    mock.timers.setTime(utc("2026-11-10T08:00:00").getTime());
    checkLimit();
    assert.equal(currentLimit(), undefined);
  });
});
