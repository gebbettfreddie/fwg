// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"

import { Homes } from "./home.mjs"

test("the published home is the repo root, so Pages serves it", () => {
  assert.equal(Homes.path({ file: "index.html", home: "published" }), new URL("../index.html", import.meta.url).pathname)
  assert.ok(Homes.present("published"))
})

test("the private home is a sibling folder, outside anything that gets pushed", () => {
  const root = Homes.root("private")

  assert.ok(!root.startsWith(Homes.root("published")), `private home must not sit inside the repo: ${root}`)
  assert.equal(Homes.path({ file: "cv.html", home: "private" }), `${root}cv.html`)
})
