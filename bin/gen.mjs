// @ts-check
import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { Homes } from "./home.mjs"
import { Pdf } from "./pdf.mjs"
import { Profile } from "./profile.mjs"
import { Splice } from "./splice.mjs"
import { Surfaces } from "./surfaces.mjs"

/**
 * Writes every generated region into every surface, then rebuilds the CV's PDF from the page.
 * Idempotent — the PDF is only re-printed when the page it was built from has actually changed,
 * so a binary does not churn on every run.
 *
 * A surface whose home is not on this machine is skipped, not failed: the site is buildable from
 * a clone that has never seen the CV.
 */

const TODAY = new Date().toISOString().slice(0, 10)
const profile = Profile.load()

for (const surface of Surfaces.render(profile, TODAY)) {
  if (!Homes.present(surface.home)) {
    console.log(`  ${surface.file} — ${surface.home} home not found at ${Homes.root(surface.home)}, skipped`)
    continue
  }

  const path = Homes.path(surface)
  const before = readFileSync(path, "utf8")

  Splice.assertAllFilled(before, surface.regions)
  const after = Splice.apply(before, surface.regions)

  if (after === before) {
    console.log(`  ${surface.file} — already current`)
    continue
  }

  writeFileSync(path, after)
  console.log(`✎ ${surface.file} — ${Object.keys(surface.regions).length} region(s) written`)
}

// The PDF is what Freddie sends when someone asks for the CV, so it has to be regenerated
// whenever the page changes — and stamped, so `check` can prove the PDF still matches the page.
if (Homes.present("private")) {
  const cvPage = Homes.path({ file: "cv.html", home: "private" })
  const cvPdf = Homes.path({ file: "Freddie_Gebbett_CV.pdf", home: "private" })
  const stampPath = `${cvPdf}.stamp`

  const want = Pdf.stamp(readFileSync(cvPage, "utf8"))
  const have = existsSync(stampPath) ? readFileSync(stampPath, "utf8").trim() : null

  if (have === want && existsSync(cvPdf)) {
    console.log("  Freddie_Gebbett_CV.pdf — already current")
  } else {
    const { bytes } = Pdf.write({ page: cvPage, out: cvPdf })
    console.log(`✎ Freddie_Gebbett_CV.pdf — ${Math.round(bytes / 1024)} kB printed from cv.html`)
  }
}
