// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { homes, Homes } from "./home.mjs"

const scratch = () => mkdtempSync(join(tmpdir(), "fwg-homes-"))

test("the published home is the repo root, so Pages serves it", () => {
  assert.equal(Homes.path({ file: "index.html", home: "published" }), join(Homes.root("published"), "index.html"))
  assert.ok(Homes.exists("published"))
})

test("by default the private home is the sibling fwg-cv, outside anything that gets pushed", () => {
  const repo = join(scratch(), "site")
  const h = homes({ repo })

  assert.equal(h.root("private"), join(repo, "..", "fwg-cv"))
  assert.equal(h.exists("private"), false, "a fresh clone has no private home, and that is not an error")
})

test("a private home inside the repo is refused, because Pages would publish it", () => {
  const repo = join(scratch(), "site")

  assert.throws(() => homes({ repo, cvHome: "private" }), /PrivateHomeInsideRepo/)
  assert.throws(() => homes({ repo, cvHome: join(repo, "cv") }), /PrivateHomeInsideRepo/)
  assert.doesNotThrow(() => homes({ repo, cvHome: join(repo, "..", "site-cv") }), "a sibling whose name shares a prefix is still outside")
})

test("a private home that was pointed at explicitly but is missing fails loudly", () => {
  const repo = join(scratch(), "site")

  assert.throws(() => homes({ repo, cvHome: "../nowhere" }).exists("private"), /PrivateHomeMissing/)
})

test("paths with spaces resolve to real files", () => {
  const root = scratch()
  const cv = join(root, "my cv")
  mkdirSync(cv)
  const h = homes({ repo: join(root, "site"), cvHome: cv })

  assert.ok(h.exists("private"))
  assert.equal(h.path({ file: "cv.html", home: "private" }), join(cv, "cv.html"))
})
