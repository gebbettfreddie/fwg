// @ts-check

/**
 * Date formatting for the generated surfaces. Deliberately string-only — no `Date` parsing,
 * so a build in one timezone can never render a different month from a build in another.
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

/** @param {number} year */
const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/** @param {string} iso */
const parts = (iso) => {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) throw new Error(`NotAnIsoDate: ${iso}`)

  return { year, month: Number(month), day: Number(day) }
}

export const Dates = {
  /** "2026-07-31" -> "JUL 2026" */
  monthYearUpper(iso) {
    const { year, month } = parts(iso)

    return `${MONTHS_SHORT[month - 1].toUpperCase()} ${year}`
  },

  /** "2026-02-01" -> "February 2026" */
  monthYearLong(iso) {
    const { year, month } = parts(iso)

    return `${MONTHS_LONG[month - 1]} ${year}`
  },

  /** "2026-04-26" -> "26 Apr" */
  dayMonth(iso) {
    const { month, day } = parts(iso)

    return `${day} ${MONTHS_SHORT[month - 1]}`
  },

  /** "2026-12-02" -> "2 DEC" */
  dayMonthUpper(iso) {
    return Dates.dayMonth(iso).toUpperCase()
  },

  /**
   * How far through its year a date falls, as the CSS percentage the race track's ticks use.
   * Leap-year aware, so a tick never drifts by a day.
   *
   * @param {string} iso
   * @returns {string}
   */
  yearPercent(iso) {
    const { year, month, day } = parts(iso)

    const dayOfYear = DAYS_BEFORE_MONTH[month - 1] + day + (month > 2 && isLeap(Number(year)) ? 1 : 0)

    return ((dayOfYear / (isLeap(Number(year)) ? 366 : 365)) * 100).toFixed(1)
  },

  /**
   * @param {string} iso
   * @param {string} today
   * @returns {boolean}
   */
  hasPassed(iso, today) {
    return iso < today
  },
}
