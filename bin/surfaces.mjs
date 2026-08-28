// @ts-check
import { Profile } from "./profile.mjs"
import { Render } from "./render.mjs"

/**
 * Which generated regions each published file carries. `gen` writes these and `check` compares
 * against them, so the two can never disagree about what belongs where.
 *
 * A surface renders the entities it speaks for — the data holds no presentation flags.
 */
export const Surfaces = {
  /**
   * @param {import("./profile.mjs").ProfileData} profile
   * @param {string} today  injected, so no renderer reads the clock and every run is reproducible
   * @returns {Record<string, Record<string, string>>}  file -> region -> rendered lines
   */
  render(profile, today) {
    return {
      "index.html": {
        office: Render.officeLine(Profile.currentRole(profile)),
        contacts: Render.contactButtons(profile.contact),
        links: Render.linkRows(profile.links),
        builds: Render.builds(profile.builds),
        "race-ticks": Render.raceTicks(profile.races, today),
        "race-list": Render.raceList(profile.races, today),
      },

      "cv.html": {
        contacts: Render.cvContacts(profile),
        headline: Render.cvHeadline(profile),
        experience: Render.cvExperience(profile.roles),
        projects: Render.cvProjects(profile.builds),
        education: Render.cvCredentials(profile.credentials),
        interests: Render.cvHighlights(profile.highlights),
      },
    }
  },
}
