import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Search, Star, X } from 'lucide-react'
import { categoryCount, categoryPath, getCategory, searchCalculators } from '../calculators/catalog'
import type { Calculator, Category } from '../calculators/core'
import { calculatorIcons, categoryIcons } from './icons'
import { copyText, useWorkspace } from './state'

export function TileIcon({ category, id, className = '' }: { category: Category; id?: string; className?: string }) {
  const Icon = (id && calculatorIcons[id]) || categoryIcons[category]
  return <span className={`tile-icon tone-${category} ${className}`}><Icon size={21} strokeWidth={1.9} aria-hidden="true" /></span>
}

export function CalculatorCard({ calculator }: { calculator: Calculator }) {
  const { favorites, toggleFavorite } = useWorkspace()
  const saved = favorites.includes(calculator.id)
  return <article className="calculator-card">
    <Link to={calculator.path} className="card-link">
      <TileIcon category={calculator.category} id={calculator.id} />
      <div className="card-copy"><h3>{calculator.title}</h3><p>{calculator.description}</p></div>
    </Link>
    <button type="button" className="card-star icon-button" aria-label={`${saved ? 'Remove' : 'Save'} ${calculator.title} ${saved ? 'from' : 'to'} favorites`}
      title={saved ? 'Remove from favorites' : 'Save to favorites'} aria-pressed={saved} onClick={() => toggleFavorite(calculator.id)}><Star size={17} /></button>
  </article>
}

export function CategoryCard({ category }: { category: Category }) {
  const details = getCategory(category)
  const count = categoryCount(category)
  return <Link className="category-card" to={categoryPath(category)}>
    <TileIcon category={category} />
    <div className="category-copy"><h3>{details.name}</h3><p>{details.summary}</p></div>
    <span className="category-count" aria-label={`${count} calculators`}>{count}</span>
  </Link>
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}</div>
}

export function Breadcrumbs({ parent, current }: { parent?: { to: string; label: string }; current: string }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">
    <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" />
    {parent && <><Link to={parent.to}>{parent.label}</Link><ChevronRight size={14} aria-hidden="true" /></>}
    <span aria-current="page">{current}</span>
  </nav>
}

export function SearchBox({ variant }: { variant: 'top' | 'hero' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const matches = query.trim() ? searchCalculators(query).slice(0,5) : []
  const hasMenu = open && Boolean(query.trim())
  const directory = `/calculators?q=${encodeURIComponent(query.trim())}`
  function go(path: string) {
    setOpen(false)
    setQuery('')
    setActive(-1)
    input.current?.blur()
    navigate(path)
  }
  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { setOpen(false); setActive(-1); return }
    if (!query.trim()) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const length = matches.length + 1
      setActive(previous => previous < 0 ? (event.key === 'ArrowDown' ? 0 : length - 1) : (previous + (event.key === 'ArrowDown' ? 1 : -1) + length) % length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(hasMenu && matches[active] ? matches[active].path : directory)
    }
  }
  const optionId = (index: number) => `${listId}-${index}`
  return <div className={`search-box search-${variant}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <div className="search-control">
      <Search size={19} aria-hidden="true" />
      <input ref={input} data-global-search={variant === 'top' ? 'true' : undefined} type="search" role="combobox"
        aria-label={variant === 'top' ? 'Quick search' : 'Search all calculators'} aria-expanded={hasMenu}
        aria-controls={hasMenu ? listId : undefined} aria-autocomplete="list"
        aria-activedescendant={hasMenu && active >= 0 ? optionId(active) : undefined}
        placeholder={variant === 'hero' ? 'Try “home loan” or “percentage”' : 'Find a calculator…'}
        value={query} onFocus={() => setOpen(true)} onKeyDown={keys}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1) }} />
      {query
        ? <button type="button" className="search-clear icon-button" aria-label="Clear search" onClick={() => { setQuery(''); setActive(-1); input.current?.focus() }}><X size={16}/></button>
        : variant === 'top' && <kbd>Ctrl K</kbd>}
    </div>
    {hasMenu && <div className="search-menu" id={listId} role="listbox" aria-label="Calculator suggestions">
      {matches.map((item,index) => <div key={item.id} id={optionId(index)} role="option" aria-selected={index === active}
        onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => go(item.path)}>
        <TileIcon category={item.category} id={item.id}/><span><strong>{item.title}</strong><small>{getCategory(item.category).nav}</small></span>
      </div>)}
      <div id={optionId(matches.length)} role="option" aria-selected={active === matches.length} onMouseMove={() => setActive(matches.length)}
        onMouseDown={event => event.preventDefault()} onClick={() => go(directory)}><Search size={17}/><span>{matches.length ? 'View all matching calculators' : `Search for “${query.trim()}”`}</span></div>
    </div>}
  </div>
}

export function CopyButton({ value, icon, label, success = 'Copied', className = '' }: { value: string; icon: ReactNode; label: string; success?: string; className?: string }) {
  const [feedback, setFeedback] = useState('')
  async function copy() {
    try {
      await copyText(value)
      setFeedback(success)
    } catch {
      setFeedback('Copy failed')
    }
  }
  return <button type="button" className={`button button-secondary ${className}`} onClick={copy} onBlur={() => setFeedback('')}>
    {feedback === success ? <Check size={16} /> : icon}
    <span aria-live="polite">{feedback || label}</span>
  </button>
}
