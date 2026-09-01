// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync } from "node:fs"

import { Pdf } from "./pdf.mjs"

test("prints without Chrome's URL and date furniture, and waits for the page to assemble", () => {
  const argv = Pdf.command({ page: "/tmp/cv.html", out: "/tmp/cv.pdf" })

  assert.ok(argv.includes("--headless"), "must not open a window")
  assert.ok(argv.includes("--no-pdf-header-footer"), "a CV must not carry a printed URL or date")
  assert.ok(
    argv.some((a) => a.startsWith("--virtual-time-budget")),
    "the contacts are assembled by script, so the snapshot has to wait for them",
  )
  assert.ok(argv.includes("--print-to-pdf=/tmp/cv.pdf"))
  assert.ok(argv.at(-1)?.startsWith("file://"), "the page must be loaded as a file URL")
})

test("rejects bytes that are not a PDF, rather than shipping a broken download", () => {
  assert.throws(() => Pdf.assertPdf(Buffer.from("<html>nope"), "cv.pdf"), /NotAPdf/)
  assert.doesNotThrow(() => Pdf.assertPdf(Buffer.from("%PDF-1.4 ..."), "cv.pdf"))
})

test("stamps what it printed, so a stale PDF can be detected later", () => {
  const a = Pdf.stamp("<html>one</html>")
  const b = Pdf.stamp("<html>two</html>")

  assert.match(a, /^[0-9a-f]{64}$/)
  assert.notEqual(a, b, "different pages must stamp differently")
  assert.equal(a, Pdf.stamp("<html>one</html>"), "the same page must stamp identically")
})

test("finds an installed browser, or names the ones it looked for", () => {
  assert.throws(() => Pdf.locate(["/nope/one", "/nope/two"]), /NoHeadlessBrowser.*nope/s)

  const found = Pdf.locate()
  assert.ok(existsSync(found), `located browser should exist: ${found}`)
})
