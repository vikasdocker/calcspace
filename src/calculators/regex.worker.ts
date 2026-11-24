import { matchRegex } from './regex'

self.onmessage = (event: MessageEvent<{ pattern: string; flags: string; source: string }>) => {
  const { pattern, flags, source } = event.data
  try {
    self.postMessage({ result: matchRegex(pattern, flags, source) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'The expression could not be evaluated.' })
  }
}
