import express from 'express'
import cors from 'cors'
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { calculators, byId } from '../../src/calculators/catalog'
import type { RawInputs } from '../../src/calculators/core'

const KEYS_FILE = process.env.KEYS_FILE || join(process.cwd(), 'keys.json')
function readKeys(): string[] {
  if (!existsSync(KEYS_FILE)) return []
  try { return JSON.parse(readFileSync(KEYS_FILE, 'utf8')) } catch { return [] }
}
function saveKeys(keys: string[]) {
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2))
}
function isValidKey(key: string | undefined) {
  if (!key) return false
  return readKeys().includes(key)
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.post('/api/keys', (_req, res) => {
  const key = 'csk_' + randomBytes(24).toString('hex')
  const keys = readKeys()
  keys.push(key)
  saveKeys(keys)
  res.json({ key })
})

app.use('/api/calculate', (req, res, next) => {
  const key = req.header('x-api-key')
  if (!isValidKey(key)) return res.status(401).json({ error: 'Invalid or missing API key' })
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, calculators: calculators.length })
})

app.get('/api/calculators', (_req, res) => {
  res.json(calculators.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    path: c.path,
    fields: c.fields,
    formula: c.formula,
  })))
})

app.get('/api/calculators/:id', (req, res) => {
  const calc = byId.get(req.params.id)
  if (!calc) return res.status(404).json({ error: 'Calculator not found' })
  res.json({
    id: calc.id,
    title: calc.title,
    description: calc.description,
    category: calc.category,
    path: calc.path,
    fields: calc.fields,
    formula: calc.formula,
    faq: calc.faq,
  })
})

app.post('/api/calculate/:id', async (req, res) => {
  const calc = byId.get(req.params.id)
  if (!calc) return res.status(404).json({ error: 'Calculator not found' })
  try {
    const inputs = (req.body?.inputs ?? {}) as RawInputs
    const result = await calc.calculate(inputs)
    res.json({ id: calc.id, result })
  } catch (err) {
    const field = (err as { field?: string })?.field
    res.status(400).json({ error: err instanceof Error ? err.message : 'Calculation failed', field })
  }
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`CalcSpace API listening on port ${port}`)
})