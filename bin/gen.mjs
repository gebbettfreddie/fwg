// @ts-check
import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { Homes } from "./home.mjs"
import { Pdf } from "./pdf.mjs"
import { Profile } from "./profile.mjs"
import { Splice } from "./splice.mjs"
import { Surfaces } from "./surfaces.mjs"

/**
 * Writes every generated region into every surface on this machine, then re-prints any PDF a
 * surface owns. Idempotent — a PDF is only re-printed when the page it was built from has
 * actually changed, so a binary does not churn on every run.
 */

const TODAY = new Date().toISOString().slice(0, 10)
const { present } = Surfaces.locate(Surfaces.render(Profile.load(), TODAY))

for (const surface of present) {
  const path = Homes.path(surface)
  const before = readFileSync(path, "utf8")

  Splice.assertAllFilled(before, surface.regions)
  const after = Splice.apply(before, surface.regions)

  if (after === before) {
    console.log(`  ${surface.file} — already current`)
  } else {
    writeFileSync(path, after)
    console.log(`✎ ${surface.file} — ${Object.keys(surface.regions).length} region(s) written`)
  }

  if (!surface.prints) continue

  const out = Homes.path({ file: surface.prints, home: surface.home })
  const want = Pdf.stamp(after)
  const have = existsSync(Pdf.stampPath(out)) ? readFileSync(Pdf.stampPath(out), "utf8").trim() : null

  if (have === want && existsSync(out)) {
    console.log(`  ${surface.prints} — already current`)
  } else {
    const { bytes } = Pdf.write({ page: path, out })
    console.log(`✎ ${surface.prints} — ${Math.round(bytes / 1024)} kB printed from ${surface.file}`)
  }
}
