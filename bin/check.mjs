// @ts-check
import { existsSync, readFileSync } from "node:fs"

import { Homes } from "./home.mjs"
import { Pdf } from "./pdf.mjs"
import { Profile } from "./profile.mjs"
import { Splice } from "./splice.mjs"
import { Surfaces } from "./surfaces.mjs"

/**
 * The drift guard. Renders from data and compares against what is on disk — never writes.
 * Exits 1 naming the first line that disagrees, so a hand-edit in a surface is caught before it
 * is pushed.
 *
 * A surface whose home is not on this machine is reported and skipped: the pre-push guard has to
 * pass on a clone of the site that does not carry the CV.
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
const failures = []

const surfaces = Surfaces.render(profile, TODAY).filter((surface) => {
  if (Homes.present(surface.home)) return true

  console.log(`– ${surface.file} — ${surface.home} home not found at ${Homes.root(surface.home)}, skipped`)
  return false
})

for (const surface of surfaces) {
  const committed = readFileSync(Homes.path(surface), "utf8")

  Splice.assertAllFilled(committed, surface.regions)
  const difference = firstDifference(Splice.apply(committed, surface.regions), committed)

  if (!difference) {
    console.log(`✔ ${surface.file} matches data/profile.json`)
    continue
  }

  failures.push(surface.file)
  console.error(`✖ ${surface.file} has drifted from data/profile.json, at line ${difference.line}:`)
  console.error(`    data says: ${difference.expected.trim()}`)
  console.error(`    file says: ${difference.actual.trim()}`)
}

// No surface may carry a plaintext number or address — the contact buttons decode them at tap
// time precisely so scrapers read nothing useful from the source.
const plaintext = { phone: atob(profile.contact.telB64), email: atob(profile.contact.emailB64) }

for (const surface of surfaces) {
  const source = readFileSync(Homes.path(surface), "utf8")

  for (const [what, value] of Object.entries(plaintext)) {
    if (!source.includes(value)) continue

    failures.push(surface.file)
    console.error(`✖ ${surface.file} exposes a plaintext ${what} in its source — it must stay base64-gated`)
  }
}

// The PDF is generated from cv.html. Verifying it needs only a hash, never a browser.
if (Homes.present("private")) {
  const cvPdf = Homes.path({ file: "Freddie_Gebbett_CV.pdf", home: "private" })
  const stampPath = `${cvPdf}.stamp`

  if (!existsSync(cvPdf) || !existsSync(stampPath)) {
    failures.push("Freddie_Gebbett_CV.pdf")
    console.error("✖ the CV PDF is missing — run `node bin/gen.mjs`")
  } else {
    const want = Pdf.stamp(readFileSync(Homes.path({ file: "cv.html", home: "private" }), "utf8"))

    if (readFileSync(stampPath, "utf8").trim() !== want) {
      failures.push("Freddie_Gebbett_CV.pdf")
      console.error("✖ Freddie_Gebbett_CV.pdf was printed from an older cv.html — run `node bin/gen.mjs`")
    } else {
      console.log("✔ Freddie_Gebbett_CV.pdf matches cv.html")
    }
  }
}

// The CV must never be back in the published home — the repo is public and Pages serves it.
for (const file of ["cv.html", "Freddie_Gebbett_CV.pdf"]) {
  if (!existsSync(Homes.path({ file, home: "published" }))) continue

  failures.push(file)
  console.error(`✖ ${file} is in the repo — the CV is private; it belongs in ${Homes.root("private")}`)
}

if (failures.length) {
  console.error(`\nRun \`node bin/gen.mjs\` to regenerate from data, or fix data/profile.json if the file is right.`)
  process.exit(1)
}

console.log("\nEverything agrees with data/profile.json.")
