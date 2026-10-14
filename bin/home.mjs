// @ts-check
import { existsSync } from "node:fs"
import { resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Where a surface lives: `published` is this repo, which is public and is what Pages serves;
 * `private` is the sibling folder that holds the CV and is never pushed. README → "The CV is private".
 *
 * @typedef {"published" | "private"} Home
 */

export class PrivateHomeInsideRepo extends Error {
  /** @param {string} path */
  constructor(path) {
    super(`PrivateHomeInsideRepo: ${path} is inside the repo, so Pages would publish it`)
    this.name = "PrivateHomeInsideRepo"
  }
}

export class PrivateHomeMissing extends Error {
  /** @param {string} path */
  constructor(path) {
    super(`PrivateHomeMissing: FWG_CV_HOME points at ${path}, which does not exist`)
    this.name = "PrivateHomeMissing"
  }
}

/**
 * @param {{ repo: string, cvHome?: string }} config  `cvHome` is FWG_CV_HOME when set; the default is the sibling `fwg-cv`
 * @throws {PrivateHomeInsideRepo}
 */
export const homes = ({ repo, cvHome }) => {
  const roots = {
    published: resolve(repo),
    private: resolve(repo, cvHome ?? "../fwg-cv"),
  }

  if (`${roots.private}${sep}`.startsWith(`${roots.published}${sep}`)) throw new PrivateHomeInsideRepo(roots.private)

  return {
    /** @param {Home} home @returns {string} */
    root(home) {
      return roots[home]
    },

    /**
     * Whether the home is on this machine. A fresh clone of the site has no private home and that
     * is fine — but one that was pointed at explicitly and is not there is a mistake, not a skip.
     *
     * @param {Home} home
     * @returns {boolean}
     * @throws {PrivateHomeMissing}
     */
    exists(home) {
      const found = existsSync(roots[home])
      if (!found && home === "private" && cvHome) throw new PrivateHomeMissing(roots.private)

      return found
    },

    /** @param {{ file: string, home: Home }} of @returns {string}  absolute path of the file in its home */
    path({ file, home }) {
      return resolve(roots[home], file)
    },
  }
}

export const Homes = homes({ repo: fileURLToPath(new URL("..", import.meta.url)), cvHome: process.env.FWG_CV_HOME })
