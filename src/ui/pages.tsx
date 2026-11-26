import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calculator, ChevronDown, Copy, Divide, Equal, Minus, Plus, Search, Sparkles, Star, Trash2, X } from 'lucide-react'
import { byId, calculators, categories, getCategory, popular, searchCalculators, suggestions, type Sort } from '../calculators/catalog'
import { formatValue, resultText, type Category } from '../calculators/core'
import { Breadcrumbs, CalculatorCard, CategoryCard, CopyButton, Empty, SearchBox, SectionHeading, TileIcon } from './components'
import { useWorkspace } from './state'
import { useLanguage } from '../i18n'

function HeroIllustration() {
  return <div className="hero-illustration" aria-hidden="true">
    <div className="hero-orbit orbit-outer"/><div className="hero-orbit orbit-inner"/>
    <div className="art-chip art-percent">%</div><div className="art-chip art-root">√</div>
    <div className="art-chip art-pi">π</div>
    <Sparkles className="art-spark spark-one" size={24}/><Sparkles className="art-spark spark-two" size={17}/>
    <div className="art-point point-one"/><div className="art-point point-two"/>
    <div className="art-calculator">
      <div className="art-display"><span>8 × 3</span><strong>24<span>.</span></strong></div>
      <div className="art-keys">
        <i>7</i><i>8</i><i>9</i><i><Divide size={14}/></i>
        <i>4</i><i>5</i><i>6</i><i><X size={14}/></i>
        <i>1</i><i>2</i><i>3</i><i><Minus size={14}/></i>
        <i>0</i><i>.</i><i><Plus size={14}/></i><i><Equal size={15}/></i>
      </div>
    </div>
  </div>
}

export function Home() {
  const { favorites, recents } = useWorkspace()
  const { t } = useLanguage()
  return <div className="home page-width">
    <section className="hero">
      <div className="hero-backdrop"/>
      <div className="hero-content">
        <h1 tabIndex={-1}>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        <SearchBox variant="hero"/>
        <div className="quick-links"><span>Try</span>{suggestions.map(calculator => <Link to={calculator.path} key={calculator.id}>
          {({ 'gst-calculator':'GST', 'acre-to-guntha':'Acre to guntha', 'salary-hike-calculator':'Salary hike' } as Record<string,string>)[calculator.id]}
        </Link>)}</div>
      </div>
      <HeroIllustration/>
    </section>
    <section className="home-section" aria-labelledby="popular-heading">
      <div className="section-heading"><div><h2 id="popular-heading">{t('home.popular')}</h2><p>A quick start for common calculations.</p></div>
        <Link className="text-link" to="/calculators">View all calculators</Link></div>
      <div className="card-grid">{popular.map(calculator => <CalculatorCard key={calculator.id} calculator={calculator}/>)}</div>
    </section>
    <section className="home-section">
      <SectionHeading title={t('home.categories')} subtitle="Find the tools for the numbers you’re working with."/>
      <div className="category-grid">{categories.map(category => <CategoryCard key={category.id} category={category.id}/>)}</div>
    </section>
    <section className="home-section">
      <SectionHeading title="Recently used" action={recents.length > 0 && <Link to="/history" className="text-link">View history</Link>}/>
      {recents.length ? <div className="card-grid">{recents.slice(0,3).map(id => <CalculatorCard key={id} calculator={byId.get(id)!}/>)}</div>
        : <Empty title="No recent calculators">Calculators you open will appear here.</Empty>}
    </section>
    <section className="home-section">
      <SectionHeading title="Favorites" action={favorites.length > 0 && <Link to="/favorites" className="text-link">View favorites</Link>}/>
      {favorites.length ? <div className="card-grid">{favorites.slice(0,3).map(id => <CalculatorCard key={id} calculator={byId.get(id)!}/>)}</div>
        : <Empty title="No saved calculators">Select the star on any calculator to keep it handy.</Empty>}
    </section>
  </div>
}

const order = ['relevance','az','za','popular'] as const
export function Directory({ fixedCategory }: { fixedCategory?: Category }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const selectedCategory = categories.find(item => item.id === params.get('category'))?.id
  const sort = order.find(item => item === params.get('sort')) ?? 'relevance'
  const category = fixedCategory ?? selectedCategory
  const detail = fixedCategory ? getCategory(fixedCategory) : undefined
  const available = searchCalculators(query,category,sort)
  const title = detail?.name ?? 'All calculators'
  function update(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params)
    if (value) next.set(key,value)
    else next.delete(key)
    setParams(next,{ replace })
  }
  return <div className="page-width inner-page">
    <Breadcrumbs parent={detail ? { to:'/calculators', label:'All calculators' } : undefined} current={title}/>
    <div className="page-heading">
      {detail && <TileIcon category={detail.id} className="heading-icon"/>}
      <h1 tabIndex={-1}>{title}</h1>
      <p>{detail ? detail.summary + '.' : `Search ${calculators.length} tools across eight categories.`}</p>
    </div>
    <div className="directory-controls">
      <label className="directory-search"><Search size={19}/><span className="sr-only">Filter calculators</span>
        <input type="search" value={query} onChange={event => update('q',event.target.value,true)} placeholder="Search by name or keyword…"/></label>
      {!detail && <label className="select-frame"><span className="sr-only">Filter by category</span>
        <select value={selectedCategory ?? ''} onChange={event => update('category',event.target.value)}>
          <option value="">All categories</option>
          {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select><ChevronDown size={16}/></label>}
      <label className="select-frame"><span className="sr-only">Sort calculators</span>
        <select value={sort} onChange={event => update('sort', (event.target.value as Sort) === 'relevance' ? '' : event.target.value)}>
          <option value="relevance">Recommended</option><option value="az">Name A–Z</option><option value="za">Name Z–A</option><option value="popular">Popular first</option>
        </select><ChevronDown size={16}/></label>
    </div>
    <p className="results-count" role="status">{available.length} {available.length === 1 ? 'calculator' : 'calculators'}{query.trim() && ` for “${query.trim()}”`}</p>
    {available.length > 0 ? <div className="card-grid">{available.map(calculator => <CalculatorCard key={calculator.id} calculator={calculator}/>)}</div>
      : <Empty title="No calculators found">Try a shorter term or change the category.</Empty>}
  </div>
}

