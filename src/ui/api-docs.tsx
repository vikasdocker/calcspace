import { useState } from 'react'
import { Breadcrumbs } from './components'

const tabs = ['Usage', 'Generate', 'API Key'] as const

export function ApiDocs() {
  const [tab, setTab] = useState<typeof tabs[number]>('Usage')
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generateKey() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://calcspace.blueflutex.in/api/keys', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setKey(data.key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return <div className="page-width inner-page">
    <Breadcrumbs current="API docs"/>
    <div className="page-heading"><h1 tabIndex={-1}>CalcSpace API</h1><p>Use the calculator engine over HTTP.</p></div>
    <div className="panel">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t} type="button" className={tab === t ? 'button button-primary' : 'button button-secondary'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Usage' && (
        <>
          <h2>Base URL</h2>
          <p><code>https://calcspace.blueflutex.in/api</code></p>
          <h2>Endpoints</h2>
          <ul>
            <li><code>GET /api/health</code> — service status</li>
            <li><code>GET /api/calculators</code> — list all calculators</li>
            <li><code>GET /api/calculators/:id</code> — single calculator metadata</li>
            <li><code>POST /api/calculate/:id</code> — run a calculation (requires API key)</li>
          </ul>
          <h2>Calculate example</h2>
          <pre>{`curl -X POST https://calcspace.blueflutex.in/api/calculate/gst-calculator \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_KEY" \\
  -d '{"inputs":{"amount":"1000","rate":"18","mode":"net","supply":"local"}}'`}</pre>
          <p>Inputs must match the calculator's fields. See <code>GET /api/calculators/:id</code> for field keys.</p>
        </>
      )}
      {tab === 'Generate' && (
        <>
          <h2>Code generation</h2>
          <p>Generate client code for any calculator endpoint.</p>
          <h3>JavaScript (fetch)</h3>
          <pre>{`const res = await fetch('https://calcspace.blueflutex.in/api/calculate/gst-calculator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': 'YOUR_KEY' },
  body: JSON.stringify({ inputs: { amount: '1000', rate: '18', mode: 'net', supply: 'local' } })
})
const data = await res.json()
console.log(data.result)`}</pre>
          <h3>Python (requests)</h3>
          <pre>{`import requests
r = requests.post('https://calcspace.blueflutex.in/api/calculate/gst-calculator',
    headers={'X-API-Key': 'YOUR_KEY'},
    json={'inputs': {'amount': '1000', 'rate': '18', 'mode': 'net', 'supply': 'local'}})
print(r.json()['result'])`}</pre>
          <h3>Node.js (axios)</h3>
          <pre>{`const axios = require('axios')
const { data } = await axios.post('https://calcspace.blueflutex.in/api/calculate/gst-calculator', {
  inputs: { amount: '1000', rate: '18', mode: 'net', supply: 'local' }
}, { headers: { 'X-API-Key': 'YOUR_KEY' } })
console.log(data.result)`}</pre>
        </>
      )}
      {tab === 'API Key' && (
        <>
          <h2>Generate API key</h2>
          <p>Generate a key to access protected endpoints. Store it safely; it won't be shown again.</p>
          <button type="button" className="button button-primary" onClick={generateKey} disabled={loading}>
            {loading ? 'Generating…' : 'Generate new key'}
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {key && (
            <div style={{ marginTop: 12 }}>
              <p><strong>Your API key:</strong></p>
              <pre>{key}</pre>
              <p>Use it in the <code>X-API-Key</code> header.</p>
            </div>
          )}
        </>
      )}
    </div>
  </div>
}