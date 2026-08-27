// @ts-check

/**
 * Writes generated regions into a hand-authored file, between named sentinel comments.
 *
 * The contract with a renderer: it returns the region's lines joined by "\n", indented only
 * *relatively* to each other, with no leading or trailing newline. Splice owns absolute
 * indentation — it reads the base depth off the closing sentinel and applies it to every line —
 * so renderers stay pure and a generated file stays byte-stable across runs.
 */

export class MissingSentinel extends Error {
  /** @param {string} block */
  constructor(block) {
    super(`MissingSentinel: the target file declares no <!-- gen:${block} --> region`)
    this.name = "MissingSentinel"
    this.block = block
  }
}

export class UnfilledRegion extends Error {
  /** @param {string[]} blocks */
  constructor(blocks) {
    super(`UnfilledRegion: the target file declares regions nothing rendered: ${blocks.join(", ")}`)
    this.name = "UnfilledRegion"
    this.blocks = blocks
  }
}

/** @param {string} s */
const forRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** @param {string} block */
const region = (block) =>
  new RegExp(`(<!--\\s*gen:${forRegex(block)}\\b[^>]*-->)[\\s\\S]*?(\\n[ \\t]*)(<!--\\s*/gen\\s*-->)`)

export const Splice = {
  /**
   * @param {string} html
   * @param {Record<string, string>} blocks  region name -> rendered lines, relatively indented
   * @returns {string}
   * @throws {MissingSentinel}
   */
  apply(html, blocks) {
    return Object.entries(blocks).reduce((acc, [block, body]) => {
      const re = region(block)
      if (!re.test(acc)) throw new MissingSentinel(block)

      return acc.replace(re, (_, open, closeIndent, close) => {
        const base = closeIndent.slice(1)
        const indented = body.split("\n").map((line) => (line ? base + line : line))

        return `${open}\n${indented.join("\n")}${closeIndent}${close}`
      })
    }, html)
  },

  /**
   * Every region the file declares — so a caller can prove it rendered all of them
   * rather than silently leaving one stale.
   *
   * @param {string} html
   * @returns {string[]}
   */
  declared(html) {
    return [...html.matchAll(/<!--\s*gen:([a-z][a-z0-9-]*)\b[^>]*-->/g)].map(([, name]) => name)
  },

  /**
   * @param {string} html
   * @param {Record<string, string>} blocks
   * @throws {UnfilledRegion}
   */
  assertAllFilled(html, blocks) {
    const unfilled = Splice.declared(html).filter((block) => !(block in blocks))
    if (unfilled.length) throw new UnfilledRegion(unfilled)
  },
}
