import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Breadcrumbs } from './components'

type Guide = { slug: string; title: string; description: string; body: ReactNode }

const guides: Guide[] = [
  {
    slug: 'how-to-calculate-emi',
    title: 'How to calculate a loan EMI',
    description: 'Understand the EMI formula, inputs and how prepayment affects your loan.',
    body: (<>
      <p>The equated monthly installment (EMI) is the fixed amount you pay each month to repay a loan. It depends on the principal, annual interest rate and tenure.</p>
      <p>Formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1), where P is principal, r is monthly rate and n is number of months.</p>
      <p>Use the <Link to="/calculators/emi-calculator" className="text-link">Loan EMI Calculator</Link> to try your own numbers, or the <Link to="/calculators/loan-prepayment-calculator" className="text-link">Loan Prepayment Calculator</Link> to see how extra payments reduce interest.</p>
    </>),
  },
  {
    slug: 'gst-calculation-guide',
    title: 'GST calculation: inclusive vs exclusive',
    description: 'Learn how to add or extract GST from a price.',
    body: (<>
      <p>GST can be added on top of a base price (exclusive) or included in a total (inclusive). For exclusive GST, final price = base × (1 + rate). For inclusive, base = total / (1 + rate).</p>
      <p>Try the <Link to="/calculators/gst-calculator" className="text-link">GST Calculator</Link> for both modes and to split CGST/SGST.</p>
    </>),
  },
  {
    slug: 'bmi-and-healthy-weight',
    title: 'BMI and healthy weight ranges',
    description: 'What BMI means and how to interpret the result.',
    body: (<>
      <p>BMI (Body Mass Index) is weight in kg divided by height in metres squared. It is a screening tool, not a diagnosis.</p>
      <p>Use the <Link to="/calculators/bmi-calculator" className="text-link">BMI Calculator</Link> and <Link to="/calculators/ideal-weight-calculator" className="text-link">Ideal Weight Calculator</Link> for a range based on height.</p>
    </>),
  },
  {
    slug: 'percentage-formulas',
    title: 'Common percentage formulas',
    description: 'Percent of, share of total, increase and decrease.',
    body: (<>
      <p>Percent of Y = Y × X ÷ 100. Share = X ÷ Y × 100. Increase = Y × (1 + X ÷ 100). Decrease = Y × (1 − X ÷ 100).</p>
      <p>Practice with the <Link to="/calculators/percentage-calculator" className="text-link">Percentage Calculator</Link> and <Link to="/calculators/percentage-change-calculator" className="text-link">Percentage Change Calculator</Link>.</p>
    </>),
  },
  {
    slug: 'unit-conversion-tips',
    title: 'Tips for accurate unit conversions',
    description: 'Avoid common mistakes when converting units.',
    body: (<>
      <p>Always check whether a unit is decimal or binary (KB vs KiB), and whether gallons are US or Imperial. Convert via a base unit when chaining conversions.</p>
      <p>Browse all <Link to="/categories/unit-converters" className="text-link">unit converters</Link>.</p>
    </>),
  },
]

export function Guides() {
  return <div className="page-width inner-page">
    <Breadcrumbs current="Guides"/>
    <div className="page-heading"><h1 tabIndex={-1}>Guides</h1><p>Short explainers to help you use the calculators.</p></div>
    <div className="card-grid">
      {guides.map(g => (
        <article key={g.slug} className="panel">
          <h2><Link to={`/guides/${g.slug}`} className="text-link">{g.title}</Link></h2>
          <p>{g.description}</p>
        </article>
      ))}
    </div>
  </div>
}

export function Guide({ slug }: { slug: string }) {
  const guide = guides.find(g => g.slug === slug)
  if (!guide) return null
  return <div className="page-width inner-page">
    <Breadcrumbs parent={{ to: '/guides', label: 'Guides' }} current={guide.title}/>
    <div className="page-heading"><h1 tabIndex={-1}>{guide.title}</h1><p>{guide.description}</p></div>
    <section className="panel">{guide.body}</section>
  </div>
}

export function GuideRoute() {
  const { slug } = useParams()
  return <Guide slug={slug ?? ''} />
}

export { guides }