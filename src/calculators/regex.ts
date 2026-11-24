export type MatchSummary = { count: number; detail: string; truncated: boolean }

export function matchRegex(pattern: string, flags: string, source: string): MatchSummary {
  const regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
  const matches: string[] = []
  for (const match of source.matchAll(regex)) {
    if (matches.length >= 100) return { count: matches.length, detail: matches.join('\n'), truncated: true }
    const preview = (text: string | undefined) => text === undefined ? 'unmatched' : JSON.stringify(text.length > 160 ? text.slice(0,160) + '…' : text)
    const captures = match.slice(1, 21).map((value, index) => `${index + 1}: ${preview(value)}`)
    const names = Object.entries(match.groups ?? {}).slice(0, 20).map(([name, value]) => `${name}: ${preview(value)}`)
    matches.push(`@${match.index}  ${preview(match[0])}${captures.length ? '\n    Groups: ' + [...captures, ...names].join(', ') : ''}`)
  }
  return { count: matches.length, detail: matches.join('\n'), truncated: false }
}
