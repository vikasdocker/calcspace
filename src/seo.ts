import { byPath, calculators, categories, categoryPath, getCategory } from './calculators/catalog'

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
    case '/about': return { title: 'About CalcSpace', description: 'Learn about CalcSpace, a free collection of online calculators.', index: true }
    case '/privacy': return { title: 'Privacy policy | CalcSpace', description: 'How CalcSpace handles your data and privacy.', index: true }
    case '/contact': return { title: 'Contact CalcSpace', description: 'Get in touch with the CalcSpace team.', index: true }
    default: return { title: 'Page not found | CalcSpace', description: 'Find the calculator you need in the CalcSpace directory.', index: false }
  }
}

export const publicPaths = ['/', '/calculators', '/about', '/privacy', '/contact', ...categories.map(item => categoryPath(item.id)), ...calculators.map(item => item.path)]

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

export function breadcrumbSchema(pathname: string, base: string) {
  if (!base) return undefined
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const items: { name: string; item: string }[] = [{ name: 'Home', item: new URL('/', base).href }]
  if (normalized !== '/') {
    const calculator = byPath.get(normalized)
    const category = categories.find(item => categoryPath(item.id) === normalized)
    if (calculator) {
      items.push({ name: getCategory(calculator.category).name, item: new URL(categoryPath(calculator.category), base).href })
      items.push({ name: calculator.title, item: new URL(normalized, base).href })
    } else if (category) {
      items.push({ name: category.name, item: new URL(normalized, base).href })
    } else if (normalized === '/calculators') {
      items.push({ name: 'All calculators', item: new URL(normalized, base).href })
    }
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  }
}

export function faqSchema(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const calculator = byPath.get(normalized)
  if (!calculator) return undefined
  const faq = (calculator as { faq?: { question: string; answer: string } }).faq
  const guidanceFaq = faq ?? { question: 'How does this calculator work?', answer: calculator.description }
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: guidanceFaq.question,
      acceptedAnswer: { '@type': 'Answer', text: guidanceFaq.answer },
    }],
  }
}

export function websiteSchema(base: string) {
  if (!base) return undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CalcSpace',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/calculators?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}
