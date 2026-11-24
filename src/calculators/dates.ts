import { define, InputError, line, option, requireInput, result, select, showFor, txt, whole } from './core'

export const dayMs = 86400000
const category = 'date'
const dateField = <K extends string>(key: K, label: string, initial: string) => txt(key, label, initial, { kind: 'date' })
const clockField = <K extends string>(key: K, label: string, initial: string) => txt(key, label, initial, { kind: 'time' })
const dateText = (time: number) => new Date(time).toISOString().slice(0, 10)
export const displayDate = (time: number) => {
  requireInput(Number.isFinite(time) && time >= -62135596800000 && time <= 253402300799999, 'The date is outside years 0001–9999.')
  return dateText(time)
}

export function parseDate(text: string, field?: string) {
  const milliseconds = Date.parse(`${text}T00:00:00Z`)
  requireInput(/^\d{4}-\d{2}-\d{2}$/.test(text) && !text.startsWith('0000') && Number.isFinite(milliseconds)
    && dateText(milliseconds) === text, 'Enter a valid calendar date in years 0001–9999.', field)
  return milliseconds
}

function inUtc(year: number, month: number, day: number) {
  const date = new Date(0)
  date.setUTCFullYear(year, month, day)
  return date.getTime()
}

export function addMonths(time: number, by: number) {
  const date = new Date(time)
  const first = new Date(inUtc(date.getUTCFullYear(), date.getUTCMonth() + by, 1))
  const last = new Date(inUtc(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return first.getTime() + (Math.min(last, date.getUTCDate()) - 1) * dayMs
}

export function calendarSpan(start: number, end: number) {
  requireInput(end >= start, 'The end date must be on or after the start date.', 'end')
  const from = new Date(start)
  const to = new Date(end)
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth()
  if (addMonths(start, months) > end) months--
  const remainder = (end - addMonths(start, months)) / dayMs
  return { years: Math.floor(months / 12), months: months % 12, days: remainder, totalDays: (end - start) / dayMs }
}
const spanLabel = ({ years, months, days }: ReturnType<typeof calendarSpan>) => `${years} yr · ${months} mo · ${days} d`

export function parseClock(text: string, field: string) {
  requireInput(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(text), 'Enter a valid 24-hour time.', field)
  const [hours, minutes, seconds = 0] = text.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

export function parseDateTime(text: string, field: string, millisecondPrecision = false) {
  const [date, time, extra] = text.split('T')
  requireInput(time && extra === undefined, 'Enter both a date and a time.', field)
  const [clock, fraction, excess] = time.split('.')
  requireInput(fraction === undefined || (millisecondPrecision && /^\d{1,3}$/.test(fraction) && excess === undefined
    && clock.length === 8), 'Use a valid time with up to three fractional digits for seconds.', field)
  return parseDate(date, field) + parseClock(clock, field) * 1000 + (fraction ? Number(fraction.padEnd(3,'0')) : 0)
}

function zoneFormatter(zone: string, field: string) {
  try {
    requireInput(/^(?:UTC|[A-Za-z][A-Za-z0-9_+/-]*)$/.test(zone), 'Enter an IANA time zone, such as Asia/Kolkata.', field)
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    })
  } catch {
    throw new InputError(`Unknown ${field === 'from' ? 'source' : 'target'} time zone. Use an IANA name such as Asia/Kolkata.`, field)
  }
}

function zoneParts(formatter: Intl.DateTimeFormat, timestamp: number) {
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({ type, value }) => [type, Number(value)]))
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second }
}

export function localToUtc(wall: number, zone: string, preference: string) {
  const formatter = zoneFormatter(zone, 'from')
  const wallAt = (timestamp: number) => {
    const { year, month, day, hour, minute, second } = zoneParts(formatter, timestamp)
    return inUtc(year, month - 1, day) + ((hour * 60 + minute) * 60 + second) * 1000
  }
  const offsets = new Set<number>()
  for (let hour = -36; hour <= 36; hour += 6) {
    const instant = wall + hour * 3600000
    offsets.add(wallAt(instant) - instant)
  }
  const possible = [...offsets].map(offset => wall - offset).filter(instant => wallAt(instant) === wall).sort((a, b) => a - b)
  requireInput(possible.length, 'This local time is skipped by a clock change. Choose another time.', 'datetime')
  requireInput(possible.length === 1 || preference !== 'reject', 'This local time occurs twice. Choose the earlier or later occurrence.', 'overlap')
  return possible[preference === 'later' ? possible.length - 1 : 0]
}

