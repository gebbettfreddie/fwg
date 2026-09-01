// @ts-check
import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { Pdf } from "./pdf.mjs"
import { Profile } from "./profile.mjs"
import { Splice } from "./splice.mjs"
import { Surfaces } from "./surfaces.mjs"

/**
 * Writes every generated region into every published file, then rebuilds the CV's downloadable
 * PDF from the page. Idempotent — the PDF is only re-printed when the page it was built from
 * has actually changed, so a binary does not churn on every run.
 */

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

// The download button serves a real file, so that file has to be regenerated whenever the page
// changes — and stamped, so `check` can prove the committed PDF still matches the committed page.
const cvPage = new URL("cv.html", root).pathname
const cvPdf = new URL("Freddie_Gebbett_CV.pdf", root).pathname
const stampPath = `${cvPdf}.stamp`

const want = Pdf.stamp(readFileSync(cvPage, "utf8"))
const have = existsSync(stampPath) ? readFileSync(stampPath, "utf8").trim() : null

if (have === want && existsSync(cvPdf)) {
  console.log("  Freddie_Gebbett_CV.pdf — already current")
} else {
  const { bytes } = Pdf.write({ page: cvPage, out: cvPdf })
  console.log(`✎ Freddie_Gebbett_CV.pdf — ${Math.round(bytes / 1024)} kB printed from cv.html`)
}
