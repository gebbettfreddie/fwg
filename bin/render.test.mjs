// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"

import { Render } from "./render.mjs"

/** @type {import("./profile.mjs").Build} */
const inkly = {
  name: "Inkly",
  start: "2026-08-01",
  end: null,
  blurb: "One booking link for tattoo artists.",
  metrics: [],
  cvBullets: [],
}

test("a live build reads as BUILDING and carries only its blurb", () => {
  assert.equal(
    Render.builds([inkly]),
    [
      `<div class="b-row">`,
      `  <div class="b-head"><span class="b-name">Inkly</span> <span class="badge">BUILDING</span></div>`,
      `  <p class="lead">One booking link for tattoo artists.</p>`,
      `</div>`,
    ].join("\n"),
  )
})

test("a finished build stamps its own wrap-up month and lists its metrics", () => {
  const annabel = {
    ...inkly,
    name: "Annabel AI",
    end: /** @type {import("./profile.mjs").IsoDate} */ ("2026-07-31"),
    blurb: "An AI receptionist for dentists.",
    metrics: [{ n: "10+", label: "practices onboarded", note: " across 3 London boroughs" }],
    coda: "On to the next.",
  }

  assert.equal(
    Render.builds([annabel]),
    [
      `<div class="b-row">`,
      `  <div class="b-head"><span class="b-name">Annabel AI</span> <span class="badge done">WRAPPED · JUL 2026</span></div>`,
      `  <p class="lead">An AI receptionist for dentists.</p>`,
      `  <ul class="stats3">`,
      `    <li><span class="n">10+</span> <span><b>practices onboarded</b> across 3 London boroughs</span></li>`,
      `  </ul>`,
      `  <p class="lead">On to the next.</p>`,
      `</div>`,
    ].join("\n"),
  )
})

test("escapes text that would otherwise inject markup", () => {
  assert.match(Render.builds([{ ...inkly, name: "Fish & Chips" }]), /Fish &amp; Chips/)
})

test("the office line names the current role and links the employer", () => {
  const role = {
    org: "Lawhive",
    orgHref: "https://lawhive.co.uk",
    title: "Office & Engagement Manager",
    start: /** @type {import("./profile.mjs").IsoDate} */ ("2026-02-01"),
    end: null,
    bullets: [],
    siteBlurb: "I keep a fast-moving legal-tech team running.",
  }

  assert.equal(
    Render.officeLine(role),
    `<p class="lead"><b>Office &amp; Engagement Manager at <a class="link" href="https://lawhive.co.uk">Lawhive</a></b> — I keep a fast-moving legal-tech team running.</p>`,
  )
})

/** @param {string} name @param {string} date */
const race = (name, date) => ({ name, date: /** @type {import("./profile.mjs").IsoDate} */ (date) })

test("a race that has been run is marked done; one still ahead is not", () => {
  const races = [race("London Marathon", "2026-04-26"), race("London Hyrox", "2026-12-02")]

  assert.equal(
    Render.raceList(races, "2026-08-27"),
    [
      `<li class="done"><span class="dot"></span> LONDON MARATHON <span class="when">· 26 APR</span></li>`,
      `<li class="up"><span class="dot"></span> LONDON HYROX <span class="when">· 2 DEC</span></li>`,
    ].join("\n"),
  )
})

test("each tick sits where its race falls in the year, and says which race it is", () => {
  assert.equal(
    Render.raceTicks([race("London Marathon", "2026-04-26")], "2026-08-27"),
    `<span class="cp done" style="left:31.8%"></span><!-- London Marathon, 26 Apr -->`,
  )
})
