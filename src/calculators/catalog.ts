import type { Calculator, Category } from './core'
import { mathCalculators } from './math'
import { financeCalculators } from './finance'
import { businessCalculators } from './business'
import { converterCalculators } from './converters'
import { healthCalculators } from './health'
import { dateCalculators } from './dates'
import { techCalculators } from './tech'
import { dailyCalculators } from './daily'

export const categories = [
  { id: 'math', slug: 'mathematics-geometry', name: 'Mathematics & Geometry', nav: 'Mathematics', summary: 'Arithmetic, algebra and shapes', keywords: 'math geometry mathematics statistics' },
  { id: 'finance', slug: 'financial-calculators', name: 'Financial Calculators', nav: 'Finance', summary: 'Loans, taxes and investing', keywords: 'financial finance money savings' },
  { id: 'business', slug: 'business-calculators', name: 'Business Calculators', nav: 'Business', summary: 'Pricing, margins and revenue', keywords: 'business commerce sales pricing' },
  { id: 'convert', slug: 'unit-converters', name: 'Unit Converters', nav: 'Conversions', summary: 'Length, weight, area and more', keywords: 'convert converter conversion measurement units' },
  { id: 'health', slug: 'health-fitness', name: 'Health & Fitness', nav: 'Health & Fitness', summary: 'Body metrics, activity and sleep', keywords: 'health fitness wellness exercise' },
  { id: 'date', slug: 'date-time', name: 'Date & Time', nav: 'Date & Time', summary: 'Calendar dates, durations and zones', keywords: 'calendar date time duration' },
  { id: 'tech', slug: 'technology-developer-tools', name: 'Technology & Developer Tools', nav: 'Developer Tools', summary: 'Networks, data, code and colors', keywords: 'technology developer tools IT programming network' },
  { id: 'daily', slug: 'daily-life', name: 'Daily Life Calculators', nav: 'Daily Life', summary: 'Bills, shopping and travel', keywords: 'everyday daily life home' },
] as const

export const calculators = [
  ...mathCalculators, ...financeCalculators, ...businessCalculators, ...converterCalculators,
  ...healthCalculators, ...dateCalculators, ...techCalculators, ...dailyCalculators,
]
export const byId = new Map(calculators.map(calculator => [calculator.id, calculator]))
export const byPath = new Map(calculators.map(calculator => [calculator.path, calculator]))
export const getCategory = (id: Category) => categories.find(category => category.id === id)!
export const categoryPath = (category: Category) => `/categories/${getCategory(category).slug}`
export const belongsTo = (calculator: Calculator, category: Category) => calculator.category === category || Boolean(calculator.also?.includes(category))
export const categoryCount = (category: Category) => calculators.filter(calculator => belongsTo(calculator, category)).length
export const popularIds = ['scientific-calculator', 'emi-calculator', 'percentage-calculator', 'bmi-calculator', 'gst-calculator', 'age-calculator']
const featured = ['gst-calculator', 'acre-to-guntha', 'salary-hike-calculator']
export const suggestions = featured.map(id => byId.get(id)!)
export const popular = popularIds.map(id => byId.get(id)!)
const popularRank = new Map(popularIds.map((id, rank) => [id,rank]))
export type Sort = 'relevance' | 'az' | 'za' | 'popular'

const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim()
const index = calculators.map(calculator => {
  const category = getCategory(calculator.category)
  return {
    calculator, title: normalize(calculator.title), id: normalize(calculator.id),
    keywords: (calculator.keywords ?? []).map(normalize), description: normalize(calculator.description),
    category: normalize([category.name, category.keywords, ...(calculator.also ?? []).map(id => getCategory(id).name)].join(' ')),
  }
})
const stopwords = new Set(['to','of','a','the','and','for'])
const containsToken = (haystack: string, token: string) => haystack.split(' ').some(word => word.startsWith(token))
export function searchCalculators(query: string, category?: Category, sort: Sort = 'relevance') {
  const phrase = normalize(query)
  const tokens = phrase.split(' ').filter(token => token && !stopwords.has(token))
  const terms = tokens.length ? tokens : phrase ? [phrase] : []
  return index.flatMap(entry => {
    if (category && !belongsTo(entry.calculator, category)) return []
    const scores = terms.map(token => {
      if (containsToken(entry.title, token)) return 10
      if (containsToken(entry.id, token)) return 8
      if (entry.keywords.some(keyword => containsToken(keyword, token))) return 6
      if (containsToken(entry.description, token)) return 3
      return containsToken(entry.category, token) ? 1 : 0
    })
    if (scores.some(score => score === 0)) return []
    const bonus = phrase && (entry.title === phrase ? 60 : entry.title.includes(phrase) ? 25 : entry.keywords.some(keyword => keyword.includes(phrase)) ? 15 : 0)
    return [{ calculator: entry.calculator, rank: scores.reduce<number>((a,b) => a + b,0) + Number(bonus) }]
  }).sort((a,b) => {
    const alphabetic = a.calculator.title.localeCompare(b.calculator.title)
    if (sort === 'az') return alphabetic
    if (sort === 'za') return -alphabetic
    const featuredOrder = (popularRank.get(a.calculator.id) ?? 100) - (popularRank.get(b.calculator.id) ?? 100)
    if (sort === 'popular') return featuredOrder || b.rank - a.rank || alphabetic
    return b.rank - a.rank || featuredOrder || alphabetic
  }).map(entry => entry.calculator)
}

const affinities = [
  ['emi-calculator','home-loan-calculator','personal-loan-calculator','loan-prepayment-calculator'],
  ['salary-hike-calculator','ctc-to-in-hand-salary','india-income-tax-estimator'],
  ['sip-calculator','swp-calculator','investment-return-calculator','compound-interest-calculator'],
  ['profit-and-loss-calculator','profit-margin-calculator','markup-calculator','product-selling-price-calculator','break-even-calculator'],
  ['area-converter','acre-to-guntha','acre-to-square-feet','square-feet-to-square-meter','area-and-perimeter-calculator'],
  ['length-converter','feet-to-meter','inches-to-centimeter','kilometer-to-mile'],
  ['bmi-calculator','ideal-weight-calculator','body-fat-estimate','body-surface-area-calculator'],
  ['bmr-calculator','tdee-calculator','daily-calorie-estimate'],
  ['age-calculator','date-difference-calculator','date-add-subtract-calculator','days-between-dates'],
  ['ip-subnet-calculator','cidr-calculator','bandwidth-calculator','download-time-calculator'],
  ['mbps-to-mb-s','bandwidth-calculator','download-time-calculator','mb-to-gb','digital-storage-converter'],
  ['number-base-converter','binary-to-decimal','decimal-to-hexadecimal','hex-to-rgb','rgb-to-hsl'],
  ['discount-calculator','shopping-discount-calculator','gst-calculator','percentage-calculator'],
]
export function relatedTo(calculator: Calculator) {
  const explicit = affinities.filter(group => group.includes(calculator.id)).flat()
  const nearby = calculators.filter(other => other.category === calculator.category).map(other => other.id)
  return [...new Set([...explicit, ...nearby])].filter(id => id !== calculator.id).slice(0,3).map(id => byId.get(id)!)
}
