import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Calculator, Clock3, Grid2X2, House, Menu, Moon, Star, Sun, X } from 'lucide-react'
import { categories, categoryPath } from '../calculators/catalog'
import { pageInfo, siteOrigin, structuredData, breadcrumbSchema, faqSchema, websiteSchema } from '../seo'
import { categoryIcons } from './icons'
import { SearchBox } from './components'
import { useWorkspace } from './state'
import { useLanguage } from '../i18n'

const origin = siteOrigin(import.meta.env.VITE_SITE_URL)
const primaryLinks = [
  { to: '/', key: 'nav.overview', Icon: House },
  { to: '/calculators', key: 'nav.all', Icon: Grid2X2 },
  { to: '/favorites', key: 'nav.favorites', Icon: Star },
  { to: '/history', key: 'nav.history', Icon: Clock3 },
]

function Navigation({ close }: { close?: () => void }) {
  const { t } = useLanguage()
  return <>
    <div className="brand-row">
      <Link to="/" className="brand" onClick={close} aria-label="CalcSpace home">
        <span className="brand-icon"><Calculator size={21} strokeWidth={2.15}/></span><span>Calc<span>Space</span></span>
      </Link>
      {close && <button className="icon-button" type="button" aria-label="Close navigation" onClick={close}><X size={21}/></button>}
    </div>
    <nav className="side-nav" aria-label="Main navigation">
      <ul>{primaryLinks.map(({to,key,Icon}) => <li key={to}><NavLink to={to} end onClick={close}><Icon size={18} aria-hidden="true"/>{t(key)}</NavLink></li>)}</ul>
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

function useAnalytics(pathname: string) {
  const gaId = import.meta.env.VITE_GA_ID as string | undefined
  useEffect(() => {
    if (!gaId) return
    if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) {
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
      document.head.appendChild(script)
      const inline = document.createElement('script')
      inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{send_page_view:false});`
      document.head.appendChild(inline)
    }
    const w = window as unknown as { gtag?: (...args: unknown[]) => void }
    w.gtag?.('event', 'page_view', { page_path: pathname, page_location: window.location.href, page_title: document.title })
  }, [gaId, pathname])
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
    const canonicalUrl = origin && meta.index ? new URL(normalized, origin).href : ''
    setTag('meta[property="og:title"]','meta',{property:'og:title',content:meta.title})
    setTag('meta[property="og:description"]','meta',{property:'og:description',content:meta.description})
    setTag('meta[property="og:type"]','meta',{property:'og:type',content:'website'})
    setTag('meta[property="og:site_name"]','meta',{property:'og:site_name',content:'CalcSpace'})
    if (canonicalUrl) setTag('meta[property="og:url"]','meta',{property:'og:url',content:canonicalUrl})
    setTag('meta[property="og:image"]','meta',{property:'og:image',content: origin ? new URL('/calcspace.svg', origin).href : '/calcspace.svg'})
    setTag('meta[name="twitter:card"]','meta',{name:'twitter:card',content:'summary'})
    setTag('meta[name="twitter:title"]','meta',{name:'twitter:title',content:meta.title})
    setTag('meta[name="twitter:description"]','meta',{name:'twitter:description',content:meta.description})

    document.querySelectorAll('script[data-seo-schema="true"]').forEach(node => node.remove())
    const schemas = [
      structuredData(meta, origin, normalized),
      breadcrumbSchema(normalized, origin),
      faqSchema(normalized),
      normalized === '/' ? websiteSchema(origin) : undefined,
    ].filter(Boolean) as Record<string, unknown>[]
    for (const schema of schemas) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seoSchema = 'true'
      script.textContent = JSON.stringify(schema).replaceAll('<', '\\u003c')
      document.head.appendChild(script)
    }
  },[pathname])
}

export function Shell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useWorkspace()
  const { lang, setLang } = useLanguage()
  const { pathname } = useLocation()
  const drawer = useRef<HTMLDialogElement>(null)
  const previousPath = useRef(pathname)
  useHead(pathname)
  useAnalytics(pathname)
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
          <button type="button" className="icon-button" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} aria-label="Switch language">{lang === 'en' ? 'हि' : 'EN'}</button>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="main">{children}</main>
      <footer className="site-footer">
        <nav aria-label="Footer">
          <Link to="/about">About</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <p>© CalcSpace</p>
      </footer>
    </div>
  </div>
}
