import { define, line, money, nonneg, num, option, percent, pos, requireInput, result, select, showFor } from './core'

const category = 'business'
const price = (initial = 1250) => nonneg('price','Selling price (₹)', initial)
const cost = (initial = 950) => nonneg('cost','Cost price (₹)', initial)
const boundedRate = <K extends string>(key: K, label: string, initial: number) => num(key, label, initial, { min: 0, max: 100 })
const discountFields = [nonneg('price','Original price (₹)', 2499), boundedRate('discount','Discount (%)', 20)] as const
const discountFormula = 'Discount amount = original price × discount rate ÷ 100. Sale price = original price − discount amount.'
export function discount(price: number, rate: number) {
  const savings = price * (rate / 100)
  return result(money('Sale price', price - savings), money('You save', savings))
}
export const discountDefinition = { fields: discountFields, formula: discountFormula, calculate: ({ price, discount: rate }: { price: number; discount: number }) => discount(price, rate) }

function priceFromMargin(cost: number, margin: number, fee: number) {
  requireInput(margin + fee < 100, 'Margin and fee rates must add up to less than 100%.', 'margin')
  return cost / (1 - (margin + fee) / 100)
}

function breakEvenUnits(fixed: number, price: number, variable: number) {
  // Match the decimal inputs before rounding up to a whole unit.
  const parts = [fixed, price, variable].map(value => {
    const [mantissa, exponent = '0'] = String(value).split('e')
    const fraction = mantissa.split('.')[1]?.length ?? 0
    return { coefficient: BigInt(mantissa.replace('.', '')), power: Number(exponent) - fraction }
  })
  const power = Math.min(...parts.map(part => part.power))
  const [overhead, revenue, cost] = parts.map(part => part.coefficient * 10n ** BigInt(part.power - power))
  const contribution = revenue - cost
  return (overhead + contribution - 1n) / contribution
}

