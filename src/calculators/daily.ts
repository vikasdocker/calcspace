import { define, line, money, nonneg, percent, pos, requireInput, result, txt, whole } from './core'
import { discountDefinition } from './business'
import { gcd } from './math'

const category = 'daily'
const amount = nonneg('amount','Bill subtotal (₹)', 1500)
const tipField = nonneg('tip','Tip (%)', 10)
const peopleField = whole('people','Number of people', 3, 1, 10000)
function bill(amount: number, tip: number, people: number) {
  const gratuity = amount * (tip / 100)
  const total = amount + gratuity
  return { gratuity, total, share: total / people }
}

export const dailyCalculators = [
  define({ id: 'tip-calculator', title: 'Tip Calculator', category, description: 'Find the tip, total bill and optional share per person.', keywords: ['gratuity', 'restaurant', 'service tip'],
    fields: [amount, tipField, whole('people','Number of people', 1, 1, 10000)], formula: 'Tip = subtotal × tip rate. Total = subtotal + tip. Each share = total ÷ people.',
    calculate: ({ amount, tip, people }) => {
      const { gratuity, total, share } = bill(amount, tip, people)
      return result(money('Tip amount', gratuity), money('Bill including tip', total), money('Per person', share))
    } }),
  define({ id: 'bill-split-calculator', title: 'Bill Split Calculator', category, description: 'Divide an expense equally and see how a tip affects everyone’s share.', keywords: ['split bill', 'group payment', 'splitwise'],
    fields: [amount, peopleField, tipField], formula: 'Per person = subtotal × (1 + tip rate) ÷ people. Displayed shares round to 2 decimal places.',
    calculate: ({ amount, tip, people }) => {
      const { gratuity, total, share } = bill(amount, tip, people)
      return result(money('Per person', share), money('Total bill', total), money('Tip amount', gratuity))
    } }),
  define({ id: 'fuel-cost-calculator', title: 'Fuel Cost Calculator', category, description: 'Budget for a drive from trip distance, fuel economy and fuel price.', keywords: ['petrol diesel', 'road trip', 'travel fuel'],
    fields: [nonneg('distance','Total trip distance (km)', 350), pos('economy','Fuel economy (km/L)', 16), nonneg('fuel','Fuel price (₹/L)', 105)],
    formula: 'Litres used = distance ÷ fuel economy. Fuel cost = litres used × price per litre. Include both legs for a round trip.',
    calculate: ({ distance, economy, fuel }) => result(money('Estimated fuel cost', distance / economy * fuel), line('Fuel required', distance / economy, 'L')) }),
  define({ id: 'mileage-calculator', title: 'Mileage Calculator', category, description: 'Measure fuel economy from distance travelled and fuel consumed.', keywords: ['fuel efficiency', 'kmpl', 'litres per 100 km'],
    fields: [nonneg('distance','Distance travelled (km)', 420), pos('fuel','Fuel used (L)', 25)], formula: 'Mileage = distance ÷ fuel. Consumption over 100 km = fuel ÷ distance × 100.',
    calculate: ({ distance, fuel }) => result(line('Fuel economy', distance / fuel, 'km/L'),
      distance > 0 ? line('Fuel consumption', fuel / distance * 100, 'L/100 km') : line('Fuel consumption', 'Undefined at zero distance')) }),
  define({ id: 'electricity-bill-calculator', title: 'Electricity Bill Calculator', category, description: 'Estimate a utility bill using consumption, a flat tariff and fixed charges.', keywords: ['power bill', 'kWh', 'electricity units'],
    fields: [nonneg('units','Energy used (kWh)', 240), nonneg('rate','Flat tariff (₹/kWh)', 7.5), nonneg('fixed','Fixed charges (₹)', 150), nonneg('tax','Tax or duty (%)', 5)],
    formula: 'Energy charge = usage × tariff. Add fixed charges, then apply the entered tax percentage to the subtotal.',
    note: 'Use an average tariff if your utility bills by tier. Actual bills may include credits, tiered tariffs and different tax bases.',
    calculate: ({ units, rate, fixed, tax }) => {
      const energy = units * rate
      const beforeTax = energy + fixed
      return result(money('Estimated bill', beforeTax * (1 + tax / 100)), money('Energy charge', energy), money('Fixed charges', fixed), money('Tax or duty', beforeTax * (tax / 100)))
    } }),
  define({ id: 'ratio-simplifier', title: 'Ratio Simplifier', category, description: 'Reduce two or more nonnegative whole-number terms to their lowest ratio.', keywords: ['proportion', 'simplify ratio', 'aspect ratio'],
    fields: [txt('ratio','Ratio', '42:56', { maxLength: 500, help: 'Separate terms with colons, such as 42:56.' })],
    formula: 'Divide every term by the greatest common divisor of all terms. At least one term must be greater than zero.',
    calculate: ({ ratio }) => {
      const parts = ratio.trim().split(/\s*:\s*/)
      requireInput(parts.length >= 2 && parts.length <= 10 && parts.every(part => /^\d{1,40}$/.test(part)), 'Enter 2–10 nonnegative whole numbers, separated by colons.', 'ratio')
      const values = parts.map(part => BigInt(part))
      const divisor = values.reduce(gcd)
      const total = values.reduce((sum, value) => sum + value, 0n)
      requireInput(divisor > 0n, 'At least one term must be greater than zero.', 'ratio')
      return result(line('Simplified ratio', values.map(value => String(value / divisor)).join(' : ')), percent('First term’s share', Number(values[0]) / Number(total) * 100))
    } }),
  define({ id: 'shopping-discount-calculator', title: 'Shopping Discount Calculator', category, description: 'Check the final shelf price and savings before you buy.', keywords: ['shopping sale', 'coupon', 'price after discount'], ...discountDefinition,
    faq: { question: 'How do I handle multiple discounts?', answer: 'Apply each discount to the price left by the previous one. Two successive 20% discounts take 36% off the original price.' } }),
]
