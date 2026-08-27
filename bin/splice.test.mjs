// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"

import { Splice } from "./splice.mjs"

const wrap = (name, body) => `<p>before</p>\n<!-- gen:${name} -->\n${body}\n<!-- /gen -->\n<p>after</p>\n`

test("replaces a named region's body, leaving everything outside it untouched", () => {
  const out = Splice.apply(wrap("builds", "OLD"), { builds: "NEW" })

  assert.equal(out, wrap("builds", "NEW"))
})

test("throws MissingSentinel naming the block the html does not declare", () => {
  assert.throws(
    () => Splice.apply(wrap("builds", "OLD"), { races: "NEW" }),
    /MissingSentinel.*races/,
  )
})

test("indents every rendered line to the depth of the closing sentinel", () => {
  const html = `      <!-- gen:builds -->\n      OLD\n      <!-- /gen -->\n`

  const out = Splice.apply(html, { builds: "<ul>\n  <li>one</li>\n</ul>" })

  assert.equal(out, `      <!-- gen:builds -->\n      <ul>\n        <li>one</li>\n      </ul>\n      <!-- /gen -->\n`)
})

test("declares every region the file names, so nothing is left stale", () => {
  const html = `<!-- gen:builds --><!-- /gen -->\n<!-- gen:office · do not edit --><!-- /gen -->`

  assert.deepEqual(Splice.declared(html), ["builds", "office"])
  assert.throws(() => Splice.assertAllFilled(html, { builds: "x" }), /UnfilledRegion.*office/)
})