const startDate = dateField('start','Start date','2025-12-25')
const endDate = dateField('end','End date','2026-01-05')

export const dateCalculators = [
  define({ id: 'age-calculator', title: 'Age Calculator', category, also: ['daily'], description: 'Calculate your calendar age and total days between birth and a reference date.', keywords: ['birthday', 'date of birth', 'years old'],
    fields: [dateField('start','Date of birth','1995-08-15'),dateField('end','Age on date','2026-05-20')],
    formula: 'Count completed months, then remaining days. A month anniversary is clipped to the last valid day when needed.',
    faq: { question: 'How is a 29 February birthday handled?', answer: 'In a non-leap year, CalcSpace clips the February anniversary to 28 February. Legal age rules may use a different convention.' },
    calculate: ({ start, end }) => {
      const span = calendarSpan(parseDate(start, 'start'), parseDate(end, 'end'))
      return result(line('Calendar age', spanLabel(span)), line('Total elapsed days', span.totalDays, 'days'))
    } }),
  define({ id: 'date-difference-calculator', title: 'Date Difference Calculator', category, description: 'Compare two dates as calendar years, months, days and total elapsed time.', keywords: ['calendar interval', 'years between dates', 'date gap'],
    fields: [startDate,endDate], formula: 'Count whole months from the earlier date, clipping month-end anniversaries, then count remaining calendar days.',
    calculate: ({ start, end }) => {
      const a = parseDate(start, 'start')
      const b = parseDate(end, 'end')
      const span = calendarSpan(Math.min(a,b), Math.max(a,b))
      return result(line('Calendar difference', spanLabel(span)), line('Total elapsed days', span.totalDays, 'days'), line('Direction', a === b ? 'Same date' : b > a ? 'End date follows start date' : 'End date precedes start date'))
    } }),
  define({ id: 'date-add-subtract-calculator', title: 'Date Add / Subtract Calculator', category, description: 'Move a calendar date forward or backward by years, months, weeks and days.', keywords: ['add days', 'subtract weeks', 'future date', 'deadline'],
    fields: [dateField('start','Starting date','2026-01-31'),select('mode','Operation','add',[option('add','Add'),option('subtract','Subtract')]),
      whole('years','Years',0,0,9999),whole('months','Months',1,0,120000),whole('weeks','Weeks',0,0,520000),whole('days','Days',7,0,3660000)],
    formula: 'Apply years and months together, clipping the day to the end of the destination month. Then add or subtract weeks and days.',
    calculate: ({ start, mode, years, months, weeks, days }) => {
      const sign = mode === 'add' ? 1 : -1
      const date = addMonths(parseDate(start, 'start'), sign * (years * 12 + months)) + sign * (7 * weeks + days) * dayMs
      return result(line('Resulting date', displayDate(date)))
    } }),
  define({ id: 'days-between-dates', title: 'Days Between Dates', category, description: 'Count calendar days between two dates, with optional inclusion of both dates.', keywords: ['day count', 'inclusive days', 'calendar days'],
    fields: [startDate,endDate,select('inclusive','Count both dates','no',[option('no','No, elapsed days'),option('yes','Yes, inclusive days')])],
    formula: 'Elapsed days = absolute difference between dates. Including both dates adds one day, even when the dates are identical.',
    calculate: ({ start, end, inclusive }) => {
      const elapsed = Math.abs(parseDate(end, 'end') - parseDate(start, 'start')) / dayMs
      return result(line(inclusive === 'yes' ? 'Inclusive day count' : 'Elapsed days', elapsed + (inclusive === 'yes' ? 1 : 0), 'days'))
    } }),
  define({ id: 'time-duration-calculator', title: 'Time Duration Calculator', category, description: 'Measure the time between two clock times, including overnight shifts.', keywords: ['hours between times', 'shift length', 'elapsed time'],
    fields: [clockField('start','Start time','22:30'),clockField('end','End time','06:15'),
      select('mode','End time occurs','next',[option('same','On the same day'),option('next','On the following day')])],
    formula: 'Subtract start seconds from end seconds. Add 24 hours when the end is on the following day. This is a clock calculation without time-zone adjustments.',
    calculate: ({ start, end, mode }) => {
      const seconds = parseClock(end, 'end') - parseClock(start, 'start') + (mode === 'next' ? 86400 : 0)
      requireInput(seconds >= 0, 'Select following day if the end time is earlier than the start.', 'end')
      return result(line('Elapsed time', `${Math.floor(seconds / 3600)} h ${Math.floor(seconds / 60) % 60} min ${seconds % 60} s`), line('Total minutes', seconds / 60, 'min'), line('Total seconds', seconds, 's'))
    } }),
  define({ id: 'unix-timestamp-converter', title: 'Unix Timestamp Converter', category, description: 'Translate between Unix epoch timestamps and UTC date-times.', keywords: ['epoch', 'unix time', 'seconds milliseconds', 'POSIX'],
    fields: [select('mode','Convert','timestamp',[option('timestamp','Timestamp to UTC date'),option('date','UTC date to timestamp')]),
      txt('timestamp','Unix timestamp','1767225600',{ maxLength: 20, only: showFor('mode','timestamp') }),
      select('unit','Timestamp unit','seconds',['seconds','milliseconds']),
      txt('datetime','UTC date and time','2026-01-01T00:00',{ kind: 'datetime-local', only: showFor('mode','date') })],
    formula: 'Unix time counts seconds or milliseconds from 1970-01-01 00:00:00 UTC. Negative values represent earlier times. Seconds may have up to three decimal places.',
    calculate: ({ mode, timestamp, unit, datetime }) => {
      const multiplier = unit === 'seconds' ? 1000 : 1
      if (mode === 'date') return result(line('Unix timestamp', String(parseDateTime(datetime, 'datetime', true) / multiplier)))
      const cleaned = timestamp.trim()
      const valid = unit === 'seconds' ? /^[+-]?\d+(?:\.\d{1,3})?$/.test(cleaned) : /^[+-]?\d+$/.test(cleaned)
      requireInput(valid, unit === 'seconds' ? 'Enter seconds with up to three decimal places.' : 'Enter whole milliseconds.', 'timestamp')
      const instant = Math.round(Number(cleaned) * multiplier)
      displayDate(instant)
      return result(line('UTC date and time', new Date(instant).toISOString()))
    } }),
  define({ id: 'time-zone-converter', title: 'Time Zone Converter', category, description: 'Convert a local date and time between IANA time zones with daylight saving rules.', keywords: ['timezone', 'IST to EST', 'UTC', 'daylight saving', 'world clock'],
    fields: [txt('datetime','Local date and time','2026-01-15T09:00',{ kind: 'datetime-local' }),
      txt('from','From time zone','Asia/Kolkata',{ maxLength: 80, help: 'Use an IANA name, such as Asia/Kolkata or UTC.' }),
      txt('to','To time zone','America/New_York',{ maxLength: 80, help: 'Examples include America/New_York and Europe/London.' }),
      select('overlap','When the local time occurs twice','reject',[option('reject','Ask me to choose'),option('earlier','Use earlier occurrence'),option('later','Use later occurrence')])],
    formula: 'Resolve the source local time to a UTC instant using browser time-zone rules, then display that instant in the target zone.',
    faq: { question: 'Why can a time be skipped or repeated?', answer: 'Clock changes can skip a local time or make it occur twice. The overlap setting selects an occurrence when both are valid.' },
    calculate: ({ datetime, from, to, overlap }) => {
      const wall = parseDateTime(datetime, 'datetime')
      const year = new Date(wall).getUTCFullYear()
      requireInput(year >= 1900 && year <= 2099, 'Select a year from 1900 through 2099.', 'datetime')
      const instant = localToUtc(wall, from.trim(), overlap)
      return result(line('Local time in target zone', zoneFormatter(to.trim(), 'to').format(instant)), line('Target zone', to.trim()), line('UTC instant', new Date(instant).toISOString()))
    } }),
]
