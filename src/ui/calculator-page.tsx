import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeftRight, BookOpen, Calculator as CalculatorIcon, ChevronDown, CircleAlert, Copy, Delete, Link2, RotateCcw, Star } from 'lucide-react'
import { categoryPath, getCategory, relatedTo } from '../calculators/catalog'
import { formatValue, initialInputs, InputError, resultText, visible, type CalculationResult, type Calculator, type Field, type RawInputs } from '../calculators/core'
import { faqFor } from '../calculators/faq'
import { Breadcrumbs, CalculatorCard, CopyButton, SectionHeading, TileIcon } from './components'
import { useWorkspace } from './state'

const keypadRows = [
  ['(', ')', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', 'Delete', '='],
]
const scientificKeys = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', 'cbrt(', '^', 'π', 'e', 'abs(', '!']
const keyNames: Record<string,string> = { '(': 'Open parenthesis', ')':'Close parenthesis', '%':'Percent', '÷':'Divide', '×':'Multiply',
  '−':'Subtract', '+':'Add', '.':'Decimal point', '=':'Evaluate expression', 'sqrt(':'Square root', 'cbrt(':'Cube root', 'log(':'Base-10 logarithm',
  'ln(':'Natural logarithm', 'abs(':'Absolute value', 'sin(':'Sine', 'cos(':'Cosine', 'tan(':'Tangent', '^':'Power', 'π':'Pi', '!':'Factorial' }
const keyText: Record<string,string> = { 'sqrt(':'√', 'cbrt(':'∛', 'sin(':'sin', 'cos(':'cos', 'tan(':'tan', 'log(':'log', 'ln(':'ln', 'abs(':'abs', '^':'xʸ', '!':'x!', 'π':'π' }

function FieldControl({ field, id, value, error, update, onEscape, fractionalSeconds }: { field: Field; id: string; value: string; error?: string; update: (value: string) => void; onEscape?: () => void; fractionalSeconds?: boolean }) {
  const helpId = field.help ? id + '-help' : undefined
  const errorId = error ? id + '-error' : undefined
  const attributes = {
    id, name: field.key, value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [helpId,errorId].filter(Boolean).join(' ') || undefined,
  }
  return <div className={`field ${field.kind === 'textarea' ? 'field-wide' : ''}`}>
    <label htmlFor={id}>{field.label}</label>
    {field.kind === 'select' ? <div className="select-frame">
      <select {...attributes} onChange={event => update(event.target.value)}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <ChevronDown size={16} aria-hidden="true"/>
    </div> : field.kind === 'textarea' ? <textarea {...attributes} spellCheck={false} autoComplete="off" maxLength={field.maxLength} rows={5} onChange={event => update(event.target.value)}/>
      : <input {...attributes} type={field.kind === 'number' ? 'text' : field.kind} inputMode={field.kind === 'number' ? 'decimal' : undefined}
        step={field.kind === 'time' || field.kind === 'datetime-local' ? (fractionalSeconds ? .001 : 1) : undefined} autoComplete="off" spellCheck={false}
        placeholder={onEscape ? field.initial : undefined}
        maxLength={field.kind === 'number' ? 120 : field.maxLength} onChange={event => update(event.target.value)}
        onKeyDown={event => { if (onEscape && event.key === 'Escape') { event.preventDefault(); onEscape() } }}/>}
    {field.help && <small id={helpId}>{field.help}</small>}
    {error && <small className="field-error" id={errorId}>{error}</small>}
  </div>
}

function Example({ calculator }: { calculator: Calculator }) {
  const sample = useMemo(() => {
    if (calculator.example) return null
    const values = initialInputs(calculator.fields)
    const output = calculator.calculate(values)
    if (output instanceof Promise) return null
    return { values, output }
  }, [calculator])
  return <div className="example-panel">
    <h3>Worked example</h3>
    {calculator.example && <p className="example-custom">{calculator.example}</p>}
    {sample && <>
      <dl className="example-values">{calculator.fields.filter(field => visible(field,sample.values)).map(field =>
        <div key={field.key}><dt>{field.label}</dt><dd>{field.kind === 'select' ? field.options.find(option => option.value === field.initial)?.label : field.initial}</dd></div>)}</dl>
      <p className="example-result"><strong>{sample.output[0].label}</strong> <span>{formatValue(sample.output[0])}</span></p>
    </>}
  </div>
}

const calculationLabel = (calculator: Calculator) => calculator.keypad ? 'Calculator' : 'Inputs'
function startingValues(calculator: Calculator) {
  const values = initialInputs(calculator.fields)
  if (calculator.keypad) values.expression = ''
  return values
}

export function CalculatorPage({ calculator }: { calculator: Calculator }) {
  const { favorites, toggleFavorite, visit, record } = useWorkspace()
  const [values, setValues] = useState<RawInputs>(() => startingValues(calculator))
  const [output, setOutput] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<{ message: string; field?: string }>()
  const [busy, setBusy] = useState(false)
  const revision = useRef(0)
  const prefix = useId()
  const fieldId = (key: string) => `${prefix}-${key}`
  const resultHeading = useId()
  const fields = calculator.fields.filter(field => visible(field,values))
  const category = getCategory(calculator.category)
  const faq = faqFor(calculator)
  const isSaved = favorites.includes(calculator.id)
  const converter = calculator.category === 'convert' && fields.some(field => field.key === 'from') && fields.some(field => field.key === 'to')
  const notes = [calculator.category === 'health' ? 'Health results are estimates and cannot diagnose medical conditions.' : calculator.category === 'finance' ? 'Financial results are estimates for planning purposes.' : '',
    calculator.note, calculator.privateResult ? 'Inputs and results from this tool stay out of calculation history.' : ''].filter(Boolean)

  useEffect(() => {
    visit(calculator.id)
    return () => { revision.current++ }
    // The calculator page is keyed by id and records visits once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculator.id])

  function invalidate() {
    revision.current++
    setBusy(false)
    setError(undefined)
    setOutput(null)
  }
  function update(key: string, value: string) {
    invalidate()
    setValues(previous => ({ ...previous,[key]:value }))
  }
  function reset() {
    invalidate()
    setValues(startingValues(calculator))
  }
  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const request = ++revision.current
    setBusy(true)
    setError(undefined)
    setOutput(null)
    try {
      const next = await calculator.calculate(values)
      if (request !== revision.current) return
      setOutput(next)
      if (!calculator.privateResult) record(calculator.id,next)
    } catch (cause) {
      if (request !== revision.current) return
      const field = cause instanceof InputError ? cause.field : undefined
      setError({ message: cause instanceof Error ? cause.message : 'The calculation could not be completed.', field })
      if (field) document.getElementById(fieldId(field))?.focus()
    } finally {
      if (request === revision.current) setBusy(false)
    }
  }
  function insertKey(key: string) {
    const input = document.getElementById(fieldId('expression')) as HTMLInputElement | null
    if (!input) return
    let current = values.expression
    let start = document.activeElement === input ? input.selectionStart ?? current.length : current.length
    let end = document.activeElement === input ? input.selectionEnd ?? start : start
    if (typeof output?.[0].value === 'number' && key !== 'Delete') {
      current = /^[+−×÷^%!]/.test(key) ? String(output[0].value) : ''
      start = end = current.length
    }
    const insertion = key === 'Delete' ? '' : key
    if (key === 'Delete' && start === end && start > 0) start--
    update('expression',current.slice(0,start) + insertion + current.slice(end))
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + insertion.length,start + insertion.length) })
  }
  function today(key: string) {
    const date = new Date()
    const pad = (part: number) => String(part).padStart(2,'0')
    update(key,`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`)
  }

  return <div className="page-width inner-page calculator-page">
    <Breadcrumbs parent={{ to:categoryPath(category.id),label:category.nav }} current={calculator.title}/>
    <div className="page-heading heading-with-action calculator-heading">
      <div><TileIcon category={category.id} id={calculator.id} className="heading-icon"/>
        <h1 tabIndex={-1}>{calculator.title}</h1><p>{calculator.description}</p></div>
      <div className="page-actions">
        <button type="button" className="button button-secondary favorite-button" aria-pressed={isSaved} onClick={() => toggleFavorite(calculator.id)} aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}>
          <Star size={17}/><span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <CopyButton value={window.location.origin + calculator.path} icon={<Link2 size={17}/>} label="Share link" success="Link copied"/>
      </div>
    </div>
    <div className="calculation-layout">
      <form className="panel input-panel" onSubmit={calculate} noValidate>
        <div className="panel-title"><h2>{calculationLabel(calculator)}</h2>
          <button type="button" className="text-button" onClick={reset}><RotateCcw size={15}/>Reset</button>
        </div>
        <div className={`fields ${calculator.keypad ? 'keypad-fields' : ''} ${fields.length === 1 ? 'one-field' : ''}`}>
          {fields.map(field => <div key={field.key} className={field.kind === 'textarea' || field.key === 'expression' ? 'field-cell-wide' : undefined}>
            <FieldControl field={field} id={fieldId(field.key)} value={values[field.key]} update={value => update(field.key,value)}
              error={error?.field === field.key ? error.message : undefined} onEscape={field.key === 'expression' ? () => update('expression','') : undefined}
              fractionalSeconds={calculator.id === 'unix-timestamp-converter'}/>
            {field.key === 'end' && calculator.id === 'age-calculator' && <button type="button" className="text-button field-tool" onClick={() => today(field.key)}>Use today</button>}
          </div>)}
        </div>
        {converter && <button type="button" className="button button-secondary swap-button" onClick={() => {
          invalidate()
          setValues(previous => ({ ...previous,from:previous.to,to:previous.from }))
        }}><ArrowLeftRight size={17}/>Swap units</button>}
        {calculator.keypad && <div className="keypad" aria-label="Calculator keypad">
          {calculator.keypad === 'scientific' && <div className="scientific-keys">{scientificKeys.map(key =>
            <button className="key key-function" type="button" onMouseDown={event => event.preventDefault()} onClick={() => insertKey(key)} key={key} aria-label={keyNames[key] ?? key}>{keyText[key] ?? key}</button>)}</div>}
          <div className="number-keys">{keypadRows.flat().map(key =>
            <button className={`key ${key === '=' ? 'key-equals' : /^[+−×÷%()]/.test(key) ? 'key-operator' : ''}`} type={key === '=' ? 'submit' : 'button'}
              disabled={key === '=' && busy} onMouseDown={event => event.preventDefault()} onClick={key === '=' ? undefined : () => insertKey(key)} key={key} aria-label={keyNames[key] ?? key}>
              {key === 'Delete' ? <Delete size={19}/> : key}
            </button>)}</div>
        </div>}
        {error && <div className="error-box" role="alert"><CircleAlert size={18}/><span>{error.message}</span></div>}
        <button className="button button-primary calculate-button" disabled={busy} type="submit"><CalculatorIcon size={18}/>{busy ? 'Calculating…' : 'Calculate'}</button>
      </form>
      <section className="panel result-panel" aria-labelledby={resultHeading}>
        <div className="panel-title"><h2 id={resultHeading}>Result</h2>
          {output && <CopyButton key={revision.current} value={resultText(output)} icon={<Copy size={16}/>} label="Copy result"/>}
        </div>
        <div role="status" className={output ? 'result-ready' : 'result-empty'}>
          {output ? <div className="primary-result"><span>{output[0].label}</span>
            <output className={typeof output[0].value === 'string' && (output[0].value.length > 38 || output[0].value.includes('\n')) ? 'long-result' : undefined}>{formatValue(output[0])}</output>
          </div> : <><span className="result-icon"><CalculatorIcon size={26} strokeWidth={1.7}/></span>
            <p>{busy ? 'Calculating your result…' : 'Your result will appear here.'}</p></>}
        </div>
        {output && output.length > 1 && <dl className="secondary-results">{output.slice(1).map(item => <div key={item.label}><dt>{item.label}</dt><dd>{formatValue(item)}</dd></div>)}</dl>}
        {notes.length > 0 && <div className="calculation-notes">{notes.map(note => <p key={note}>{note}</p>)}</div>}
      </section>
    </div>
    <section className="panel guide">
      <div className="guide-formula"><h2><BookOpen size={20}/>How it works</h2><p>{calculator.formula}</p></div>
      <Example calculator={calculator}/>
    </section>
    <section className="home-section faq">
      <SectionHeading title="Frequently asked questions"/>
      <details><summary>{faq.question}<ChevronDown size={17}/></summary><p>{faq.answer}</p></details>
      <details><summary>How do I check the worked example?<ChevronDown size={17}/></summary>
        <p>{calculator.example || calculator.keypad ? 'Enter the inputs from the worked example above, then select Calculate.' : 'Select Reset to restore the worked example, then select Calculate. The result should match the example above.'}</p></details>
    </section>
    <section className="home-section">
      <SectionHeading title="Related calculators"/>
      <div className="card-grid">{relatedTo(calculator).map(related => <CalculatorCard key={related.id} calculator={related}/>)}</div>
    </section>
  </div>
}
