import { define, line, money, nonneg, num, option, percent, pos, requireInput, result, select, whole } from './core'
import { changePercent } from './math'

export function monthlyPayment(principal: number, annualRate: number, months: number) {
  const rate = annualRate / 1200
  const denominator = -Math.expm1(-months * Math.log1p(rate))
  return rate === 0 || denominator === 0 ? principal / months : principal * (rate / denominator)
}

function growth(rate: number, periods: number) {
  return Math.exp(periods * Math.log1p(rate))
}
function annuity(payment: number, rate: number, periods: number, beginning: boolean) {
  const exponent = periods * Math.log1p(rate)
  const multiplier = rate === 0 ? periods : Math.expm1(exponent) / rate
  return payment === 0 ? 0 : payment * multiplier * (beginning ? 1 + rate : 1)
}
const rate = (initial = 8.5) => num('rate', 'Annual rate (%)', initial, { min: 0, max: 100 })
const returnRate = (initial = 12) => num('rate', 'Annual return (%)', initial, { min: -99.99, max: 100 })
const months = (initial: number, minimum = 1) => whole('months', 'Term (months)', initial, minimum, 600)
const loanFields = [pos('principal', 'Loan amount (₹)', 500000), rate(), months(60)] as const
const loanFormula = 'EMI = P × r ÷ [1 − (1 + r)⁻ⁿ], with monthly rate r and n payments. At 0% interest, EMI = P ÷ n.'
const loanNote = 'Assumes a fixed interest rate, monthly reducing balance, end-of-month payments and no fees unless entered. Financial estimates are for planning.'
function loan(principal: number, annualRate: number, duration: number) {
  const payment = monthlyPayment(principal, annualRate, duration)
  const total = payment * duration
  return [money('Monthly EMI', payment), money('Total interest', Math.max(0, total - principal)), money('Total repayment', total)] as const
}
const compounding = select('frequency', 'Compounding', '4', [
  option('1', 'Annually'), option('2', 'Half-yearly'), option('4', 'Quarterly'), option('12', 'Monthly'), option('365', 'Daily'),
])
const timing = (initial = 'end') => select('timing', 'Contribution timing', initial, [option('end', 'End of period'), option('beginning', 'Beginning of period')])
const category = 'finance'

export function incomeTax(taxableIncome: number, regime: 'new' | 'old', ageGroup: string) {
  const oldBasic = ageGroup === '80+' ? 500000 : ageGroup === '60–79' ? 300000 : 250000
  const slabs: [number, number][] = regime === 'new'
    ? [[400000, 0], [800000, .05], [1200000, .10], [1600000, .15], [2000000, .20], [2400000, .25], [Infinity, .30]]
    : [[oldBasic, 0], [500000, .05], [1000000, .20], [Infinity, .30]]
  function baseTax(income: number) {
    let lower = 0
    let tax = 0
    for (const [upper, slabRate] of slabs) {
      tax += Math.max(0, Math.min(income, upper) - lower) * slabRate
      lower = upper
    }
    return tax
  }
  const base = baseTax(taxableIncome)
  const rebate = regime === 'new'
    ? taxableIncome <= 1200000 ? Math.min(base, 60000) : Math.max(0, base - (taxableIncome - 1200000))
    : taxableIncome <= 500000 ? Math.min(base, 12500) : 0
  const thresholds = regime === 'new' ? [5000000, 10000000, 20000000] : [5000000, 10000000, 20000000, 50000000]
  const surchargeRates = [.10, .15, .25, .37]
  const bracket = thresholds.findLastIndex(threshold => taxableIncome > threshold)
  let surcharge = 0
  if (bracket >= 0) {
    const threshold = thresholds[bracket]
    const thresholdTax = baseTax(threshold) * (1 + (surchargeRates[bracket - 1] ?? 0))
    surcharge = Math.max(0, Math.min(base * surchargeRates[bracket], thresholdTax + taxableIncome - threshold - base))
  }
  const cess = (base - rebate + surcharge) * .04
  const total = Math.round((base - rebate + surcharge + cess) / 10) * 10
  return { base, rebate, surcharge, cess, total }
}

