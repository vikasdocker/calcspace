import { createContext, useContext, useState, type ReactNode } from 'react'

type Lang = 'en' | 'hi'
type Dict = Record<string, string>

const dictionaries: Record<Lang, Dict> = {
  en: {
    'nav.overview': 'Overview',
    'nav.all': 'All calculators',
    'nav.favorites': 'Favorites',
    'nav.history': 'History',
    'home.title': 'Every calculation. One space.',
    'home.subtitle': 'Find the right calculator for math, money, conversions and everyday decisions.',
    'home.popular': 'Popular calculators',
    'home.categories': 'Browse by category',
  },
  hi: {
    'nav.overview': 'अवलोकन',
    'nav.all': 'सभी कैलकुलेटर',
    'nav.favorites': 'पसंदीदा',
    'nav.history': 'इतिहास',
    'home.title': 'हर गणना। एक जगह।',
    'home.subtitle': 'गणित, पैसे, रूपांतरण और रोज़मर्रा के निर्णयों के लिए सही कैलकुलेटर खोजें।',
    'home.popular': 'लोकप्रिय कैलकुलेटर',
    'home.categories': 'श्रेणी के अनुसार ब्राउज़ करें',
  },
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }
const LanguageContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: k => k })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('calcspace:lang') as Lang) || 'en')
  function update(l: Lang) { setLang(l); try { localStorage.setItem('calcspace:lang', l) } catch {} }
  const t = (key: string) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key
  return <LanguageContext.Provider value={{ lang, setLang: update, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() { return useContext(LanguageContext) }