export function Favorites() {
  const { favorites } = useWorkspace()
  return <div className="page-width inner-page">
    <Breadcrumbs current="Favorites"/>
    <div className="page-heading"><h1 tabIndex={-1}>Favorites</h1><p>Open calculators you’ve saved in this browser.</p></div>
    {favorites.length ? <div className="card-grid">{favorites.map(id => <CalculatorCard key={id} calculator={byId.get(id)!}/>)}</div>
      : <div className="empty large-empty"><Star size={24}/><h2>No favorites yet</h2><p>Select the star on any calculator to save it here.</p><Link to="/calculators" className="button button-primary">Browse calculators</Link></div>}
  </div>
}

export function History() {
  const { history, recents, clearHistory } = useWorkspace()
  const [confirm, setConfirm] = useState(false)
  return <div className="page-width inner-page">
    <Breadcrumbs current="History"/>
    <div className="page-heading heading-with-action"><div><h1 tabIndex={-1}>History</h1><p>Review recent calculators and up to 40 saved results.</p></div>
      {(history.length > 0 || recents.length > 0) && <button className="button button-secondary" type="button" onClick={() => setConfirm(value => !value)}><Trash2 size={16}/>Clear history</button>}
    </div>
    {confirm && <div className="confirm" role="group" aria-label="Clear history confirmation">
      <p>Delete saved results and recently used calculators from this browser?</p>
      <button type="button" className="button button-secondary" onClick={() => setConfirm(false)}>Cancel</button>
      <button type="button" className="button button-primary" onClick={() => { clearHistory(); setConfirm(false) }}>Clear all</button>
    </div>}
    <section>
      <SectionHeading title="Calculation history"/>
      {history.length ? <ul className="history-list">{history.map(entry => {
        const item = byId.get(entry.calculator)!
        const time = new Date(entry.time)
        return <li key={entry.key}>
          <TileIcon category={item.category} id={item.id}/>
          <div className="history-body"><Link to={item.path}>{item.title}</Link><time dateTime={time.toISOString()}>{time.toLocaleString(undefined,{ dateStyle:'medium',timeStyle:'short' })}</time>
            <details><summary>{entry.output[0].label} · {formatValue(entry.output[0])}</summary><pre>{resultText(entry.output)}</pre></details></div>
          <CopyButton value={resultText(entry.output)} icon={<Copy size={16}/>} label="Copy"/>
        </li>
      })}</ul> : <Empty title="No saved results yet">Results will appear here after you calculate.</Empty>}
    </section>
    <section className="home-section">
      <SectionHeading title="Recently used"/>
      {recents.length ? <div className="card-grid">{recents.map(id => <CalculatorCard key={id} calculator={byId.get(id)!}/>)}</div>
        : <Empty title="No recent calculators">Calculators you open will appear here.</Empty>}
    </section>
  </div>
}

export function NotFound() {
  return <div className="page-width inner-page">
    <Breadcrumbs current="Page not found"/>
    <div className="empty large-empty"><Calculator size={25}/><h1 tabIndex={-1}>Page not found</h1><p>Check the URL or browse the calculator directory.</p>
      <Link className="button button-primary" to="/calculators">Browse calculators</Link></div>
  </div>
}

export function About() {
  return <div className="page-width inner-page">
    <Breadcrumbs current="About"/>
    <div className="page-heading"><h1 tabIndex={-1}>About CalcSpace</h1><p>CalcSpace is a free collection of calculators for math, money, conversions, health, dates and developer tasks.</p></div>
    <section className="panel"><p>Every tool runs in your browser. Inputs are not sent to a server, and saved history stays on your device. We focus on clear formulas, worked examples and accessible interfaces.</p>
      <p>Have a suggestion or spot an error? <Link to="/contact" className="text-link">Contact us</Link>.</p></section>
  </div>
}

export function Privacy() {
  return <div className="page-width inner-page">
    <Breadcrumbs current="Privacy"/>
    <div className="page-heading"><h1 tabIndex={-1}>Privacy policy</h1><p>How CalcSpace handles your data.</p></div>
    <section className="panel">
      <p>CalcSpace does not require an account. Calculations run locally in your browser. Favorites, history and theme preference are stored in your browser's local storage and are not transmitted to our servers.</p>
      <p>We use basic analytics and advertising partners (such as Monetag) to keep the site free. These partners may use cookies or similar technologies as described in their own policies.</p>
      <p>If you clear your browser storage, your saved favorites and history will be removed.</p>
    </section>
  </div>
}

export function Contact() {
  return <div className="page-width inner-page">
    <Breadcrumbs current="Contact"/>
    <div className="page-heading"><h1 tabIndex={-1}>Contact</h1><p>Get in touch with the CalcSpace team.</p></div>
    <section className="panel">
      <p>Email: <a className="text-link" href="mailto:hello@blueflutex.in">hello@blueflutex.in</a></p>
      <p>We welcome calculator requests, bug reports and feedback.</p>
    </section>
  </div>
}
