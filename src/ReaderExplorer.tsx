import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CircleHelp, ExternalLink, FileText, GitBranch, Search, Sparkles, X } from 'lucide-react'
import type { ExplorerItem, ExplorerModel, ModelValue, SourceLocation } from './types'
import './reader.css'

type View = 'overview' | 'model' | 'evidence' | 'source'
type Selection = { kind: 'claim' | 'term' | 'step' | 'note'; id: string }
const views: Array<{ id: View; label: string }> = [{ id: 'overview', label: 'Understand the idea' }, { id: 'model', label: 'Explore relationships' }, { id: 'evidence', label: 'Evidence & questions' }, { id: 'source', label: 'Full model & source' }]
const kindLabels: Record<string, string> = { kernel: 'Core proposition', derived: 'Derived mechanism', hypothesis: 'Hypothesis', implementation: 'Design choice', open_question: 'Open question' }
const relationLabels = { derived_from: 'Derived from', supports: 'Proposed support for', implements: 'Implements' }
const incomingLabels = { derived_from: 'Used to derive', supports: 'Has proposed support from', implements: 'Implemented by' }
const humanize = (value: string) => value.replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())

function readLocation(): { view: View; selection: Selection | null } {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view') as View
  const [kind, ...parts] = (params.get('item') ?? '').split(':')
  const id = parts.join(':')
  return { view: views.some(entry => entry.id === view) ? view : 'overview', selection: id && ['claim', 'term', 'step', 'note'].includes(kind) ? { kind: kind as Selection['kind'], id } : null }
}

function sourceUrl(model: ExplorerModel, source?: SourceLocation) {
  return `${model.repository.replace(/\.git$/, '')}/blob/${model.commit}/${model.modelPath}${source ? `#L${source.line}` : ''}`
}