export const financeCalculators = [
  define({ id: 'emi-calculator', title: 'Loan EMI Calculator', category, description: 'Find your monthly loan payment, total interest and repayment cost.', keywords: ['home loan', 'personal loan', 'mortgage', 'equated monthly instalment'],
    fields: loanFields, formula: loanFormula, note: loanNote,
    faq: { question: 'Does entering a longer term change the interest paid?', answer: 'For a fixed positive rate, a longer term generally lowers each EMI and increases total interest.' },
    calculate: ({ principal, rate, months }) => loan(principal, rate, months) }),
  define({ id: 'home-loan-calculator', title: 'Home Loan Calculator', category, description: 'Estimate a mortgage payment from the property price and down payment.', keywords: ['mortgage', 'housing loan', 'EMI', 'property finance'],
    fields: [pos('price','Property price (₹)', 6000000), nonneg('down','Down payment (₹)', 1200000), rate(), months(240)],
    formula: `Loan principal = property price − down payment. ${loanFormula}`, note: loanNote,
    calculate: ({ price, down, rate, months }) => {
      requireInput(down <= price, 'The down payment cannot exceed the property price.', 'down')
      const principal = price - down
      return result(...loan(principal, rate, months), money('Loan principal', principal), percent('Loan-to-value', principal / price * 100))
    } }),
  define({ id: 'personal-loan-calculator', title: 'Personal Loan Calculator', category, description: 'See your EMI and borrowing cost after an upfront processing fee.', keywords: ['unsecured loan', 'monthly instalments', 'EMI'],
    fields: [pos('principal','Loan amount (₹)', 300000), rate(12), months(36), nonneg('fee','Upfront processing fee (₹)', 3000)],
    formula: `${loanFormula} Net proceeds = principal − fee. Borrowing cost = interest + fee.`, note: loanNote,
    calculate: ({ principal, rate, months, fee }) => {
      requireInput(fee < principal, 'The fee must be lower than the loan amount.', 'fee')
      const [payment, interest, total] = loan(principal, rate, months)
      return result(payment, interest, total, money('Net proceeds', principal - fee), money('Total borrowing cost', Number(interest.value) + fee))
    } }),
  define({ id: 'loan-prepayment-calculator', title: 'Loan Prepayment Calculator', category, description: 'Estimate interest saved by paying down a loan balance today.', keywords: ['early repayment', 'part payment', 'extra principal'],
    fields: [pos('balance','Current balance (₹)', 1500000), rate(), months(120), nonneg('prepayment','Prepayment today (₹)', 200000),
      select('mode','After prepayment','term',[option('term','Keep EMI, reduce term'),option('payment','Keep term, reduce EMI')])],
    formula: 'Subtract the prepayment from principal. Recalculate the EMI for the original term or amortize the new balance with the old EMI and a smaller final payment.', note: 'Assumes payment before the next interest period. Excludes penalties and taxes. Financial estimate.',
    calculate: ({ balance, rate, months, prepayment, mode }) => {
      requireInput(prepayment <= balance, 'Prepayment cannot exceed the current balance.', 'prepayment')
      const previous = monthlyPayment(balance, rate, months)
      let principal = balance - prepayment
      let remaining = principal > 0 ? months : 0
      let next = 0
      let payments = 0
      if (remaining && mode === 'payment') {
        next = monthlyPayment(principal, rate, months)
        payments = next * months
      } else if (remaining) {
        next = Math.min(previous, principal * (1 + rate / 1200))
        remaining = 0
        while (principal > 0 && remaining < months) {
          const due = principal * (1 + rate / 1200)
          const finalPayment = remaining + 1 === months || due - previous <= previous * 1e-13
          const paid = finalPayment ? due : previous
          payments += paid
          principal = due - paid
          remaining++
        }
      }
      return result(money('Estimated interest saved', Math.max(0, previous * months - prepayment - payments)), money('Next monthly payment', next),
        line('Remaining term', remaining, 'months'), money('Original monthly EMI', previous), money('Future total payments', payments))
    } }),
  define({ id: 'sip-calculator', title: 'SIP Calculator', category, description: 'Project how regular monthly mutual fund investments might grow.', keywords: ['systematic investment plan', 'mutual fund', 'future value', 'monthly investment'],
    fields: [pos('payment','Monthly investment (₹)', 5000), returnRate(), months(120), timing('beginning')],
    formula: 'Future value = contribution × [(1 + r)ⁿ − 1] ÷ r, multiplied by (1 + r) for beginning-of-month deposits. Monthly r is annual input ÷ 12.',
    note: 'Uses a constant modeled return. Actual investment returns vary and can be negative. Fees and taxes are excluded.',
    calculate: ({ payment, rate, months, timing }) => {
      const future = annuity(payment, rate / 1200, months, timing === 'beginning')
      return result(money('Projected value', future), money('Amount invested', payment * months), money('Projected gain', future - payment * months))
    } }),
  define({ id: 'swp-calculator', title: 'SWP Calculator', category, description: 'Project your balance and withdrawals under a systematic withdrawal plan.', keywords: ['systematic withdrawal plan', 'monthly drawdown', 'retirement'],
    fields: [nonneg('principal','Starting balance (₹)', 1000000), pos('withdrawal','Monthly withdrawal (₹)', 12000), returnRate(8), months(120)],
    formula: 'Each month, grow the remaining balance by 1 + annual return ÷ 1200, then withdraw up to the available balance.',
    note: 'Uses steady modeled returns and end-of-month withdrawals. It excludes fees, taxes and market volatility.',
    calculate: ({ principal, withdrawal, rate, months }) => {
      let balance = principal
      let total = 0
      let fullyFunded = 0
      let depleted = 0
      for (let month = 1; month <= months && balance > 0; month++) {
        const available = balance * (1 + rate / 1200)
        const paid = Math.min(available, withdrawal)
        total += paid
        if (paid === withdrawal) fullyFunded++
        balance = available - paid
        if (balance === 0) depleted = month
      }
      return result(money('Remaining balance', balance), money('Total withdrawn', total), line('Full withdrawals', fullyFunded),
        line('Balance depletion', principal === 0 ? 'Starting balance is zero' : depleted ? `Month ${depleted}` : 'Balance remains at end of term'))
    } }),
  define({ id: 'fd-calculator', title: 'FD Calculator', category, description: 'Estimate the maturity value of a fixed deposit.', keywords: ['fixed deposit', 'bank interest', 'term deposit'],
    fields: [pos('principal','Deposit amount (₹)', 100000), rate(7), months(36, 0), compounding],
    formula: 'Maturity = principal × (1 + annual rate ÷ compounding frequency)^(frequency × years). Uses fractional periods for partial terms.',
    calculate: ({ principal, rate, months, frequency }) => {
      const periods = Number(frequency)
      const future = principal * growth(rate / 100 / periods, periods * months / 12)
      return result(money('Maturity value', future), money('Interest earned', future - principal))
    } }),
  define({ id: 'rd-calculator', title: 'RD Calculator', category, description: 'Estimate maturity for a monthly recurring deposit with quarterly compounding.', keywords: ['recurring deposit', 'bank savings', 'monthly installment'],
    fields: [pos('payment','Monthly deposit (₹)', 5000), rate(6.5), months(24), timing('beginning')],
    formula: 'Convert quarterly compounding to a monthly equivalent: r = (1 + annual rate/4)^(1/3) − 1. Compound and add each monthly contribution.',
    note: 'Uses fractional-quarter accumulation and regular monthly deposits. Bank day counts, rounding and missed installments can change maturity.',
    calculate: ({ payment, rate, months, timing }) => {
      const future = annuity(payment, Math.expm1(Math.log1p(rate / 400) / 3), months, timing === 'beginning')
      return result(money('Maturity value', future), money('Total deposited', payment * months), money('Interest earned', future - payment * months))
    } }),
  define({ id: 'ppf-calculator', title: 'PPF Calculator', category, description: 'Project the growth of annual contributions to an Indian Public Provident Fund.', keywords: ['public provident fund', 'small savings', 'India Post'],
    fields: [whole('payment','Annual deposit (₹)', 100000, 500, 150000), rate(7.1),
      select('years','Full financial years','15',['15','20','25','30','35','40','45','50'])],
    formula: 'A deposit at the start of each modeled financial year earns a full year of interest. Interest is credited annually and compounds.',
    note: 'Uses one deposit per year on or before 5 April and a constant editable rate. Actual PPF rates may change. The opening partial financial year is excluded.',
    calculate: ({ payment, rate, years }) => {
      requireInput(payment % 50 === 0, 'Enter a deposit in multiples of ₹50.', 'payment')
      const count = Number(years)
      const future = annuity(payment, rate / 100, count, true)
      return result(money('Projected balance', future), money('Total deposited', payment * count), money('Estimated interest', future - payment * count))
    } }),
  define({ id: 'compound-interest-calculator', title: 'Compound Interest Calculator', category, description: 'See how a lump sum grows as interest earns interest.', keywords: ['compounding', 'future value', 'APY'],
    fields: [nonneg('principal','Starting amount (₹)', 100000), returnRate(8), nonneg('years','Years', 10), compounding],
    formula: 'Amount = principal × (1 + r/m)^(m × years), where r is the annual nominal rate and m is periods per year.',
    calculate: ({ principal, rate, years, frequency }) => {
      const periods = Number(frequency)
      const future = principal === 0 || rate === 0 ? principal : principal * growth(rate / 100 / periods, periods * years)
      return result(money('Future value', future), money('Compound interest', future - principal),
        percent('Effective annual rate', Math.expm1(periods * Math.log1p(rate / 100 / periods)) * 100))
    } }),
  define({ id: 'simple-interest-calculator', title: 'Simple Interest Calculator', category, description: 'Calculate interest earned on the original principal over a fixed period.', keywords: ['flat interest', 'principal rate time'],
    fields: [nonneg('principal','Principal (₹)', 50000), rate(8), nonneg('years','Years', 2.5)],
    formula: 'Interest = principal × annual rate × years. Total = principal + interest.',
    calculate: ({ principal, rate, years }) => {
      const interest = principal * (rate / 100) * years
      return result(money('Simple interest', interest), money('Total amount', principal + interest))
    } }),
  define({ id: 'gst-calculator', title: 'GST Calculator', category, description: 'Add Indian GST to a price or extract the tax from an inclusive amount.', keywords: ['goods and services tax', 'CGST SGST IGST', 'tax inclusive'],
    fields: [nonneg('amount','Amount (₹)', 10000), num('rate','GST rate (%)', 18, { min: 0, max: 100 }), select('mode','Amount type','net',[option('net','Before GST'),option('gross','Including GST')]),
      select('supply','Supply location','local',[option('local','Intra-state (CGST + SGST/UTGST)'),option('interstate','Inter-state (IGST)')])],
    formula: 'Add GST by multiplying by 1 + rate/100. To remove GST, divide by that factor. For intra-state supplies, split the tax evenly.',
    note: 'Enter the rate that applies to the item or service. This calculator excludes compensation cess and invoice-specific adjustments.',
    calculate: ({ amount, rate, mode, supply }) => {
      const factor = 1 + rate / 100
      const net = mode === 'net' ? amount : amount / factor
      const gross = mode === 'net' ? net * factor : amount
      const tax = net * rate / 100
      return result(money(mode === 'net' ? 'Price including GST' : 'Price before GST', mode === 'net' ? gross : net), money('GST amount', tax),
        ...(supply === 'local' ? [money('CGST', tax / 2), money('SGST / UTGST', tax / 2)] : [money('IGST', tax)]))
    } }),
  define({ id: 'india-income-tax-estimator', title: 'India Income Tax Estimator', category, description: 'Compare Indian old and new regime tax on ordinary income for FY 2025–26 or FY 2026–27.', keywords: ['income tax India', 'tax slab', '87A', 'ITR', 'salary'],
    fields: [select('year','Financial year','2026',[option('2026','FY 2026–27 (Tax Year 2026–27)'),option('2025','FY 2025–26 (AY 2026–27)')]),
      nonneg('salary','Annual gross salary or taxable pension (₹)', 1500000), nonneg('other','Other slab-rate income (₹)', 0),
      select('age','Resident age group','Under 60',['Under 60','60–79','80+']), nonneg('old','Eligible deductions and exemptions, old regime (₹)', 150000), nonneg('new','Eligible deductions, new regime (₹)', 0)],
    formula: 'Subtract the applicable salary standard deduction (₹50,000 old or ₹75,000 new), limited to eligible salary, plus entered deductions. Apply slabs, resident rebate or marginal relief, surcharge relief and 4% cess.',
    note: 'For resident individuals with ordinary slab-rate income. Excludes special-rate gains, agricultural income, loss offsets, AMT, interest and penalties. For filing, verify the amount with the Income Tax Department’s official calculator.',
    faq: { question: 'Why can the estimates match for both years?', answer: 'The ordinary-income slabs, standard deductions, rebates and surcharge rules used here are the same for both years. The years fall under different Income Tax Acts.' },
    calculate: ({ salary, other, old, new: modern, age, year }) => {
      const oldTaxable = Math.max(0, Math.round((salary - Math.min(salary, 50000) + other - old) / 10) * 10)
      const newTaxable = Math.max(0, Math.round((salary - Math.min(salary, 75000) + other - modern) / 10) * 10)
      const oldTax = incomeTax(oldTaxable, 'old', age)
      const newTax = incomeTax(newTaxable, 'new', age)
      return result(money('New regime tax', newTax.total), money('Old regime tax', oldTax.total), money('New regime taxable income', newTaxable), money('Old regime taxable income', oldTaxable),
        money('Difference between regimes', Math.abs(oldTax.total - newTax.total)), line('Financial year', year === '2026' ? '2026–27' : '2025–26'))
    } }),
  define({ id: 'ctc-to-in-hand-salary', title: 'CTC to In-Hand Salary Calculator', category, description: 'Estimate monthly take-home pay from annual cost to company.', keywords: ['salary', 'net pay', 'take home', 'CTC', 'PF', 'TDS'],
    fields: [pos('ctc','Annual CTC (₹)', 1200000), nonneg('employer','Employer contributions and non-cash benefits (₹/year)', 60000),
      nonneg('bonus','Variable pay outside regular salary (₹/year)', 120000), nonneg('employee','Employee deductions except income tax (₹/year)', 48000), nonneg('tax','Income tax withheld from regular salary (₹/year)', 0)],
    formula: 'Regular annual gross = CTC − employer costs − variable pay. Regular annual take-home = gross − employee deductions − tax. Divide by 12 for a monthly average.',
    note: 'Use annual amounts from your compensation statement. Some employers pay or withhold amounts unevenly across months.',
    calculate: ({ ctc, employer, bonus, employee, tax }) => {
      const gross = ctc - employer - bonus
      const net = gross - employee - tax
      requireInput(net >= 0, 'The entered costs and deductions exceed annual CTC.')
      return result(money('Monthly take-home pay', net / 12), money('Annual take-home pay', net), money('Regular annual gross', gross))
    } }),
  define({ id: 'salary-hike-calculator', title: 'Salary Hike Calculator', category, description: 'Estimate your new salary and raise amount or compare two salaries.', keywords: ['salary raise', 'increment percentage', 'pay rise'],
    fields: [pos('salary','Current salary (₹)', 600000), select('mode','Calculate','amount',[option('amount','New salary from raise %'),option('rate','Raise % from new salary')]),
      num('rate','Raise (%)', 12, { min: -100, only: { key: 'mode', values: ['amount'] } }),
      num('next','New salary (₹)', 672000, { min: 0, only: { key: 'mode', values: ['rate'] } })],
    formula: 'New salary = current salary × (1 + raise/100). Raise % = (new − current) ÷ current × 100. Use the same pay period for both salaries.',
    calculate: ({ salary, rate, mode, next }) => {
      const updated = mode === 'amount' ? salary * (1 + rate / 100) : next
      return result(money('New salary', updated), money('Salary change', updated - salary), percent('Salary change rate', mode === 'amount' ? rate : changePercent(salary, updated)))
    } }),
  define({ id: 'inflation-calculator', title: 'Inflation Calculator', category, description: 'Estimate the future cost of today’s purchases and the purchasing power of a fixed amount.', keywords: ['purchasing power', 'cost of living', 'real value'],
    fields: [nonneg('amount','Amount today (₹)', 100000), num('rate','Annual inflation (%)', 6, { min: -99.99, max: 1000 }), nonneg('years','Years', 10)],
    formula: 'Future cost = amount × (1 + inflation)ʸ. Today’s buying power of the same future amount = amount ÷ (1 + inflation)ʸ.',
    calculate: ({ amount, rate, years }) => {
      const factor = growth(rate / 100, years)
      if (amount === 0) return result(money('Equivalent future cost', 0), money('Future amount in today’s rupees', 0))
      return result(money('Equivalent future cost', amount * factor), money('Future amount in today’s rupees', amount / factor))
    } }),
  define({ id: 'investment-return-calculator', title: 'Investment Return Calculator', category, description: 'Measure the total and annualized return on a single investment.', keywords: ['CAGR', 'annualized growth', 'investment performance'],
    fields: [pos('initial','Initial investment (₹)', 100000), nonneg('final','Final investment value (₹)', 165000), pos('years','Years held', 5)],
    formula: 'Total return = (final − initial) ÷ initial. CAGR = (final ÷ initial)^(1/years) − 1. Assumes no intervening cash flows.',
    calculate: ({ initial, final, years }) => result(percent('Annualized return', final === 0 ? -100 : Math.expm1((Math.log(final) - Math.log(initial)) / years) * 100),
      percent('Total return', changePercent(initial, final)), money('Gain or loss', final - initial)) }),
]
