import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { pageInfo, publicPaths, siteOrigin, structuredData } from './src/seo'

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]!)
function seoPlugin(origin: string): Plugin {
  let directory: string
  let isBuild: boolean
  function htmlFor(html: string, path: string) {
    const meta = pageInfo(path)
    const canonical = origin && meta.index ? `<link rel="canonical" href="${escape(new URL(path, origin).href)}" />` : ''
    const schema = structuredData(meta, origin, path)
    const json = schema ? `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>` : ''
    return html.replace(/<title>.*?<\/title>/g, `<title>${escape(meta.title)}</title>`)
      .replace(/<meta name="description"[^>]*>/g, `<meta name="description" content="${escape(meta.description)}" />`)
      .replace('</head>', `<meta name="robots" content="${origin && meta.index ? 'index,follow' : 'noindex,nofollow'}" />${canonical}${json}\n  </head>`)
  }
  const robots = origin ? `User-agent: *\nDisallow: /favorites\nDisallow: /history\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n'
  const sitemap = (base: string) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPaths.map(path => `  <url><loc>${escape(new URL(path,base).href)}</loc></url>`).join('\n')}\n</urlset>\n`

  return {
    name: 'calcspace-seo',
    configResolved(config) { directory = resolve(config.root, config.build.outDir); isBuild = config.command === 'build' },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split('?')[0]
        if (path === '/robots.txt' || path === '/sitemap.xml') {
          response.setHeader('Content-Type', path === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8')
          response.end(path === '/robots.txt' ? robots : sitemap(origin || 'http://localhost:5173'))
        } else next()
      })
    },
    transformIndexHtml(html, context) {
      return context.server ? htmlFor(html, context.originalUrl?.split('?')[0].replace(/\/+$/, '') || '/') : html
    },
    async closeBundle() {
      if (!isBuild) return
      const template = await readFile(resolve(directory, 'index.html'), 'utf8')
      await Promise.all([...publicPaths, '/favorites', '/history', '/404'].map(async path => {
        const folder = path === '/404' ? directory : resolve(directory, '.' + path)
        await mkdir(folder, { recursive: true })
        return writeFile(resolve(folder, path === '/404' ? '404.html' : 'index.html'), htmlFor(template, path))
      }))
      await Promise.all([writeFile(resolve(directory,'robots.txt'), robots), writeFile(resolve(directory,'sitemap.xml'), sitemap(origin || 'http://localhost:5173'))])
    },
  }
}

export default defineConfig(({ mode }) => {
  const origin = siteOrigin(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)
  return { plugins: [react(), tailwind(), seoPlugin(origin)], server: { host: 'localhost', port: 5173, strictPort: true } }
})