export const businessCalculators = [
  define({ id: 'profit-and-loss-calculator', title: 'Profit and Loss Calculator', category, description: 'See whether a sale made a profit or loss and compare it with the original cost.', keywords: ['profit percentage', 'loss percent', 'cost selling price'],
    fields: [cost(), price()], formula: 'Profit or loss = selling price − cost. Return on cost = profit or loss ÷ cost × 100.',
    calculate: ({ cost, price }) => result(money(price >= cost ? 'Profit' : 'Loss', Math.abs(price - cost)),
      cost > 0 ? percent('Return on cost', (price - cost) / cost * 100) : line('Return on cost', 'Undefined when cost is zero')) }),
  define({ id: 'profit-margin-calculator', title: 'Profit Margin Calculator', category, description: 'Find what share of revenue remains after costs.', keywords: ['gross margin', 'gross profit', 'margin percentage'],
    fields: [pos('revenue','Revenue (₹)', 25000), nonneg('cost','Cost (₹)', 16000)], formula: 'Profit = revenue − cost. Profit margin = profit ÷ revenue × 100.',
    calculate: ({ revenue, cost }) => result(percent('Profit margin', (revenue - cost) / revenue * 100), money('Profit or loss', revenue - cost)) }),
  define({ id: 'markup-calculator', title: 'Markup Calculator', category, description: 'Calculate the percentage added to cost or find a price from a target markup.', keywords: ['markup percentage', 'pricing', 'cost plus'],
    fields: [pos('cost','Cost price (₹)', 800), select('mode','Calculate','markup',[option('markup','Markup from selling price'),option('price','Selling price from markup')]),
      num('price','Selling price (₹)', 1000, { min: 0, only: showFor('mode','markup') }), num('markup','Markup (%)', 25, { min: -100, only: showFor('mode','price') })],
    formula: 'Markup = (selling price − cost) ÷ cost × 100. Selling price = cost × (1 + markup ÷ 100).',
    faq: { question: 'How does markup differ from margin?', answer: 'Markup expresses profit as a percentage of cost. Margin expresses profit as a percentage of revenue.' },
    calculate: ({ cost, mode, price, markup }) => {
      const selling = mode === 'price' ? cost * (1 + markup / 100) : price
      const rate = mode === 'price' ? markup : (price - cost) / cost * 100
      return mode === 'price' ? result(money('Selling price', selling), percent('Markup', rate)) : result(percent('Markup', rate), money('Price difference', selling - cost))
    } }),
  define({ id: 'roi-calculator', title: 'ROI Calculator', category, description: 'Measure net gain or loss relative to the amount invested.', keywords: ['return on investment', 'investment efficiency', 'campaign ROI'],
    fields: [pos('cost','Investment cost (₹)', 50000), nonneg('proceeds','Total proceeds (₹)', 65000)], formula: 'ROI = (proceeds − investment cost) ÷ investment cost × 100. This is the total return over the period.',
    calculate: ({ cost, proceeds }) => result(percent('Return on investment', (proceeds - cost) / cost * 100), money('Net gain or loss', proceeds - cost)) }),
  define({ id: 'break-even-calculator', title: 'Break-Even Calculator', category, description: 'Find the sales volume needed to cover fixed and variable costs.', keywords: ['break even point', 'contribution margin', 'fixed cost'],
    fields: [nonneg('fixed','Fixed costs (₹)', 50000), pos('price','Selling price per unit (₹)', 500), nonneg('variable','Variable cost per unit (₹)', 300)],
    formula: 'Contribution per unit = unit price − variable unit cost. Break-even units = fixed costs ÷ contribution per unit, rounded up.',
    calculate: ({ fixed, price, variable }) => {
      requireInput(price > variable, 'The selling price must exceed the variable cost per unit.', 'variable')
      const contribution = price - variable
      const units = breakEvenUnits(fixed, price, variable)
      return result(line('Units to break even', String(units)), money('Sales at that volume', Number(units) * price), money('Contribution per unit', contribution))
    } }),
  define({ id: 'product-selling-price-calculator', title: 'Product Selling Price Calculator', category, description: 'Set a selling price that accounts for product costs, sales fees and a target margin.', keywords: ['target margin', 'product pricing', 'platform fee'],
    fields: [pos('cost','Total unit cost (₹)', 500), boundedRate('margin','Target profit margin (%)', 30), boundedRate('fee','Sales fee (% of sale)', 5)],
    formula: 'Price = unit cost ÷ (1 − margin rate − fee rate). Both percentages use the selling price as their base.',
    calculate: ({ cost, margin, fee }) => {
      const price = priceFromMargin(cost, margin, fee)
      return result(money('Target selling price', price), money('Profit per sale', price * (margin / 100)), money('Sales fee', price * (fee / 100)))
    } }),
  define({ id: 'commission-calculator', title: 'Commission Calculator', category, description: 'Calculate sales commission, optionally above a minimum sales threshold.', keywords: ['sales payout', 'agent earnings', 'commission rate'],
    fields: [nonneg('sales','Sales amount (₹)', 150000), boundedRate('rate','Commission rate (%)', 7.5), nonneg('threshold','Sales threshold (₹)', 0)],
    formula: 'Commission = max(0, sales − threshold) × rate ÷ 100.',
    calculate: ({ sales, rate, threshold }) => {
      const eligible = Math.max(0, sales - threshold)
      return result(money('Commission', eligible * (rate / 100)), money('Eligible sales', eligible))
    } }),
  define({ id: 'freelance-hourly-rate-calculator', title: 'Freelance Hourly Rate Calculator', category, description: 'Price billable time to cover annual income, business expenses and a reserve.', keywords: ['freelancer pricing', 'consultant rate', 'billable hours'],
    fields: [nonneg('income','Target annual income (₹)', 900000), nonneg('expenses','Annual overhead (₹)', 150000),
      num('hours','Billable hours per week', 25, { min: Number.MIN_VALUE, max: 168 }), num('weeks','Working weeks per year', 46, { min: Number.MIN_VALUE, max: 52.18 }),
      boundedRate('reserve','Reserve (% of revenue)', 15)],
    formula: 'Hourly rate = (target income + overhead) ÷ [billable hours per year × (1 − reserve rate)]. Use actual billable time.',
    calculate: ({ income, expenses, hours, weeks, reserve }) => {
      requireInput(reserve < 100, 'The reserve must be below 100%.', 'reserve')
      const revenue = (income + expenses) / (1 - reserve / 100)
      return result(money('Target hourly rate', revenue / hours / weeks), line('Annual billable hours', hours * weeks), money('Annual revenue target', revenue))
    } }),
  define({ id: 'discount-calculator', title: 'Discount Calculator', category, description: 'Find a sale price and savings from a percentage discount.', keywords: ['sale price', 'percent off', 'retail savings'], ...discountDefinition }),
  define({ id: 'wholesale-to-retail-price-calculator', title: 'Wholesale to Retail Price Calculator', category, description: 'Turn a wholesale price and per-unit costs into a retail price.', keywords: ['retail markup', 'landed cost', 'resale'],
    fields: [pos('wholesale','Wholesale unit price (₹)', 220), nonneg('expenses','Other unit costs (₹)', 30), nonneg('markup','Retail markup (%)', 60)],
    formula: 'Landed unit cost = wholesale price + other costs. Retail price = landed cost × (1 + markup ÷ 100).',
    calculate: ({ wholesale, expenses, markup }) => {
      const cost = wholesale + expenses
      return result(money('Suggested retail price', cost * (1 + markup / 100)), money('Landed cost', cost), money('Gross profit per unit', cost * (markup / 100)))
    } }),
  define({ id: 'business-revenue-calculator', title: 'Business Revenue Calculator', category, description: 'Estimate gross and net sales revenue from units, price and returns.', keywords: ['sales forecast', 'turnover', 'gross revenue', 'net sales'],
    fields: [nonneg('units','Units sold', 1200), nonneg('price','Average unit price (₹)', 499), boundedRate('deductions','Sales deductions (%)', 4)],
    formula: 'Gross revenue = units sold × average price. Net sales = gross revenue × (1 − deduction rate). Include returns and discounts in deductions.',
    calculate: ({ units, price, deductions }) => {
      const gross = units * price
      return result(money('Net sales revenue', gross * (1 - deductions / 100)), money('Gross sales revenue', gross), money('Sales deductions', gross * (deductions / 100)))
    } }),
]
