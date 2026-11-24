import { byPath, calculators, categories, categoryPath } from './calculators/catalog'

export type PageInfo = { title: string; description: string; index: boolean; application?: string }
export function pageInfo(pathname: string): PageInfo {
  const path = pathname.replace(/\/+$/, '') || '/'
  const calculator = byPath.get(path)
  if (calculator) return { title: `${calculator.title} | CalcSpace`, description: calculator.description, index: true, application: calculator.title }
  const category = categories.find(item => categoryPath(item.id) === path)
  if (category) return { title: `${category.name} | CalcSpace`, description: `Explore CalcSpace tools for ${category.summary.toLowerCase()}.`, index: true }

  switch (path) {
    case '/': return { title: 'CalcSpace — All-in-one calculator workspace', description: 'Find free calculators for math, money, conversions, health, dates and developer tasks.', index: true }
    case '/calculators': return { title: 'All Calculators | CalcSpace', description: 'Browse and search the full CalcSpace calculator directory across eight categories.', index: true }
    case '/favorites': return { title: 'Favorites | CalcSpace', description: 'Open the calculators saved in this browser.', index: false }
    case '/history': return { title: 'History | CalcSpace', description: 'Review recent calculators and results saved in this browser.', index: false }
    default: return { title: 'Page not found | CalcSpace', description: 'Find the calculator you need in the CalcSpace directory.', index: false }
  }
}

export const publicPaths = ['/', '/calculators', ...categories.map(item => categoryPath(item.id)), ...calculators.map(item => item.path)]

export function siteOrigin(value: string | undefined) {
  if (!value) return ''
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('VITE_SITE_URL must be a public HTTP(S) origin without a path or credentials.')
  }
  return url.origin
}

export function structuredData(meta: PageInfo, base: string, path: string) {
  if (!meta.application) return undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: meta.application,
    description: meta.description,
    applicationCategory: 'UtilitiesApplication',
    browserRequirements: 'JavaScript',
    isAccessibleForFree: true,
    ...(base ? { url: new URL(path, base).href } : {}),
  }
}
