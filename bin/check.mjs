// @ts-check
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"

import { Homes } from "./home.mjs"
import { Pdf } from "./pdf.mjs"
import { Profile } from "./profile.mjs"
import { Splice } from "./splice.mjs"
import { Surfaces } from "./surfaces.mjs"

/**
 * The drift guard. Renders from data and compares against what is on disk — never writes.
 * Exits 1 naming the first line that disagrees, so a hand-edit in a surface is caught before it
 * is pushed. Also the privacy guard: nothing the repo tracks may be the CV, a PDF, or a plaintext
 * contact, because the repo is public and Pages serves it.
 */

const TODAY = new Date().toISOString().slice(0, 10)

/**
 * @param {string} expected
 * @param {string} actual
 * @returns {{ line: number, expected: string, actual: string } | null}
 */
const firstDifference = (expected, actual) => {
  const want = expected.split("\n")
  const got = actual.split("\n")

  for (let i = 0; i < Math.max(want.length, got.length); i++) {
    if (want[i] !== got[i]) return { line: i + 1, expected: want[i] ?? "(end of file)", actual: got[i] ?? "(end of file)" }
  }

  return null
}

const profile = Profile.load()
const surfaces = Surfaces.render(profile, TODAY)
const { present } = Surfaces.locate(surfaces)

/** @type {string[]} */
const failures = []

/** @param {string} file @param {string} why */
const fail = (file, why) => {
  failures.push(file)
  console.error(`✖ ${file} ${why}`)
}

// 1. Every surface on this machine matches the data.
for (const surface of present) {
  const committed = readFileSync(Homes.path(surface), "utf8")

  Splice.assertAllFilled(committed, surface.regions)
  const difference = firstDifference(Splice.apply(committed, surface.regions), committed)

  if (!difference) {
    console.log(`✔ ${surface.file} matches data/profile.json`)
    continue
  }

  fail(surface.file, `has drifted from data/profile.json, at line ${difference.line}:`)
  console.error(`    data says: ${difference.expected.trim()}`)
  console.error(`    file says: ${difference.actual.trim()}`)
}

// 2. A PDF a surface owns was printed from the page as it is now. Only a hash, never a browser.
for (const surface of present) {
  if (!surface.prints) continue

  const out = Homes.path({ file: surface.prints, home: surface.home })

  if (!existsSync(out) || !existsSync(Pdf.stampPath(out))) {
    fail(surface.prints, "is missing — run `node bin/gen.mjs`")
  } else if (readFileSync(Pdf.stampPath(out), "utf8").trim() !== Pdf.stamp(readFileSync(Homes.path(surface), "utf8"))) {
    fail(surface.prints, `was printed from an older ${surface.file} — run \`node bin/gen.mjs\``)
  } else {
    console.log(`✔ ${surface.prints} matches ${surface.file}`)
  }
}

// 3. Nothing the repo tracks is private: not a file a private surface owns, not a page that
//    declares a private surface's regions under some other name, and not a PDF of any name —
//    the only PDF this project makes is the CV.
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: Homes.root("published"), encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
const privateSurfaces = surfaces.filter((surface) => surface.home === "private")
const privateNames = new Set(privateSurfaces.flatMap(Surfaces.files))
const publishedRegions = new Set(surfaces.filter((surface) => surface.home === "published").flatMap((surface) => Object.keys(surface.regions)))
const privateRegions = new Set(privateSurfaces.flatMap((surface) => Object.keys(surface.regions)).filter((region) => !publishedRegions.has(region)))

for (const file of tracked) {
  const path = Homes.path({ file, home: "published" })

  if (privateNames.has(basename(file))) fail(file, `is in the repo — it is private and belongs in ${Homes.root("private")}`)
  else if (file.toLowerCase().endsWith(".pdf")) fail(file, "is a PDF in a public repo — the CV is the only PDF here, and it is private")
  else if (file.endsWith(".html") && Splice.declared(readFileSync(path, "utf8")).some((region) => privateRegions.has(region)))
    fail(file, "declares regions that belong to a private surface — it is the CV under another name")
}

// 4. No surface, and nothing the repo tracks, carries a plaintext number or address — the contact
//    buttons decode them at tap time precisely so scrapers read nothing useful from the source.
const plaintext = { phone: atob(profile.contact.telB64), email: atob(profile.contact.emailB64) }
const scanned = new Set([...present.map((surface) => Homes.path(surface)), ...tracked.map((file) => Homes.path({ file, home: "published" }))])

for (const path of scanned) {
  const source = readFileSync(path, "latin1")

  for (const [what, value] of Object.entries(plaintext)) {
    if (source.includes(value)) fail(basename(path), `exposes a plaintext ${what} — it must stay base64-gated`)
  }
}

// 5. The request form is the only way left to get the CV, so it must address a real inbox.
const site = readFileSync(Homes.path({ file: "index.html", home: "published" }), "utf8")
const key = site.match(/name="access_key" value="([^"]*)"/)?.[1]

if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
  fail("index.html", `carries no usable access key (${JSON.stringify(key ?? null)}) — the CV request form would send nowhere`)
}

if (failures.length) {
  console.error(`\nRun \`node bin/gen.mjs\` to regenerate from data, or fix data/profile.json if the file is right.`)
  process.exit(1)
}

console.log("\nEverything agrees with data/profile.json, and nothing private is in the repo.")
