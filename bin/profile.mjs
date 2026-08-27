// @ts-check
import { readFileSync } from "node:fs"

/**
 * The one source of truth, read once at the I/O edge and validated there — so every renderer
 * downstream writes against a known shape instead of re-proving it.
 *
 * @typedef {`${number}-${number}-${number}`} IsoDate
 *
 * @typedef {{ telB64: string, emailB64: string }} Contact
 * @typedef {{ name: string, desc: string, href: string, display?: string }} Link
 * @typedef {{ n: string, label: string, note?: string }} Metric
 *
 * @typedef {{ org: string, orgHref?: string, title: string, start: IsoDate, end: IsoDate | null,
 *             mode?: string, bullets: string[], siteBlurb?: string }} Role
 * @typedef {{ name: string, start: IsoDate, end: IsoDate | null, blurb: string, coda?: string,
 *             metrics: Metric[], cvBullets: string[], withWhom?: string }} Build
 * @typedef {{ name: string, date: IsoDate }} Race
 * @typedef {{ institution: string, award: string, detail?: string, period?: string }} Credential
 * @typedef {{ text: string }} Highlight
 *
 * @typedef {{ name: string, headline: string, location: string, contact: Contact, links: Link[],
 *             roles: Role[], builds: Build[], races: Race[], credentials: Credential[],
 *             highlights: Highlight[] }} ProfileData
 */

export class ProfileInvalid extends Error {
  /**
   * @param {string} field
   * @param {string} reason
   */
  constructor(field, reason) {
    super(`${field} ${reason}`)
    this.name = "ProfileInvalid"
    this.field = field
  }
}

export class NoCurrentRole extends Error {
  constructor() {
    super("no role has end === null, so the site has no current position to show")
    this.name = "NoCurrentRole"
  }
}

export class AmbiguousCurrentRole extends Error {
  /** @param {string[]} orgs */
  constructor(orgs) {
    super(`more than one role is open (${orgs.join(", ")}) — the site shows one`)
    this.name = "AmbiguousCurrentRole"
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {IsoDate}
 */
const isoDate = (value, field) => {
  if (typeof value !== "string" || !ISO.test(value)) throw new ProfileInvalid(field, `must be YYYY-MM-DD, got ${JSON.stringify(value)}`)

  return /** @type {IsoDate} */ (value)
}

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {IsoDate | null}
 */
const isoDateOrOpen = (value, field) => (value === null ? null : isoDate(value, field))

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {string}
 */
const text = (value, field) => {
  if (typeof value !== "string" || !value.trim()) throw new ProfileInvalid(field, "must be a non-empty string")

  return value
}

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {unknown[]}
 */
const list = (value, field) => {
  if (!Array.isArray(value)) throw new ProfileInvalid(field, "must be an array")

  return value
}

export const Profile = {
  /**
   * @param {string} [path]
   * @returns {ProfileData}
   * @throws {ProfileInvalid}
   */
  load(path = new URL("../data/profile.json", import.meta.url).pathname) {
    const raw = JSON.parse(readFileSync(path, "utf8"))

    const roles = list(raw.roles, "roles").map((entry, i) => {
      const role = /** @type {Record<string, unknown>} */ (entry)

      return {
        ...role,
        org: text(role.org, `roles[${i}].org`),
        title: text(role.title, `roles[${i}].title`),
        start: isoDate(role.start, `roles[${i}].start`),
        end: isoDateOrOpen(role.end, `roles[${i}].end`),
        bullets: list(role.bullets, `roles[${i}].bullets`),
      }
    })

    const builds = list(raw.builds, "builds").map((entry, i) => {
      const build = /** @type {Record<string, unknown>} */ (entry)

      return {
        ...build,
        name: text(build.name, `builds[${i}].name`),
        blurb: text(build.blurb, `builds[${i}].blurb`),
        start: isoDate(build.start, `builds[${i}].start`),
        end: isoDateOrOpen(build.end, `builds[${i}].end`),
        metrics: list(build.metrics, `builds[${i}].metrics`),
        cvBullets: list(build.cvBullets, `builds[${i}].cvBullets`),
      }
    })

    const races = list(raw.races, "races").map((entry, i) => {
      const race = /** @type {Record<string, unknown>} */ (entry)

      return { ...race, name: text(race.name, `races[${i}].name`), date: isoDate(race.date, `races[${i}].date`) }
    })

    return /** @type {ProfileData} */ ({
      ...raw,
      name: text(raw.name, "name"),
      headline: text(raw.headline, "headline"),
      location: text(raw.location, "location"),
      contact: {
        telB64: text(raw.contact?.telB64, "contact.telB64"),
        emailB64: text(raw.contact?.emailB64, "contact.emailB64"),
      },
      roles,
      builds,
      races,
    })
  },

  /**
   * The position the site's MAIN QUEST line speaks for: the one still open.
   *
   * @param {{ roles: Pick<Role, "org" | "end">[] }} profile
   * @returns {Role}
   * @throws {NoCurrentRole | AmbiguousCurrentRole}
   */
  currentRole(profile) {
    const open = profile.roles.filter((role) => role.end === null)

    if (!open.length) throw new NoCurrentRole()
    if (open.length > 1) throw new AmbiguousCurrentRole(open.map((role) => role.org))

    return /** @type {Role} */ (/** @type {unknown} */ (open[0]))
  },
}
