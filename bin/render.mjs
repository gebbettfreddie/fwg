// @ts-check
import { Dates } from "./dates.mjs"

/**
 * Pure renderers: profile data in, a generated region's lines out.
 *
 * Every function returns lines joined by "\n" and indented only *relatively* — Splice owns the
 * absolute depth. Nothing here reads the filesystem or the clock beyond what it is handed.
 */

/** @param {string} text */
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** @param {string[]} lines */
const nest = (lines) => lines.map((line) => `  ${line}`)

/** @param {string} start @param {string | null} end @param {string} [mode] */
const span = (start, end, mode) => {
  const closed = end === null ? "Present" : Dates.monthYearLong(end)

  return `${Dates.monthYearLong(start)} – ${closed}${mode ? ` · ${mode}` : ""}`
}

/**
 * The CV's shared entry shape: a heading, a right-aligned span, and the bullets under it.
 * Roles, projects and credentials are the same object to a reader — so they are one renderer here,
 * differing only in what they put in each slot.
 *
 * @param {{ title: string, aside?: string, when?: string, bullets?: string[], detail?: string }} entry
 */
const entry = ({ title, aside, when, bullets = [], detail }) => [
  `<article class="role">`,
  ...nest([
    `<div class="rhead">`,
    ...nest([
      `<h3><span class="rtitle">${escape(title)}</span>${aside ? ` <span class="org">${escape(aside)}</span>` : ""}</h3>`,
      ...(when ? [`<p class="rwhen">${escape(when)}</p>`] : []),
    ]),
    `</div>`,
    ...(detail ? [`<p class="rdetail">${escape(detail)}</p>`] : []),
    ...(bullets.length ? [`<ul>`, ...nest(bullets.map((b) => `<li>${escape(b)}</li>`)), `</ul>`] : []),
  ]),
  `</article>`,
]

/** @param {import("./profile.mjs").Build} build */
const badge = (build) =>
  build.end === null
    ? `<span class="badge">BUILDING</span>`
    : `<span class="badge done">WRAPPED · ${Dates.monthYearUpper(build.end)}</span>`

/** @param {import("./profile.mjs").Metric} metric */
const metric = (metric) =>
  `<li><span class="n">${escape(metric.n)}</span> <span><b>${escape(metric.label)}</b>${escape(metric.note ?? "")}</span></li>`

/** @param {import("./profile.mjs").Build} build */
const buildRow = (build) => [
  `<div class="b-row">`,
  ...nest([
    `<div class="b-head"><span class="b-name">${escape(build.name)}</span> ${badge(build)}</div>`,
    `<p class="lead">${escape(build.blurb)}</p>`,
    ...(build.metrics.length ? [`<ul class="stats3">`, ...nest(build.metrics.map(metric)), `</ul>`] : []),
    ...(build.coda ? [`<p class="lead">${escape(build.coda)}</p>`] : []),
  ]),
  `</div>`,
]

