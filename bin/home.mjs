// @ts-check
import { existsSync } from "node:fs"

/**
 * Where a surface lives.
 *
 * The repo is public and is what GitHub Pages serves, so anything committed here is on the
 * internet. The CV is not for the internet: it lives in a sibling folder that is never pushed,
 * and `gen` / `check` reach it from there. A surface says which home it belongs to; nothing
 * else in the pipeline needs to know the difference.
 *
 * @typedef {"published" | "private"} Home
 */

const repo = new URL("..", import.meta.url)

const ROOTS = {
  published: repo,
  private: new URL(process.env.FWG_CV_HOME ? `${process.env.FWG_CV_HOME.replace(/\/?$/, "/")}` : "../fwg-cv/", repo),
}

export const Homes = {
  /** @param {Home} home @returns {string} */
  root(home) {
    return ROOTS[home].pathname
  },

  /**
   * Whether the home is present on this machine. The published one always is; the private one is
   * only where the CV is kept, so a fresh clone of the site passes `check` without it.
   *
   * @param {Home} home
   * @returns {boolean}
   */
  present(home) {
    return existsSync(Homes.root(home))
  },

  /**
   * @param {{ file: string, home: Home }} surface
   * @returns {string}  absolute path of the file in its home
   */
  path({ file, home }) {
    return new URL(file, ROOTS[home]).pathname
  },
}