export function ReaderExplorer({ model, models }: { model: ExplorerModel; models: ExplorerModel[] }) {
  const guide = model.guide!
  const [{ view, selection }, setLocation] = useState(readLocation)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const panelRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<string | null>(null)
  const returnFocusRef = useRef(false)
  const previousView = useRef(view)
  const items = model.lanes.flatMap(lane => lane.items)
  const byId = new Map(items.map(item => [item.id, item]))
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : ''

  function destination(nextView: View, nextSelection: Selection | null) {
    const params = new URLSearchParams()
    if (nextView !== 'overview') params.set('view', nextView)
    if (nextSelection) params.set('item', `${nextSelection.kind}:${nextSelection.id}`)
    return `${window.location.pathname}${params.size ? `?${params}` : ''}`
  }
  function navigate(nextView: View, nextSelection: Selection | null) {
    const href = destination(nextView, nextSelection)
    if (href !== window.location.pathname + window.location.search) window.history.pushState(null, '', href)
    setLocation({ view: nextView, selection: nextSelection })
  }
  function close() {
    navigate(view, null)
    returnFocusRef.current = true
  }
  useEffect(() => {
    const onPop = () => setLocation(readLocation())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    if (previousView.current === view) return
    previousView.current = view
    const content = document.getElementById('reader-content')
    content?.focus({ preventScroll: true })
    content?.scrollIntoView({ block: 'start' })
  }, [view])
  useEffect(() => {
    if (!selectionKey) {
      if (returnFocusRef.current && openerRef.current) {
        const opener = document.querySelector<HTMLAnchorElement>(`a[href="${CSS.escape(openerRef.current)}"]`)
        opener?.focus({ preventScroll: true })
        if (window.innerWidth < 1000) opener?.scrollIntoView({ block: 'center' })
        returnFocusRef.current = false
      }
      return
    }
    const panel = panelRef.current
    const media = window.matchMedia('(max-width: 999px)')
    const previousOverflow = document.body.style.overflow
    function showPanel() {
      if (!panel) return
      if (panel.open) panel.close()
      if (media.matches) panel.showModal()
      else panel.show()
      document.body.style.overflow = media.matches ? 'hidden' : previousOverflow
      panel.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
    }
    showPanel()
    media.addEventListener('change', showPanel)
    return () => {
      media.removeEventListener('change', showPanel)
      document.body.style.overflow = previousOverflow
    }
  }, [selectionKey])


  function Link({ to, children, className = '', nextView = view }: { to: Selection | null; children: React.ReactNode; className?: string; nextView?: View }) {
    return <a className={className} href={destination(nextView, to)} onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      event.preventDefault()
      if (!panelRef.current?.contains(event.currentTarget)) openerRef.current = event.currentTarget.getAttribute('href')
      navigate(nextView, to)
    }}>{children}</a>
  }
  function References({ ids, compact = false }: { ids: string[]; compact?: boolean }) {
    return <div className={`reader-refs ${compact ? 'compact' : ''}`}>{ids.map(id => <Link key={id} to={{ kind: 'claim', id }}><span>{id}</span>{!compact && byId.get(id)?.title}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}</div>
  }
  function SourceLink({ source }: { source?: SourceLocation }) {
    return <a className="reader-source-link" href={sourceUrl(model, source)} target="_blank" rel="noreferrer"><FileText size={14} aria-hidden="true" />{source ? `${source.path} · line ${source.line}` : 'Read the exact YAML revision'}<ExternalLink size={12} aria-hidden="true" /></a>
  }
  function ClaimCard({ item }: { item: ExplorerItem }) {
    return <Link className={`reader-claim ${selection?.kind === 'claim' && selection.id === item.id ? 'selected' : ''}`} to={{ kind: 'claim', id: item.id }}>
      <span className={`reader-kind kind-${item.kind}`}>{kindLabels[item.kind ?? ''] ?? item.badge}<span>{item.id}</span></span>
      <h3>{item.title}</h3>
      {item.statement !== item.title && <p>{item.statement}</p>}
      <span className="reader-card-action">{item.kind === 'hypothesis' ? 'Inspect the claim & proposed tests' : 'See meaning & connections'}<ArrowRight size={16} aria-hidden="true" /></span>
    </Link>
  }
  const note = selection?.kind === 'note' ? selection.id === 'example' ? guide.example : selection.id === 'uncertainty' ? guide.uncertainty : selection.id === 'return' ? guide.returnFlow : undefined : undefined
  const term = selection?.kind === 'term' ? guide.terms.find(entry => entry.id === selection.id) : undefined
  const step = selection?.kind === 'step' ? guide.steps.find(entry => entry.id === selection.id) : undefined
  const claim = selection?.kind === 'claim' ? byId.get(selection.id) : undefined
  const chosen = note ?? term ?? step ?? claim
  const filtered = items.filter(item => (kind === 'all' || item.kind === kind) && `${item.id} ${item.title} ${item.statement} ${item.rationale ?? ''} ${item.evidenceNeeded ?? ''} ${item.falsifier ?? ''} ${item.stoppingRule ?? ''} ${(item.alternatives ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
  const incoming = claim ? items.flatMap(item => (item.links ?? []).filter(link => link.target === claim.id).map(link => ({ item, type: link.type }))) : []

  return <div className={`reader reader-${model.slug}`}>
    <a className="reader-skip" href="#reader-content">Skip to content</a>
    <header className="reader-header">
      <a href="/ideas/" className="reader-brand"><Sparkles size={19} aria-hidden="true" /><span>Proximity to Progress</span></a>
      <span className="reader-header-divider" />
      <span className="reader-header-label">An idea, open to inspection</span>
      <label className="reader-switch"><span className="sr-only">Choose an idea</span><select value={model.slug} onChange={event => { window.location.href = `/ideas/${event.target.value}/` }}>{models.map(entry => <option value={entry.slug} key={entry.slug}>{entry.shortTitle}</option>)}</select></label>
    </header>
    <main className="reader-main">
      <section className="reader-intro">
        <div>
          <div className="reader-eyebrow"><span className="reader-dot" />{guide.premise}<span className="reader-draft">{humanize(model.status.replaceAll('-', ' '))}</span></div>
          <h1>{model.title}</h1>
          <p className="reader-question">{guide.question}</p>
          <p className="reader-introduction">{guide.introduction}</p>
        </div>
        <aside className="reader-scope"><span className="reader-eyebrow">Keep this boundary in view</span><p>{guide.scope}</p><References ids={guide.scopeRefs} compact /></aside>
      </section>
      <nav className="reader-nav" aria-label="Ways to explore this idea">{views.map(entry => <a key={entry.id} href={destination(entry.id, null)} aria-current={view === entry.id ? 'page' : undefined} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault(); navigate(entry.id, null)
      }}>{entry.label}</a>)}</nav>
      <div className={`reader-layout ${selection ? 'has-inspector' : ''}`}>
        <div id="reader-content" className="reader-content" tabIndex={-1}>
          {view === 'overview' && <>
            <section className="reader-section reader-mechanism">
              <div className="reader-section-heading"><div><span className="reader-eyebrow">01 / The mechanism</span><h2>{guide.mechanismTitle}</h2><p>{guide.mechanismDescription}</p></div><span className="reader-guide-label">Reading guide</span></div>
              <ol className="reader-steps">{guide.steps.map((entry, index) => <li key={entry.id}>
                <Link to={{ kind: 'step', id: entry.id }} className={`reader-step ${step?.id === entry.id ? 'selected' : ''}`}>
                  <span className="reader-step-top"><span className="reader-step-number">0{index + 1}</span><ArrowUpRight size={19} aria-hidden="true" /></span>
                  <h3>{entry.title}</h3><p>{entry.description}</p><span className="reader-step-source">Based on {entry.refs.join(' · ')}</span>
                </Link>
                <div className="reader-connection"><ArrowDown size={14} aria-hidden="true" /><span>{entry.connection}</span></div>
              </li>)}</ol>
              {guide.returnFlow && <Link to={{ kind: 'note', id: 'return' }} className="reader-return"><ArrowLeft size={22} aria-hidden="true" /><div><strong>{guide.returnFlow.title}</strong><p>{guide.returnFlow.text}</p><span>Inspect this optional return mode <ArrowUpRight size={13} aria-hidden="true" /></span></div></Link>}
            </section>
            <section className="reader-section">
              <div className="reader-section-heading"><div><span className="reader-eyebrow">02 / A shared vocabulary</span><h2>The words that matter here</h2><p>Select a definition to see the model statements it explains.</p></div><BookOpen size={24} aria-hidden="true" /></div>
              <div className="reader-terms">{guide.terms.map(entry => <Link to={{ kind: 'term', id: entry.id }} className={`reader-term ${term?.id === entry.id ? 'selected' : ''}`} key={entry.id}><div><h3>{entry.title}</h3><p>{entry.meaning}</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>)}</div>
            </section>
            <section className="reader-notes">
              <Link to={{ kind: 'note', id: 'example' }} className="reader-note"><span className="reader-eyebrow">Make it concrete</span><h2>{guide.example.title}</h2><p>{guide.example.text}</p><span className="reader-card-action">See the reasoning<ArrowRight size={16} aria-hidden="true" /></span></Link>
              <Link to={{ kind: 'note', id: 'uncertainty' }} className="reader-note uncertainty"><span className="reader-eyebrow"><CircleHelp size={16} aria-hidden="true" />The open question</span><h2>{guide.uncertainty.title}</h2><p>{guide.uncertainty.text}</p><span className="reader-card-action">Inspect the hypothesis<ArrowRight size={16} aria-hidden="true" /></span></Link>
            </section>
            <div className="reader-next"><div><strong>Ready to look closer?</strong><p>Follow a claim to its dependencies, proposed tests, and exact source.</p></div><Link to={null} nextView="model" className="reader-primary">Explore the relationships<ArrowRight size={16} aria-hidden="true" /></Link></div>
          </>}
          {view === 'model' && <section className="reader-section">
            <div className="reader-section-heading"><div><span className="reader-eyebrow">The connected model</span><h2>Start with a claim. Follow its connections.</h2><p>Definitions describe the pieces. These propositions describe what the model says about them. Select one to see both its outgoing and incoming relationships.</p></div></div>
            <div className="reader-controls"><label className="reader-search"><Search size={18} aria-hidden="true" /><input aria-label="Search claims and tests" placeholder="Search a term, claim, or ID…" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="reader-filter"><span className="sr-only">Filter by claim type</span><select value={kind} onChange={event => setKind(event.target.value)}><option value="all">All claim types</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
            <p className="reader-result" aria-live="polite">{filtered.length} of {items.length} propositions</p>
            <div className="reader-claims">{filtered.map(item => <ClaimCard key={item.id} item={item} />)}</div>
            {!filtered.length && <div className="reader-empty"><Search size={28} aria-hidden="true" /><h3>No matching propositions</h3><p>Try a shorter phrase or clear the type filter.</p><button onClick={() => { setQuery(''); setKind('all') }}>Clear search & filter</button></div>}
          </section>}
          {view === 'evidence' && <>
            <section className="reader-section">
              <div className="reader-section-heading"><div><span className="reader-eyebrow">What would make this credible?</span><h2>Hypotheses, evidence, and reasons to revise</h2><p>These are contestable claims. A proposed test is not a test result.</p></div></div>
              <div className="reader-evidence-notice"><CircleHelp size={21} aria-hidden="true" /><p><strong>No claim-specific empirical results are linked in this model revision.</strong> The model supplies evidence requirements, falsifiers, and stopping rules.{model.contextSources?.length ? ' It also names background sources below; these are not automatically proof of any hypothesis.' : ''}</p></div>
              <div className="reader-claims">{guide.featured.map(id => <ClaimCard key={id} item={byId.get(id)!} />)}</div>
            </section>
            <section className="reader-section"><div className="reader-section-heading"><div><span className="reader-eyebrow">Proposed verification paths</span><h2>What needs to be checked, in what order</h2><p>These paths describe checks to perform. They do not report completed verification.</p></div></div><div className="reader-paths">{model.paths.map(path => <article key={path.id}><h3>{path.title}</h3><ol>{path.steps.map((entry, index) => <li key={index}>{entry}</li>)}</ol><SourceLink source={model.sourceLocations?.[`evidence_paths.${path.id}`]} /></article>)}</div></section>
            {!!model.contextSources?.length && <section className="reader-section"><div className="reader-section-heading"><div><span className="reader-eyebrow">Background & provenance</span><h2>Sources named by the model</h2><p>The roles below are declared by the model. These references have not been evaluated here as support for specific claims.</p></div></div><div className="reader-context-sources">{model.contextSources.map(entry => <article key={entry.id}><span className="reader-small-label">{entry.id}</span><h3><a href={entry.uri} target="_blank" rel="noreferrer">{entry.title}<ArrowUpRight size={16} aria-hidden="true" /></a></h3><p>{entry.role}</p><SourceLink source={entry.source} /></article>)}</div></section>}
            <section className="reader-section"><div className="reader-section-heading"><div><span className="reader-eyebrow">Guardrails</span><h2>Failure modes and limits</h2></div></div><div className="reader-checks">{model.checks.map(entry => <details key={entry.id}><summary>{entry.title}<span>{entry.id}</span></summary><p>{entry.description}</p><SourceLink source={entry.source} />{entry.catches?.length ? <References ids={entry.catches} /> : null}</details>)}</div><h3 className="reader-nongoals-title">What this idea does not claim to do</h3><ul className="reader-nongoals">{model.nonGoals.map((entry, index) => <li key={index}>{entry}</li>)}</ul></section>
          </>}
          {view === 'source' && <section className="reader-section">
            <div className="reader-section-heading"><div><span className="reader-eyebrow">An explanation you can audit</span><h2>The full model is still here</h2><p>The reading guide is an editorial explanation linked to canonical propositions. Every top-level section of the pinned YAML is available below, including material outside the overview.</p></div></div>
            <div className="reader-provenance"><div><GitBranch size={22} aria-hidden="true" /><strong>Exact model revision</strong><code>{model.commit}</code><p>{model.modelPath}</p><SourceLink /></div><div><Check size={22} aria-hidden="true" /><strong>Source bytes verified at build time</strong><code>SHA-256 {model.modelSha256}</code><p>This verifies source identity. It does not establish the truth of the model.</p><a href={model.modelUrl} target="_blank" rel="noreferrer">Open raw YAML <ExternalLink size={13} aria-hidden="true" /></a></div></div>
            <p className="reader-coverage">{model.sourceSections?.length} of {model.sourceSections?.length} top-level source sections available. No section is silently discarded.</p>
            <div className="reader-source-sections">{model.sourceSections?.map(section => <details key={section.key}><summary>{humanize(section.key)}<span>{section.key}</span></summary><SourceLink source={section.source} /><SourceValue value={section.value} /></details>)}</div>
          </section>}
        </div>
        {selection && <dialog ref={panelRef} className="reader-inspector" aria-label="Selected model element" onCancel={event => { event.preventDefault(); close() }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }}>
          <div className="reader-inspector-top"><span>{claim ? kindLabels[claim.kind ?? ''] : term ? 'Reader definition' : 'Reading guide'}</span><button onClick={close} aria-label="Close details"><X size={19} /></button></div>
          <h2 tabIndex={-1}>{chosen?.title ?? 'This model element was not found'}</h2>
          {!chosen && <p>The link may refer to a different model revision. Choose a proposition from this model to continue.</p>}
          {claim && <>
            <span className="reader-claim-id">{claim.id} · Canonical model statement</span>
            <p className="reader-inspector-statement">{claim.statement}</p>
            {claim.rationale && <InspectorSection title="Reasoning"><p>{claim.rationale}</p></InspectorSection>}
            {claim.kind === 'hypothesis' && <InspectorSection title="Evidence supplied"><p className="reader-missing">No evidence linked to this claim in this model revision.</p></InspectorSection>}
            {claim.evidenceNeeded && <InspectorSection title="Evidence needed"><p>{claim.evidenceNeeded}</p></InspectorSection>}
            {claim.falsifier && <InspectorSection title="What would falsify this?"><p>{claim.falsifier}</p></InspectorSection>}
            {claim.stoppingRule && <InspectorSection title="When to stop or revise"><p>{claim.stoppingRule}</p></InspectorSection>}
            {!!claim.alternatives?.length && <InspectorSection title="Replaceable options"><ul>{claim.alternatives.map(entry => <li key={entry}>{entry}</li>)}</ul></InspectorSection>}
            <InspectorSection title="Relationships declared by the model">
              {!claim.links?.length && !incoming.length && <p>No explicit relationships declared for this proposition.</p>}
              {(claim.links ?? []).map(link => <div className="reader-relationship" key={`${link.type}-${link.target}`}><span>{relationLabels[link.type]}</span><References ids={[link.target]} /></div>)}
              {incoming.map(link => <div className="reader-relationship" key={`${link.type}-${link.item.id}`}><span>{incomingLabels[link.type]}</span><References ids={[link.item.id]} /></div>)}
              {(claim.links?.some(link => link.type === 'supports') || incoming.some(link => link.type === 'supports')) && <p className="reader-small-print">“Proposed support” records the model’s dependency claim. It is not a finding that supporting evidence exists.</p>}
            </InspectorSection>
            <InspectorSection title="Trace to source"><SourceLink source={claim.source} /><p className="reader-small-print">Model revision {model.commit.slice(0, 12)}</p></InspectorSection>
          </>}
          {(term || step || note) && <>
            <p className="reader-inspector-statement">{term?.meaning ?? step?.description ?? note?.text}</p>
            {step && <div className="reader-panel-flow"><ArrowDown size={16} aria-hidden="true" />{step.connection}</div>}
            <InspectorSection title="Read the underlying propositions"><References ids={(term ?? step ?? note)!.refs} /></InspectorSection>
            <p className="reader-small-print">This is a reading aid, not an additional model claim. Follow a proposition for its exact wording, declared relationships, and source location.</p>
          </>}
          <button className="reader-panel-close" onClick={close}>Close and return to the idea<ArrowLeft size={15} aria-hidden="true" /></button>
        </dialog>}
      </div>
      <footer className="reader-footer"><span><span className="reader-dot" />An explanation of model v{model.version}</span><a href={sourceUrl(model)} target="_blank" rel="noreferrer">Source {model.commit.slice(0, 12)}<ExternalLink size={12} aria-hidden="true" /></a><a href={model.registryUrl} target="_blank" rel="noreferrer">Publication record<ExternalLink size={12} aria-hidden="true" /></a></footer>
    </main>
  </div>
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="reader-inspector-section"><h3>{title}</h3>{children}</section>
}

function SourceValue({ value }: { value: ModelValue }) {
  if (value === null) return <span className="reader-small-print">Not specified</span>
  if (Array.isArray(value)) return <ol className="reader-source-list">{value.map((entry, index) => <li key={index}><SourceValue value={entry} /></li>)}</ol>
  if (typeof value === 'object') return <dl className="reader-source-values">{Object.entries(value).map(([key, entry]) => <div key={key}><dt>{humanize(key)}</dt><dd><SourceValue value={entry} /></dd></div>)}</dl>
  if (typeof value === 'string' && /^https?:\/\/\S+$/.test(value)) return <a href={value} target="_blank" rel="noreferrer">{value}</a>
  return <span>{String(value)}</span>
}
