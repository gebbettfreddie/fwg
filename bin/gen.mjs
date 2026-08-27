// @ts-check
import { readFileSync, writeFileSync } from "node:fs"

import { Profile } from "./profile.mjs"
import { Splice } from "./splice.mjs"
import { Surfaces } from "./surfaces.mjs"

/** Writes every generated region into every published file. Idempotent. */

const root = new URL("..", import.meta.url)
const TODAY = new Date().toISOString().slice(0, 10)
const profile = Profile.load()
const surfaces = Surfaces.render(profile, TODAY)

for (const [file, blocks] of Object.entries(surfaces)) {
  const path = new URL(file, root).pathname
  const before = readFileSync(path, "utf8")

  Splice.assertAllFilled(before, blocks)
  const after = Splice.apply(before, blocks)

  if (after === before) {
    console.log(`  ${file} — already current`)
    continue
  }

  writeFileSync(path, after)
  console.log(`✎ ${file} — ${Object.keys(blocks).length} region(s) written`)
}
