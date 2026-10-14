// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"

import { Render } from "./render.mjs"

/** @type {import("./profile.mjs").Role} */
const lawhive = {
  org: "Lawhive",
  title: "Office & Engagement Manager",
  start: "2026-02-01",
  end: null,
  bullets: ["Own day-to-day operations."],
}

test("an open role reads as Present; a closed one names the month it ended", () => {
  assert.equal(
    Render.cvExperience([lawhive]),
    [
      `<article class="role">`,
      `  <div class="rhead">`,
      `    <h3><span class="rtitle">Office &amp; Engagement Manager</span> <span class="org">Lawhive</span></h3>`,
      `    <p class="rwhen">February 2026 – Present</p>`,
      `  </div>`,
      `  <ul>`,
      `    <li>Own day-to-day operations.</li>`,
      `  </ul>`,
      `</article>`,
    ].join("\n"),
  )

  const tnw = { ...lawhive, org: "TNW Marketing", title: "Client Acquisition Manager", start: /** @type {const} */ ("2025-09-01"), end: /** @type {const} */ ("2026-02-01"), mode: "Remote" }
  assert.match(Render.cvExperience([tnw]), /September 2025 – February 2026 · Remote/)
})

test("a project carries who it was built with, and its own span", () => {
  /** @type {import("./profile.mjs").Build} */
  const annabel = {
    name: "Annabel AI",
    start: "2026-05-01",
    end: "2026-07-31",
    withWhom: "my brother",
    blurb: "site voice, not used here",
    metrics: [],
    cvBullets: ["Built and ran an AI voice receptionist."],
  }

  assert.equal(
    Render.cvProjects([annabel]),
    [
      `<article class="role">`,
      `  <div class="rhead">`,
      `    <h3><span class="rtitle">Annabel AI</span> <span class="org">with my brother</span></h3>`,
      `    <p class="rwhen">May 2026 – July 2026</p>`,
      `  </div>`,
      `  <ul>`,
      `    <li>Built and ran an AI voice receptionist.</li>`,
      `  </ul>`,
      `</article>`,
    ].join("\n"),
  )
})

test("a credential shows its period only when it has one", () => {
  const reading = { institution: "University of Reading", award: "BSc Biomedical Sciences", detail: "First-Class Honours" }

  const out = Render.cvCredentials([reading, { ...reading, institution: "Jumpstart", period: "Sep–Nov 2025" }])

  assert.match(out, /<h3><span class="rtitle">University of Reading<\/span> <span class="org">BSc Biomedical Sciences<\/span><\/h3>\n  <\/div>/)
  assert.match(out, /<p class="rwhen">Sep–Nov 2025<\/p>/)
})

test("highlights render as a plain list the print can column", () => {
  assert.equal(Render.cvHighlights([{ text: "Cert III Commercial Cookery" }]), `<li>Cert III Commercial Cookery</li>`)
})

test("contacts reach both surfaces as base64, never as readable text", () => {
  const contact = { telB64: "KzQ0NzM3NjM1NzcyMA==", emailB64: "Z2ViYmV0dGZyZWRkaWVAZ21haWwuY29t" }
  const links = [
    { name: "LinkedIn", desc: "Work history", href: "https://www.linkedin.com/in/x/", display: "linkedin.com/in/freddie-gebbett" },
    { name: "Lawhive", desc: "Where I work", href: "https://lawhive.co.uk" },
  ]

  const readable = [atob(contact.telB64), atob(contact.emailB64)]

  const cv = Render.cvContacts({ contact, links, location: "United Kingdom" })
  assert.match(cv, /data-enc="KzQ0NzM3NjM1NzcyMA=="/)
  for (const value of readable) assert.ok(!cv.includes(value), "the CV header must not carry a readable contact")
  assert.match(cv, /linkedin\.com\/in\/freddie-gebbett/)
  assert.doesNotMatch(cv, /Lawhive/, "a link with no printable display stays off the CV header")

  const site = Render.contactButtons(contact)
  assert.match(site, /id="tel"[^>]*data-scheme="tel:"[^>]*data-enc="KzQ0NzM3NjM1NzcyMA=="/)
  for (const value of readable) assert.ok(!site.includes(value), "the buttons must not carry a readable contact")
})
