import { Breadcrumbs } from './components'

export function ApiDocs() {
  return <div className="page-width inner-page">
    <Breadcrumbs current="API docs"/>
    <div className="page-heading"><h1 tabIndex={-1}>CalcSpace API</h1><p>Use the calculator engine over HTTP.</p></div>
    <section className="panel">
      <h2>Base URL</h2>
      <p><code>https://calcspace.blueflutex.in/api</code></p>
      <h2>Endpoints</h2>
      <ul>
        <li><code>GET /api/health</code> — service status</li>
        <li><code>GET /api/calculators</code> — list all calculators</li>
        <li><code>GET /api/calculators/:id</code> — single calculator metadata</li>
        <li><code>POST /api/calculate/:id</code> — run a calculation</li>
      </ul>
      <h2>Calculate example</h2>
      <pre>{`curl -X POST https://calcspace.blueflutex.in/api/calculate/gst-calculator \\
  -H "Content-Type: application/json" \\
  -d '{"inputs":{"amount":"1000","rate":"18","mode":"net","supply":"local"}}'`}</pre>
      <p>Inputs must match the calculator's fields. See <code>GET /api/calculators/:id</code> for field keys.</p>
    </section>
  </div>
}