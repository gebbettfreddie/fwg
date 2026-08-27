// @ts-check
import { readFileSync } from "node:fs"

import { Profile } from "./profile.mjs"
import { Splice } from "./splice.mjs"
import { Surfaces } from "./surfaces.mjs"

/**
 * The drift guard. Renders from data and compares against what is committed — never writes.
 * Exits 1 naming the first line that disagrees, so a hand-edit in a published file is caught
 * before it is pushed.
 */

const root = new URL("..", import.meta.url)
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

for (const [file, blocks] of Object.entries(Surfaces.render(profile, TODAY))) {
  const committed = readFileSync(new URL(file, root).pathname, "utf8")

  Splice.assertAllFilled(committed, blocks)
  const difference = firstDifference(Splice.apply(committed, blocks), committed)

  if (!difference) {
    console.log(`✔ ${file} matches data/profile.json`)
    continue
  }

  failures.push(file)
  console.error(`✖ ${file} has drifted from data/profile.json, at line ${difference.line}:`)
  console.error(`    data says: ${difference.expected.trim()}`)
  console.error(`    file says: ${difference.actual.trim()}`)
}

// The published files must never carry a plaintext number or address — the contact buttons
// decode them at tap time precisely so scrapers read nothing useful from the source.
const plaintext = { phone: atob(profile.contact.telB64), email: atob(profile.contact.emailB64) }

for (const file of Object.keys(Surfaces.render(profile, TODAY))) {
  const source = readFileSync(new URL(file, root).pathname, "utf8")

  for (const [what, value] of Object.entries(plaintext)) {
    if (!source.includes(value)) continue

    failures.push(file)
    console.error(`✖ ${file} exposes a plaintext ${what} in its source — it must stay base64-gated`)
  }
}

if (failures.length) {
  console.error(`\nRun \`node bin/gen.mjs\` to regenerate from data, or fix data/profile.json if the file is right.`)
  process.exit(1)
}

console.log("\nSite and CV agree with data/profile.json.")
