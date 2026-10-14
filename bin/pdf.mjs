// @ts-check
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

/**
 * Prints a page to the PDF Freddie sends when someone asks for the CV.
 *
 * The PDF is a generated artefact, never a source: it is rebuilt from the page, and the stamp it
 * writes alongside lets `check` prove the PDF still matches the page. That is what keeps the file
 * he sends from drifting away from the data the rest of this repo guarantees.
 *
 * Split so the decisions are testable without launching a browser: only `write` is impure.
 */

const CHROMIUM_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
]

export class NoHeadlessBrowser extends Error {
  /** @param {string[]} looked */
  constructor(looked) {
    super(`no Chromium-based browser found. Looked in:\n  ${looked.join("\n  ")}`)
    this.name = "NoHeadlessBrowser"
  }
}

export class NotAPdf extends Error {
  /** @param {string} path */
  constructor(path) {
    super(`${path} does not start with %PDF- — the browser wrote something else`)
    this.name = "NotAPdf"
  }
}

export class PdfNotWritten extends Error {
  /** @param {string} path */
  constructor(path) {
    super(`the browser exited without writing ${path}`)
    this.name = "PdfNotWritten"
  }
}

export const Pdf = {
  /**
   * @param {string[]} [candidates]
   * @returns {string}
   * @throws {NoHeadlessBrowser}
   */
  locate(candidates = CHROMIUM_PATHS) {
    const found = candidates.find((path) => existsSync(path))
    if (!found) throw new NoHeadlessBrowser(candidates)

    return found
  },

  /**
   * @param {{ page: string, out: string }} target
   * @returns {string[]}
   */
  command({ page, out }) {
    return [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--virtual-time-budget=4000", // the contacts are decoded by script; wait for them
      `--print-to-pdf=${out}`,
      `file://${page}`,
    ]
  },

  /**
   * @param {Buffer} bytes
   * @param {string} path
   * @throws {NotAPdf}
   */
  assertPdf(bytes, path) {
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new NotAPdf(path)
  },

  /**
   * A fingerprint of the page a PDF was built from.
   *
   * @param {string} html
   * @returns {string}
   */
  stamp(html) {
    return createHash("sha256").update(html).digest("hex")
  },

  /** @param {string} out  the PDF's path @returns {string}  where its stamp lives */
  stampPath(out) {
    return `${out}.stamp`
  },

  /**
   * @param {{ page: string, out: string }} target  absolute paths
   * @returns {{ bytes: number, stamp: string }}
   * @throws {NoHeadlessBrowser | PdfNotWritten | NotAPdf}
   */
  write({ page, out }) {
    if (!existsSync(page)) throw new Error(`NoSuchPage: ${page}`)

    execFileSync(Pdf.locate(), Pdf.command({ page, out }), { stdio: "ignore" })

    if (!existsSync(out)) throw new PdfNotWritten(out)
    const bytes = readFileSync(out)
    Pdf.assertPdf(bytes, out)

    const stamp = Pdf.stamp(readFileSync(page, "utf8"))
    writeFileSync(Pdf.stampPath(out), `${stamp}\n`)

    return { bytes: bytes.length, stamp }
  },
}
