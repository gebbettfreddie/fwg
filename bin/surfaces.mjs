// @ts-check
import { Profile } from "./profile.mjs"
import { Render } from "./render.mjs"

/**
 * Which generated regions each surface carries, and where that surface lives. `gen` writes these
 * and `check` compares against them, so the two can never disagree about what belongs where.
 *
 * A surface renders the entities it speaks for — the data holds no presentation flags.
 *
 * @typedef {{ file: string, home: import("./home.mjs").Home, regions: Record<string, string> }} Surface
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
}
