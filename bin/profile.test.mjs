// @ts-check
import { test } from "node:test"
import assert from "node:assert/strict"

import { Profile } from "./profile.mjs"

/** @param {Partial<import("./profile.mjs").Role>} over */
const role = (over) => ({ org: "Lawhive", title: "Office & Engagement Manager", start: "2026-02-01", end: null, bullets: [], ...over })

test("the current role is the one still open, whatever order the roles are authored in", () => {
  const roles = [role({ org: "TNW Marketing", end: "2026-02-01" }), role({ org: "Lawhive" })]

  assert.equal(Profile.currentRole({ roles }).org, "Lawhive")
})

test("throws rather than guessing when no role is open", () => {
  assert.throws(() => Profile.currentRole({ roles: [role({ end: "2026-02-01" })] }), /NoCurrentRole/)
})

test("throws rather than picking one when two roles are open", () => {
  assert.throws(() => Profile.currentRole({ roles: [role({}), role({ org: "Inkly" })] }), /AmbiguousCurrentRole/)
})
