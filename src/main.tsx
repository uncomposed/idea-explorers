import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, CheckCircle2, CircleDot, Code2, ExternalLink, GitBranch, GitFork, Orbit, Route, Search, ShieldCheck, Sparkles, X } from 'lucide-react'
import { models } from './generated'
import type { ExplorerItem, ExplorerModel } from './types'
import './styles.css'
import { ReaderExplorer } from './ReaderExplorer'
import { IdeaDirectory } from './IdeaDirectory'

const knownTabs = ['structure', 'pathways', 'boundaries', 'source'] as const
type Tab = typeof knownTabs[number]

function currentSlug() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  return parts[0] === 'ideas' ? parts[1] : undefined
}

function Motif({ kind }: { kind: ExplorerModel['motif'] }) {
  if (kind === 'orbit') return <Orbit aria-hidden="true" />
  if (kind === 'fork') return <GitFork aria-hidden="true" />
  if (kind === 'network') return <GitBranch aria-hidden="true" />
  return <Route aria-hidden="true" />
}

function App() {
  const slug = currentSlug()
  const model = models.find(candidate => candidate.slug === slug)
  const [tab, setTab] = useState<Tab>('structure')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ExplorerItem | null>(null)

  useEffect(() => {
    if (!model) return
    document.title = `${model.shortTitle} — Explore the idea`
    document.documentElement.style.setProperty('--accent', model.accent)
    document.documentElement.style.setProperty('--accent-soft', model.accentSoft)
  }, [model])

  const visibleLanes = useMemo(() => {
    if (!model || !query.trim()) return model?.lanes ?? []
    const needle = query.toLowerCase()
    return model.lanes.map(lane => ({
      ...lane,
      items: lane.items.filter(entry => `${entry.id} ${entry.title} ${entry.statement} ${entry.detail ?? ''}`.toLowerCase().includes(needle)),
    })).filter(lane => lane.items.length)
  }, [model, query])

  if (!model) return <IdeaDirectory models={models} />
  if (model.guide) return <ReaderExplorer model={model} models={models} />

  return (
    <div className={`app motif-${model.motif}`}>
      <header className="topbar">
        <a className="brand" href="https://proximitytoprogress.com/">
          <span className="brand-mark"><Sparkles size={15} /></span>
          <span>Proximity to Progress</span>
        </a>
        <span className="topbar-label">Idea explorer</span>
        <div className="topbar-actions">
          <a href={model.registryUrl} target="_blank" rel="noreferrer">Registry <ExternalLink size={14} /></a>
          <a href={model.repository.replace(/\.git$/, '')} target="_blank" rel="noreferrer">Source <ExternalLink size={14} /></a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Motif kind={model.motif} /> Canonical model · {model.status}</div>
            <h1>{model.title}</h1>
            <p className="summary">{model.summary}</p>
            <p className="framing">{model.framing}</p>
            <div className="commit-line"><CircleDot size={15} /> Projection of <code>{model.commit.slice(0, 12)}</code></div>
          </div>
          <div className="hero-visual" aria-label="Model overview">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-core"><Motif kind={model.motif} /></div>
            {model.metrics.map((metric, index) => (
              <div className={`metric metric-${index + 1}`} key={metric.label}>
                <strong>{metric.value}</strong><span>{metric.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace">
          <div className="workspace-head">
            <nav className="tabs" aria-label="Explorer views">
              {knownTabs.map(value => <button className={tab === value ? 'active' : ''} onClick={() => setTab(value)} key={value}>{value}</button>)}
            </nav>
            {tab === 'structure' && <label className="search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the model" /></label>}
          </div>

          {tab === 'structure' && <Structure lanes={visibleLanes} onSelect={setSelected} query={query} />}
          {tab === 'pathways' && <Pathways model={model} />}
          {tab === 'boundaries' && <Boundaries model={model} />}
          {tab === 'source' && <Source model={model} />}
        </section>
      </main>

      <footer>
        <span>Model v{model.version}</span>
        <span>Git state <code>{model.commit}</code></span>
        <a href={model.modelUrl} target="_blank" rel="noreferrer">Raw YAML <ExternalLink size={13} /></a>
      </footer>

      {selected && <Inspector item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Structure({ lanes, onSelect, query }: { lanes: ExplorerModel['lanes']; onSelect: (item: ExplorerItem) => void; query: string }) {
  if (!lanes.length) return <div className="empty"><Search size={28} /><h2>No model elements found</h2><p>Try a broader term or identifier.</p></div>
  return <div className="lane-grid">
    {lanes.map((lane, laneIndex) => <section className="lane" key={lane.id}>
      <div className="lane-heading"><span>{String(laneIndex + 1).padStart(2, '0')}</span><div><h2>{lane.title}</h2><p>{lane.description}</p></div></div>
      <div className="cards">
        {lane.items.map(entry => <button className="model-card" onClick={() => onSelect(entry)} key={`${lane.id}-${entry.id}`}>
          <span className="card-id">{entry.id}</span>
          <strong>{entry.title}</strong>
          <p>{entry.statement}</p>
          <span className="card-foot">{entry.badge ?? 'Inspect'} <ArrowRight size={14} /></span>
        </button>)}
      </div>
    </section>)}
    {query && <p className="result-note">Showing model elements matching “{query}”.</p>}
  </div>
}

function Pathways({ model }: { model: ExplorerModel }) {
  return <div className="path-grid">
    {model.paths.map(path => <section className="path-card" key={path.id}>
      <div className="section-kicker"><Route size={16} /> Evidence path</div>
      <h2>{path.title}</h2>
      {path.description && <p>{path.description}</p>}
      <ol>{path.steps.map((step, index) => <li key={`${path.id}-${index}`}><span>{index + 1}</span><p>{step}</p>{index < path.steps.length - 1 && <i aria-hidden="true" />}</li>)}</ol>
    </section>)}
  </div>
}

function Boundaries({ model }: { model: ExplorerModel }) {
  return <div className="boundary-layout">
    <section>
      <div className="section-kicker"><ShieldCheck size={16} /> Audit the idea</div>
      <h2>What should make us stop, revise, or refuse a claim?</h2>
      <div className="check-grid">{model.checks.map(entry => <article className={`check-card ${entry.tone ?? ''}`} key={entry.id}><span>{entry.id}</span><h3>{entry.title}</h3><p>{entry.description}</p>{entry.catches?.length ? <small>Catches {entry.catches.join(', ')}</small> : null}</article>)}</div>
    </section>
    <aside className="non-goals"><div className="section-kicker"><X size={16} /> Outside the claim</div><h2>Non-goals</h2><ul>{model.nonGoals.map((goal, index) => <li key={index}>{goal}</li>)}</ul></aside>
  </div>
}

function Source({ model }: { model: ExplorerModel }) {
  return <div className="source-layout">
    <section className="source-proof">
      <div className="section-kicker"><CheckCircle2 size={16} /> Exact source proof</div>
      <h2>This explorer is a projection, not a parallel authority.</h2>
      <p>The canonical model remains the YAML file in Git at the exact commit below. The explorer build refuses to proceed if those bytes do not match the pinned SHA-256 digest.</p>
      <dl>
        <div><dt>Repository</dt><dd><a href={model.repository.replace(/\.git$/, '')} target="_blank" rel="noreferrer">{model.repository.replace('https://github.com/', '').replace(/\.git$/, '')}</a></dd></div>
        <div><dt>Model</dt><dd>{model.modelPath}</dd></div>
        <div><dt>Commit</dt><dd><code>{model.commit}</code></dd></div>
        <div><dt>Model SHA-256</dt><dd><code>{model.modelSha256}</code></dd></div>
      </dl>
      <div className="source-actions"><a className="primary-action" href={model.modelUrl} target="_blank" rel="noreferrer"><Code2 size={16} /> Open raw YAML</a><a href={model.registryUrl} target="_blank" rel="noreferrer">View registry record <ExternalLink size={15} /></a></div>
    </section>
  </div>
}

function Inspector({ item, onClose }: { item: ExplorerItem; onClose: () => void }) {
  return <div className="inspector-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()} role="presentation">
    <aside className="inspector" aria-label={`${item.title} details`}>
      <button className="close" onClick={onClose} aria-label="Close details"><X /></button>
      <span className="inspector-id">{item.id} · {item.badge}</span>
      <h2>{item.title}</h2>
      <p>{item.statement}</p>
      {item.detail && <div className="detail"><strong>Why it matters</strong><p>{item.detail}</p></div>}
      {item.relations?.length ? <div className="relations"><strong>Declared relationships</strong><div>{item.relations.map(relation => <span key={relation}>{relation}</span>)}</div></div> : null}
    </aside>
  </div>
}

function Index() {
  return <main className="index-page"><div className="eyebrow"><Sparkles size={16} /> Proximity to Progress</div><h1>Explore an idea through its model.</h1><p>Each explorer below is generated from a digest-verified YAML model at an exact Git commit.</p><div className="index-grid">{models.map(model => <a href={`/ideas/${model.slug}/`} style={{ '--card-accent': model.accent } as React.CSSProperties} key={model.slug}><Motif kind={model.motif} /><span><strong>{model.shortTitle}</strong><small>{model.summary}</small></span><ArrowRight /></a>)}</div></main>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
