import { describe, expect, it } from 'vitest'
import { byId, calculators, categories, categoryCount, relatedTo, searchCalculators } from './catalog'
import { initialInputs, type Calculator, type RawInputs } from './core'
import { faqFor } from './faq'
import { publicPaths, pageInfo, siteOrigin, structuredData } from '../seo'
import { incomeTax, monthlyPayment } from './finance'
import { matchRegex } from './regex'
import { formatJson, generatePassword, sha256, subnet } from './tech'

function definition(id: string): Calculator {
  const calculator = byId.get(id)
  if (!calculator) throw new Error(`Missing calculator: ${id}`)
  return calculator
}
function run(id: string, overrides: RawInputs = {}) {
  const calculator = definition(id)
  return calculator.calculate({ ...initialInputs(calculator.fields), ...overrides })
}

type Reference = [id: string, expected: number | string, inputs?: RawInputs]
const examples: Reference[] = [
  ['standard-calculator', 48],
  ['scientific-calculator', 12.5],
  ['percentage-calculator', 36],
  ['percentage-change-calculator', 25],
  ['fraction-calculator', '5/6'],
  ['lcm-calculator', '72'],
  ['hcf-gcd-calculator', '6'],
  ['prime-number-checker', 'Prime'],
  ['prime-factorization', '2^3 × 3^2 × 5'],
  ['square-and-cube-calculator', 49],
  ['square-root-and-cube-root', 8],
  ['logarithm-calculator', 3],
  ['equation-solver', 3],
  ['pythagorean-theorem', 5],
  ['circle-calculator', 78.53981633974483],
  ['triangle-calculator', 6],
  ['rectangle-and-square-calculator', 40],
  ['area-and-perimeter-calculator', 30],
  ['volume-calculator', 60],
  ['surface-area-calculator', 94],
  ['matrix-calculator', '19  22\n43  50'],
  // 1% monthly: 10000 × 0.01 × 1.01¹⁰ / (1.01¹⁰ − 1).
  ['emi-calculator', 1055.820765511714, { principal:'10000', rate:'12', months:'10' }],
  ['home-loan-calculator', 20000, { price:'340000', down:'100000', rate:'0', months:'12' }],
  ['personal-loan-calculator', 25000, { rate:'0', months:'12' }],
  // Four original payments of ~256.281094 minus 960 now and 40.40 next month.
  ['loan-prepayment-calculator', 24.724375646642, { balance:'1000', rate:'12', months:'4', prepayment:'960' }],
  // The three deposits accumulate to 51.005, 50.50 and 50.00.
  ['sip-calculator', 151.505, { payment:'50', rate:'12', months:'3', timing:'end' }],
  ['swp-calculator', 0, { principal:'275', withdrawal:'100', rate:'0', months:'3' }],
  ['fd-calculator', 1210, { principal:'1000', rate:'10', months:'24', frequency:'1' }],
  ['rd-calculator', 1200, { payment:'100', rate:'0', months:'12' }],
  ['ppf-calculator', 1500000, { rate:'0' }],
  ['compound-interest-calculator', 1210, { principal:'1000',rate:'10',years:'2',frequency:'1' }],
  ['simple-interest-calculator', 10000],
  ['gst-calculator', 11800],
  ['india-income-tax-estimator', 97500],
  ['ctc-to-in-hand-salary', 81000],
  ['salary-hike-calculator', 672000],
  ['inflation-calculator', 1210, { amount:'1000',rate:'10',years:'2' }],
  ['investment-return-calculator', 10, { initial:'100',final:'121',years:'2' }],
  ['profit-and-loss-calculator', 300],
  ['profit-margin-calculator', 36],
  ['markup-calculator', 25],
  ['roi-calculator', 30],
  ['break-even-calculator', '250'],
  ['product-selling-price-calculator', 769.2307692307693],
  ['commission-calculator', 11250],
  ['freelance-hourly-rate-calculator', 1000, { income:'850000', expenses:'0', hours:'20', weeks:'50', reserve:'15' }],
  ['discount-calculator', 1999.2],
  ['wholesale-to-retail-price-calculator', 400],
  ['business-revenue-calculator', 574848],
  ['tip-calculator', 150],
  ['bill-split-calculator', 550],
  ['fuel-cost-calculator', 2296.875],
  ['mileage-calculator', 16.8],
  ['electricity-bill-calculator', 2047.5],
  ['ratio-simplifier', '3 : 4'],
  ['shopping-discount-calculator', 1999.2],
  ['length-converter', 3.048],
  ['feet-to-meter', 3.048],
  ['inches-to-centimeter', 30.48],
  ['kilometer-to-mile', 6.21371192237334],
  ['weight-converter', 154.3235835294143],
  ['kilogram-to-pound', 22.04622621848776],
  ['temperature-converter', 77],
  ['area-converter', 40],
  ['square-feet-to-square-meter', 92.90304],
  ['acre-to-guntha', 80],
  ['acre-to-square-feet', 87120],
  ['volume-converter', 1.320860261790742],
  ['speed-converter', 62.1371192237334],
  ['time-converter', 2],
  ['digital-storage-converter', 1],
  ['mb-to-gb', 1.5],
  ['mbps-to-mb-s', 12.5],
  ['bmi-calculator', 23.51],
  ['ideal-weight-calculator', '56.7–76.3 kg'],
  ['body-fat-estimate', 29.7],
  ['bmr-calculator', 1503],
  ['tdee-calculator', 2329],
  ['daily-calorie-estimate', 2329],
  ['water-intake-estimate', 2.7],
  ['pregnancy-due-date-calculator', '2027-02-05'],
  ['sleep-cycle-calculator', '23:15 (previous day)'],
  ['running-pace-calculator', '5:18 min/km'],
  ['body-surface-area-calculator', 1.871],
  ['age-calculator', '30 yr · 9 mo · 5 d'],
  ['date-difference-calculator', '0 yr · 0 mo · 11 d'],
  ['date-add-subtract-calculator', '2026-03-07'],
  ['days-between-dates', 11],
  ['time-duration-calculator', '7 h 45 min 0 s'],
  ['unix-timestamp-converter', '2026-01-01T00:00:00.000Z'],
  ['time-zone-converter', '14/01/2026, 22:30:00'],
  ['ip-subnet-calculator', '192.168.1.0/24'],
  ['cidr-calculator', '10.0.5.128/26'],
  ['bandwidth-calculator', 133.33333333333334, { efficiency:'100' }],
  ['download-time-calculator', '0 h 13 min 20 s', { efficiency:'100' }],
  ['storage-capacity-calculator', '36000'],
  ['binary-to-decimal', '53'],
  ['decimal-to-hexadecimal', 'FFF'],
  ['number-base-converter', 'FF'],
  ['hex-to-rgb', 'rgb(105, 85, 232)'],
  ['rgb-to-hsl', 'hsl(248.16, 76.17%, 62.16%)'],
  ['sha-256-hash-generator', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['json-formatter-validator', '{"name":"CalcSpace","items":[1,2,3]}', { spacing:'compact' }],
]

describe('calculator inventory and numerical reference cases', () => {
  it('contains every tool with one shared Age route and unique search metadata', () => {
    expect(calculators).toHaveLength(105)
    expect(categories.map(category => categoryCount(category.id))).toEqual([21,17,11,17,11,7,14,8])
    expect(new Set(calculators.map(item => item.path)).size).toBe(calculators.length)
    expect(new Set(calculators.map(item => item.title)).size).toBe(calculators.length)
    expect(new Set(calculators.map(item => item.description)).size).toBe(calculators.length)
    expect(new Set(calculators.map(item => faqFor(item).question)).size).toBe(calculators.length)
    expect(examples.map(([id]) => id).concat('password-generator','regex-tester').sort()).toEqual(calculators.map(item => item.id).sort())
  })
  it.each(examples)('%s matches its reference example', async (id, expected, input) => {
    const output = await run(id,input)
    if (typeof expected === 'number') expect(output[0].value).toBeCloseTo(expected, 8)
    else expect(output[0].value).toBe(expected)
  })
})

describe('validation and edge cases', () => {
  const errors: [string, RawInputs, RegExp][] = [
    ['percentage-calculator',{ x:'15', y:'0', mode:'share' }, /nonzero/],
    ['percentage-calculator',{ x:'no' }, /finite number/],
    ['percentage-calculator',{ x:'1e-999' }, /too small/],
    ['percentage-change-calculator',{ previous:'0' }, /nonzero/],
    ['standard-calculator',{ expression:'5 / 0' }, /zero/],
    ['standard-calculator',{ expression:'document.cookie' }, /unexpected/i],
    ['scientific-calculator',{ expression:'tan(90)' }, /undefined/],
    ['scientific-calculator',{ expression:'171!' }, /0 to 170/],
    ['scientific-calculator',{ expression:'1e309' }, /outside the supported/],
    ['fraction-calculator',{ b:'1/0' }, /denominator/],
    ['fraction-calculator',{ b:'0', op:'÷' }, /zero fraction/],
    ['prime-number-checker',{ n:'1.5' }, /whole number/],
    ['logarithm-calculator',{ base:'1' }, /other than 1/],
    ['logarithm-calculator',{ n:'-2' }, /greater than zero/],
    ['square-and-cube-calculator',{ n:'1e200' }, /outside the supported/],
    ['square-and-cube-calculator',{ n:'1e-200' }, /too small/],
    ['triangle-calculator',{ c:'7' }, /cannot form/],
    ['pythagorean-theorem',{ mode:'leg',c:'3' }, /longer/],
    ['matrix-calculator',{ op:'inverse', a:'1 2\n2 4' }, /singular/],
    ['matrix-calculator',{ op:'multiply',b:'1 2 3' }, /columns/i],
    ['loan-prepayment-calculator',{ prepayment:'1500001' }, /cannot exceed/],
    ['ppf-calculator',{ payment:'505' }, /multiples/],
    ['ctc-to-in-hand-salary',{ employer:'1200001' }, /exceed/],
    ['break-even-calculator',{ variable:'500' }, /exceed/],
    ['product-selling-price-calculator',{ margin:'95' }, /less than 100/],
    ['tip-calculator',{ people:'0' }, /1 or more/],
    ['ratio-simplifier',{ ratio:'0:0' }, /greater than zero/],
    ['temperature-converter',{ from:'f',value:'-460' }, /absolute zero/],
    ['square-feet-to-square-meter',{ value:'-1' }, /0 or more/],
    ['age-calculator',{ end:'2024-02-30' }, /valid calendar date/],
    ['age-calculator',{ end:'1900-02-28' }, /on or after/],
    ['time-zone-converter',{ datetime:'2026-03-08T02:30',from:'America/New_York' }, /skipped/],
    ['time-zone-converter',{ datetime:'2026-11-01T01:30',from:'America/New_York' }, /occurs twice/],
    ['time-zone-converter',{ to:'Fake/Zone' }, /Unknown target/],
    ['ip-subnet-calculator',{ address:'256.0.0.0' }, /octets/],
    ['cidr-calculator',{ cidr:'192.168.0.0/33' }, /CIDR notation/],
    ['binary-to-decimal',{ value:'10201' }, /invalid in base 2/],
    ['hex-to-rgb',{ value:'#45678' }, /3- or 6-digit/],
    ['json-formatter-validator',{ source:'{"x":}' }, /JSON|Unexpected token/],
    ['password-generator',{ lower:'no',upper:'no',symbols:'no',numbers:'no' }, /at least one/],
  ]
  it.each(errors)('%s rejects the invalid input %j', (id, input, error) => {
    expect(() => run(id,input)).toThrow(error)
  })
  it.each([
    ['0.1 + 0.2', 0.3], ['-2^2', -4], ['2^3^2', 512], ['2(3+4)', 14],
    ['5! + 10%', 120.1], ['2.5e-9 / 10', 2.5e-10], ['sin(pi/2)', 1],
  ])('parses %s', async (expression, expected) => {
    const [output] = await run('scientific-calculator',{ expression,angle:'rad' })
    expect(output.value).toBe(expected)
  })
  it('preserves exact signed integer and rational arithmetic', async () => {
    expect((await run('fraction-calculator',{ a:'-3/-4',b:'1/12', op:'−' }))[0].value).toBe('2/3')
    expect((await run('hcf-gcd-calculator',{ numbers:'-99999999999999999999999999999 0' }))[0].value).toBe('99999999999999999999999999999')
    expect((await run('lcm-calculator',{ numbers:'-10 0 20' }))[0].value).toBe('0')
    expect((await run('number-base-converter',{value:'-9007199254740993',from:'10',to:'16'}))[0].value).toBe('-20000000000001')
  })
  it('solves complex roots and validates only fields used in the active mode', async () => {
    expect((await run('equation-solver',{ a:'1',b:'0',c:'4' }))[0].value).toBe('0 ± 2i')
    expect((await run('square-root-and-cube-root',{n:'-8'}))[0].value).toBe(-2)
    expect((await run('matrix-calculator',{ op:'inverse', a:'4 7\n2 6',b:'oops' }))[0].value).toBe('0.6  -0.7\n-0.2  0.4')
  })
  it('ceilings use the decimal break-even ratio, not a floating-point artefact', async () => {
    expect((await run('break-even-calculator',{ fixed:'0.3',price:'0.3',variable:'0.2' }))[0].value).toBe('3')
  })
  it('handles zero and very small loan rates and prepayment options', async () => {
    expect(monthlyPayment(1200,0,12)).toBe(100)
    expect(monthlyPayment(1200,1e-12,12)).toBeCloseTo(100,10)
    expect((await run('loan-prepayment-calculator',{ balance:'1000', prepayment:'1000',months:'10',rate:'0' }))[2].value).toBe(0)
    const changed = await run('loan-prepayment-calculator',{ balance:'1000',prepayment:'500',months:'10',rate:'0',mode:'payment' })
    expect(changed.map(item => item.value)).toEqual([0,50,10,100,500])
    expect((await run('swp-calculator',{ principal:'275',withdrawal:'100',rate:'0',months:'5' }))[1].value).toBe(275)
    expect((await run('sip-calculator',{ payment:'100',rate:'-12',months:'2',timing:'beginning' }))[0].value).toBeCloseTo(197.01)
  })
  it('applies tax rebates, age bands, marginal relief and cess', async () => {
    expect(incomeTax(1200000,'new','Under 60').total).toBe(0)
    expect(incomeTax(1210000,'new','Under 60').total).toBe(10400)
    expect(incomeTax(2400000,'new','Under 60').total).toBe(312000)
    expect(incomeTax(500000,'old','Under 60').total).toBe(0)
    expect(incomeTax(750000,'old','80+').total).toBe(52000)
    expect(incomeTax(5000100,'new','Under 60').surcharge).toBeCloseTo(70)
    for (const year of ['2025','2026']) {
      expect((await run('india-income-tax-estimator',{ year, salary:'1275000' }))[0].value).toBe(0)
    }
  })
  it('converts exact SI factors and preserves zero and small valid values', async () => {
    expect((await run('feet-to-meter',{value:'0'}))[0].value).toBe(0)
    expect((await run('length-converter',{value:'1e-80',from:'m',to:'mm'}))[0].value).toBeCloseTo(1e-77,85)
    expect((await run('temperature-converter',{value:'-459.67',from:'f',to:'k'}))[0].value).toBe(0)
    expect((await run('digital-storage-converter',{value:'1',from:'gb',to:'mb'}))[0].value).toBe(1000)
    expect((await run('digital-storage-converter',{value:'1',from:'gib',to:'mib'}))[0].value).toBe(1024)
    expect((await run('gst-calculator',{amount:'118',mode:'gross',supply:'interstate'})).map(item => Number(item.value))).toEqual([100,18,18])
  })
  it('handles leap years, equal dates, signed timestamps and DST overlaps', async () => {
    expect((await run('age-calculator',{ start:'2000-02-29', end:'2001-02-28' }))[0].value).toBe('1 yr · 0 mo · 0 d')
    expect((await run('days-between-dates',{ start:'2000-02-29', end:'2000-02-29',inclusive:'yes' }))[0].value).toBe(1)
    expect((await run('unix-timestamp-converter',{ timestamp:'-0.001' }))[0].value).toBe('1969-12-31T23:59:59.999Z')
    expect((await run('unix-timestamp-converter',{ mode:'date',datetime:'1969-12-31T23:59:59.999',unit:'milliseconds' }))[0].value).toBe('-1')
    const overlap = { datetime:'2026-11-01T01:30', from:'America/New_York',to:'UTC' }
    expect((await run('time-zone-converter',{ ...overlap,overlap:'earlier' }))[2].value).toBe('2026-11-01T05:30:00.000Z')
    expect((await run('time-zone-converter',{ ...overlap,overlap:'later' }))[2].value).toBe('2026-11-01T06:30:00.000Z')
  })
})

describe('developer utilities and discovery', () => {
  it('handles IPv4 boundary prefixes and the high half of the address space', () => {
    expect(subnet('255.255.255.255',0)[0].value).toBe('0.0.0.0/0')
    expect(subnet('203.0.113.43',31)[4].value).toBe('203.0.113.42 – 203.0.113.43')
    expect(subnet('203.0.113.43',31)[6].value).toBe(2)
    expect(subnet('255.255.255.255',32)[6].value).toBe(1)
  })
  it('keeps large JSON numbers, escaped text and repeated keys', () => {
    const input = '{"n":900719925474099312345,"n":1e999,"s":"a\\nb"}'
    expect(formatJson(input,'2')).toContain('900719925474099312345')
    expect(formatJson(input,'compact')).toBe(input)
    expect(formatJson(' { "x" : [ ] } ','2')).toBe('{\n  "x": []\n}')
  })
  it('uses cryptographic random bytes and includes each selected character set', () => {
    for (let i = 0; i < 10; i++) {
      const output = generatePassword(20,['ab','AB','12','!?'])
      expect(output).toMatch(/^[abAB12!?]{20}$/)
      for (const pattern of [/[ab]/,/[AB]/,/[12]/,/[!?]/]) expect(output).toMatch(pattern)
    }
  })
  it('digests empty input and scans options, captures, offsets and empty matches', async () => {
    expect(await sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    const summary = matchRegex('(?<num>\\d+)','g','Hello 42 and 12')
    expect(summary).toMatchObject({ count:2,truncated:false })
    expect(summary.detail).toContain('num: "42"')
    expect(matchRegex('', '', 'x'.repeat(105))).toMatchObject({ count:100,truncated:true })
    expect(() => matchRegex('[','','x')).toThrow()
  })
  it('supports alternative terms, category filtering, ordering and related tools', () => {
    expect(searchCalculators('home loan').map(item => item.id)).toEqual(expect.arrayContaining(['home-loan-calculator','emi-calculator']))
    expect(searchCalculators('gunta','convert')[0].id).toBe('acre-to-guntha')
    expect(searchCalculators('salary').map(item => item.id)).toEqual(expect.arrayContaining(['ctc-to-in-hand-salary','salary-hike-calculator']))
    expect(searchCalculators('gib')[0].id).toBe('digital-storage-converter')
    expect(searchCalculators('loan','health')).toEqual([])
    expect(searchCalculators('','daily','az')[0].id).toBe('age-calculator')
    expect(relatedTo(definition('emi-calculator')).map(item => item.id)).toContain('home-loan-calculator')
  })
  it('defines public paths, canonical origin validation and structured data', () => {
    expect(publicPaths).toHaveLength(124)
    expect(publicPaths).not.toContain('/history')
    expect(pageInfo('/calculators/emi-calculator/').title).toBe('Loan EMI Calculator | CalcSpace')
    expect(pageInfo('/no-such-page').index).toBe(false)
    expect(siteOrigin('https://calcspace.example/')).toBe('https://calcspace.example')
    expect(() => siteOrigin('https://calcspace.example/path')).toThrow()
    expect(structuredData(pageInfo('/converters/feet-to-meter'),'https://calcspace.example','/converters/feet-to-meter')?.url).toBe('https://calcspace.example/converters/feet-to-meter')
  })
})
