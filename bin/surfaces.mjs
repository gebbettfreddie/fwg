// @ts-check
import { Homes } from "./home.mjs"
import { Profile } from "./profile.mjs"
import { Render } from "./render.mjs"

/**
 * Which generated regions each surface carries, where it lives, and what it prints. `gen` writes
 * these and `check` compares against them, so the two can never disagree about what belongs where.
 *
 * A surface renders the entities it speaks for — the data holds no presentation flags.
 *
 * @typedef {{ file: string, home: import("./home.mjs").Home, regions: Record<string, string>, prints?: string }} Surface
 *   `prints` names the PDF printed from the page, kept beside it in the same home.
 */

export const Surfaces = {
  /**
   * @param {import("./profile.mjs").ProfileData} profile
   * @param {string} today  injected, so no renderer reads the clock and every run is reproducible
   * @returns {Surface[]}
   */
  render(profile, today) {
    return [
      {
        file: "index.html",
        home: "published",
        regions: {
          office: Render.officeLine(Profile.currentRole(profile)),
          contacts: Render.contactButtons(profile.contact),
          links: Render.linkRows(profile.links),
          builds: Render.builds(profile.builds),
          "race-ticks": Render.raceTicks(profile.races, today),
          "race-list": Render.raceList(profile.races, today),
        },
      },

      {
        file: "cv.html",
        home: "private",
        prints: "Freddie_Gebbett_CV.pdf",
        regions: {
          contacts: Render.cvContacts(profile),
          headline: Render.cvHeadline(profile),
          experience: Render.cvExperience(profile.roles),
          projects: Render.cvProjects(profile.builds),
          education: Render.cvCredentials(profile.credentials),
          interests: Render.cvHighlights(profile.highlights),
        },
      },
    ]
  },

  /**
   * The surfaces split by whether their home is on this machine. A surface whose home is absent is
   * reported and skipped by both `gen` and `check` — the site must build from a clone that has never
   * seen the CV.
   *
   * @param {Surface[]} surfaces
   * @returns {{ present: Surface[], absent: Surface[] }}
   */
  locate(surfaces) {
    const present = surfaces.filter((surface) => Homes.exists(surface.home))
    const absent = surfaces.filter((surface) => !present.includes(surface))

    for (const surface of absent) console.log(`– ${surface.file} — ${surface.home} home not found at ${Homes.root(surface.home)}, skipped`)

    return { present, absent }
  },

  /**
   * Every file a surface owns: the page, and the print and its stamp when it has one.
   *
   * @param {Surface} surface
   * @returns {string[]}
   */
  files(surface) {
    return surface.prints ? [surface.file, surface.prints, `${surface.prints}.stamp`] : [surface.file]
  },
}
