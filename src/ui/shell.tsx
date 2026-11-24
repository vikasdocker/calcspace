import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Calculator, Clock3, Grid2X2, House, Menu, Moon, Star, Sun, X } from 'lucide-react'
import { categories, categoryPath } from '../calculators/catalog'
import { pageInfo, siteOrigin, structuredData } from '../seo'
import { categoryIcons } from './icons'
import { SearchBox } from './components'
import { useWorkspace } from './state'

const origin = siteOrigin(import.meta.env.VITE_SITE_URL)
const primaryLinks = [
  { to: '/', name: 'Overview', Icon: House },
  { to: '/calculators', name: 'All calculators', Icon: Grid2X2 },
  { to: '/favorites', name: 'Favorites', Icon: Star },
  { to: '/history', name: 'History', Icon: Clock3 },
]

function Navigation({ close }: { close?: () => void }) {
  return <>
    <div className="brand-row">
      <Link to="/" className="brand" onClick={close} aria-label="CalcSpace home">
        <span className="brand-icon"><Calculator size={21} strokeWidth={2.15}/></span><span>Calc<span>Space</span></span>
      </Link>
      {close && <button className="icon-button" type="button" aria-label="Close navigation" onClick={close}><X size={21}/></button>}
    </div>
    <nav className="side-nav" aria-label="Main navigation">
      <ul>{primaryLinks.map(({to,name,Icon}) => <li key={to}><NavLink to={to} end onClick={close}><Icon size={18} aria-hidden="true"/>{name}</NavLink></li>)}</ul>
      <p className="nav-label">Categories</p>
      <ul>{categories.map(item => {
        const Icon = categoryIcons[item.id]
        return <li key={item.id}><NavLink to={categoryPath(item.id)} onClick={close}>
          <Icon className={`nav-icon tone-${item.id}`} size={18} aria-hidden="true"/>{item.nav}
        </NavLink></li>
      })}</ul>
    </nav>
  </>
}

function useHead(pathname: string) {
  useEffect(() => {
    const normalized = pathname.replace(/\/+$/, '') || '/'
    const meta = pageInfo(normalized)
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
    function setTag(selector: string, element: 'meta' | 'link' | 'script', attributes?: Record<string,string>, content?: string) {
      let tag = document.head.querySelector(selector)
      if (!attributes) { tag?.remove(); return }
      if (!tag) { tag = document.createElement(element); document.head.appendChild(tag) }
      for (const [key,value] of Object.entries(attributes)) tag.setAttribute(key,value)
      if (content !== undefined) tag.textContent = content
    }
    setTag('meta[name="robots"]','meta',{name:'robots',content:origin && meta.index ? 'index,follow' : 'noindex,nofollow'})
    setTag('link[rel="canonical"]','link',origin && meta.index ? {rel:'canonical',href:new URL(normalized,origin).href} : undefined)
    const schema = structuredData(meta, origin, normalized)
    setTag('script[type="application/ld+json"]','script',schema ? {type:'application/ld+json'} : undefined,JSON.stringify(schema))
  },[pathname])
}

export function Shell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useWorkspace()
  const { pathname } = useLocation()
  const drawer = useRef<HTMLDialogElement>(null)
  const previousPath = useRef(pathname)
  useHead(pathname)
  useEffect(() => {
    if (previousPath.current !== pathname) {
      window.scrollTo(0,0)
      document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
    }
    previousPath.current = pathname
  }, [pathname])
  useEffect(() => {
    function search(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('[data-global-search]')?.focus()
      }
    }
    window.addEventListener('keydown',search)
    return () => window.removeEventListener('keydown',search)
  },[])
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="side"><Navigation/></aside>
    <dialog className="mobile-drawer" ref={drawer} onClick={event => { if (event.target === event.currentTarget) drawer.current?.close() }} aria-label="Navigation">
      <div className="mobile-nav-content"><Navigation close={() => drawer.current?.close()}/></div>
    </dialog>
    <div className="workspace">
      <header className="topbar">
        <button type="button" className="menu-button icon-button" aria-label="Open navigation" onClick={() => drawer.current?.showModal()}><Menu size={22}/></button>
        <div className="top-search"><SearchBox variant="top"/></div>
        <div className="top-actions">
          <Link to="/history" className="icon-button top-history" aria-label="Calculation history" title="Calculation history"><Clock3 size={20}/></Link>
          <button type="button" className="icon-button theme-button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={toggleTheme}><ThemeIcon size={20}/></button>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="main">{children}</main>
    </div>
  </div>
}