export const Render = {
  /**
   * THE OFFICE — the current position, stated once and linked.
   *
   * @param {import("./profile.mjs").Role} role
   * @returns {string}
   */
  officeLine(role) {
    const employer = role.orgHref
      ? `<a class="link" href="${role.orgHref}">${escape(role.org)}</a>`
      : escape(role.org)

    return `<p class="lead"><b>${escape(role.title)} at ${employer}</b> — ${escape(role.siteBlurb ?? "")}</p>`
  },

  /**
   * TRAINING GROUNDS — the race calendar's ticks, placed by date.
   *
   * @param {import("./profile.mjs").Race[]} races
   * @param {string} today
   * @returns {string}
   */
  raceTicks(races, today) {
    return races
      .map((race) => {
        const state = Dates.hasPassed(race.date, today) ? " done" : ""

        return `<span class="cp${state}" style="left:${Dates.yearPercent(race.date)}%"></span><!-- ${race.name}, ${Dates.dayMonth(race.date)} -->`
      })
      .join("\n")
  },

  /**
   * TRAINING GROUNDS — the same races, read as a list.
   *
   * @param {import("./profile.mjs").Race[]} races
   * @param {string} today
   * @returns {string}
   */
  raceList(races, today) {
    return races
      .map((race) => {
        const state = Dates.hasPassed(race.date, today) ? "done" : "up"

        return `<li class="${state}"><span class="dot"></span> ${escape(race.name.toUpperCase())} <span class="when">· ${Dates.dayMonthUpper(race.date)}</span></li>`
      })
      .join("\n")
  },

  /**
   * SAVE POINT — where to find me. One row per link, in the order the data lists them.
   *
   * @param {import("./profile.mjs").Link[]} links
   * @returns {string}
   */
  linkRows(links) {
    return links
      .flatMap((link) => [
        `<a class="lrow" href="${link.href}" target="_blank" rel="noopener noreferrer">`,
        ...nest([
          `<span class="l"><span class="name">${escape(link.name.toUpperCase())}</span><span class="desc">${escape(link.desc)}</span></span>`,
          `<span class="arr" aria-hidden="true">▸</span>`,
        ]),
        `</a>`,
      ])
      .join("\n")
  },

  /**
   * THE WORKSHOP — the builds, newest first as authored.
   *
   * @param {import("./profile.mjs").Build[]} builds
   * @returns {string}
   */
  builds(builds) {
    return builds.flatMap(buildRow).join("\n")
  },
  /**
   * The CV's PROFILE line. The one place the CV points back at the map.
   *
   * @param {Pick<import("./profile.mjs").ProfileData, "headline">} profile
   * @returns {string}
   */
  cvHeadline({ headline }) {
    return `<p class="lead">${escape(headline).replace("fwg.fyi", `<a href="https://fwg.fyi"><b>fwg.fyi</b></a>`)}</p>`
  },

  /**
   * The CV's EXPERIENCE — employment only. The builds have their own section.
   *
   * @param {import("./profile.mjs").Role[]} roles
   * @returns {string}
   */
  cvExperience(roles) {
    return roles
      .flatMap((role) => entry({ title: role.title, aside: role.org, when: span(role.start, role.end, role.mode), bullets: role.bullets }))
      .join("\n")
  },

  /**
   * The CV's PROJECTS — the same builds the site's workshop shows, in the CV's register.
   *
   * @param {import("./profile.mjs").Build[]} builds
   * @returns {string}
   */
  cvProjects(builds) {
    return builds
      .flatMap((build) =>
        entry({
          title: build.name,
          aside: build.withWhom ? `with ${build.withWhom}` : undefined,
          when: span(build.start, build.end),
          bullets: build.cvBullets,
        }),
      )
      .join("\n")
  },

  /**
   * @param {import("./profile.mjs").Credential[]} credentials
   * @returns {string}
   */
  cvCredentials(credentials) {
    return credentials
      .flatMap((credential) =>
        entry({ title: credential.institution, aside: credential.award, when: credential.period, detail: credential.detail }),
      )
      .join("\n")
  },

  /**
   * @param {import("./profile.mjs").Highlight[]} highlights
   * @returns {string}
   */
  cvHighlights(highlights) {
    return highlights.map((highlight) => `<li>${escape(highlight.text)}</li>`).join("\n")
  },

  /**
   * The CV's header contacts. Base64 at rest in both surfaces; the page decodes them at runtime,
   * so the print carries them but the source gives a scraper nothing.
   *
   * A link appears here when it carries a `display` — the form it reads as in print. That is a
   * property of the link, not a flag about which page it belongs to.
   *
   * @param {Pick<import("./profile.mjs").ProfileData, "contact" | "links" | "location">} profile
   * @returns {string}
   */
  cvContacts({ contact, links, location }) {
    return [
      `<a data-scheme="tel:" data-enc="${contact.telB64}" data-as="phone">phone</a>`,
      `<a data-scheme="mailto:" data-enc="${contact.emailB64}" data-as="plain">email</a>`,
      ...links
        .filter((link) => link.display)
        .map((link) => `<a href="${link.href}">${escape(link.display ?? "")}</a>`),
      `<span>${escape(location)}</span>`,
    ].join("\n")
  },

  /**
   * The site's SAVE POINT buttons: same payloads, but tap-to-reveal rather than auto-filled.
   *
   * @param {import("./profile.mjs").Contact} contact
   * @returns {string}
   */
  contactButtons(contact) {
    return [
      `<a class="btn iconbtn" id="tel" href="#reveal" role="button" aria-label="Show phone number" data-scheme="tel:" data-enc="${contact.telB64}">📞</a>`,
      `<a class="btn iconbtn" id="mail" href="#reveal" role="button" aria-label="Show email" data-scheme="mailto:" data-enc="${contact.emailB64}">📧</a>`,
    ].join("\n")
  },
}
