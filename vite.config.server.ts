import { defineConfig } from 'vite'

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: true,
    target: 'node18',
    outDir: 'server/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'server/src/index.ts',
      output: { format: 'cjs', entryFileNames: 'index.js' },
    },
    minify: false,
  },
  resolve: { conditions: ['node'] },
})