# fwg.fyi

Two published pages, one set of facts.

| | |
|---|---|
| `index.html` | the map — [fwg.fyi](https://fwg.fyi) |
| `cv.html` | the boring version — [fwg.fyi/cv](https://fwg.fyi/cv). Unlisted and `noindex`; nothing links to it |
| `lockin.html` | the 75-to-Hyrox tracker |
| `data/profile.json` | **the single source of truth** |

## Changing anything factual

Edit `data/profile.json`, then:

```sh
npm run gen      # writes the generated regions into index.html and cv.html,
                 # and re-prints the downloadable CV PDF (needs Chrome installed)
npm run check    # proves both files, and the PDF, agree with the data (the pre-push hook runs this)
npm test         # the renderers' unit tests
```

Never hand-edit between a `<!-- gen:… -->` and its `<!-- /gen -->` — the next `gen` overwrites it.
Everything outside those markers is hand-written and yours: the map's design and game logic, the
quest-log prose, and the Hall of Allies testimonial all live in `index.html`.

### What is shared, and what isn't

Only **facts** are shared. Voice is not: a build carries `blurb` for the site and `cvBullets` for the
CV, because a quest-log paragraph and a CV bullet should not read the same. The data holds no
`surfaces: […]` flags either — each page renders the entities it speaks for.

- **Both:** the builds, the current role's title and employer, and the contact payloads.
- **Site only:** the race calendar, and the quest-log narrative.
- **CV only:** previous roles, education, and interests.

### Two things that are derived, not stored

Race `done`/`upcoming` and each tick's position on the year bar are computed from the date when you
run `gen`. **So the day after a race, `check` will go red** — that is not drift, it is the calendar
moving. Run `npm run gen` and commit.

Build badges (`BUILDING` / `WRAPPED · JUL 2026`) come from a build's `end` date the same way.

## Contact details

Phone and email are base64 in `data/profile.json` and reach both pages as `data-enc` attributes —
never as plaintext in the page source. `check` fails the build if a readable one ever appears.

The map reveals them on tap. The CV fills them in on load instead, because a printed CV has to carry
them — verified: a headless print does include them.

## Enable the pre-push guard

Once per clone:

```sh
git config core.hooksPath bin/hooks
```

## The CV as a PDF

`Freddie_Gebbett_CV.pdf` is a **generated artefact, never a source** — the download button on the CV
page serves it directly, so a recruiter gets a file rather than a print dialog.

`npm run gen` re-prints it from `cv.html` whenever that page has changed, which means **`gen` needs a
Chromium-based browser installed locally** (Chrome, Chromium, Edge or Brave). It also writes
`Freddie_Gebbett_CV.pdf.stamp`, a hash of the page it printed.

`npm run check` compares that stamp to the current `cv.html` and fails if the PDF was built from an
older version — so a stale download cannot be pushed. **Checking only hashes, so it needs no
browser** and works on any machine.

The print CSS is tuned to hold everything on one A4 page; if you add much more, re-check that it
still does.

## Publishing

Push `main` — GitHub Pages serves it. `CNAME` holds the domain.
