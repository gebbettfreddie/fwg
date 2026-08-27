// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"

import { Dates } from "./dates.mjs"

test("places a date along the year as a percentage, for the race track's ticks", () => {
  assert.equal(Dates.yearPercent("2026-01-01"), "0.3")
  assert.equal(Dates.yearPercent("2026-04-26"), "31.8")
  assert.equal(Dates.yearPercent("2026-12-02"), "92.1")
})

test("reads a race day the way the calendar does, with no leading zero", () => {
  assert.equal(Dates.dayMonthUpper("2026-12-02"), "2 DEC")
  assert.equal(Dates.dayMonth("2026-04-26"), "26 Apr")
})

test("refuses a date it cannot parse rather than placing a tick at zero", () => {
  assert.throws(() => Dates.yearPercent("soon"), /NotAnIsoDate/)
})
