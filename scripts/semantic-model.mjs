import { LineCounter, parseDocument, isMap, isSeq } from 'yaml'
import { readerGuides } from './reader-guides.mjs'

// Keep semantic roles separate. In particular, evidence_needed is never a claim
// statement, a falsifier is never a rationale, and references are not proof.
export function attachSemantics(model, yaml) {
  if (!readerGuides[model.slug]) return model
  const lineCounter = new LineCounter()
  const doc = parseDocument(yaml, { lineCounter })
  if (doc.errors.length) throw new Error(doc.errors.map(error => error.message).join('\n'))
  const source = doc.toJS()
  const locate = path => {
    const node = doc.getIn(path, true)
    if (!node?.range) throw new Error(`Missing source path: ${path.join('.')}`)
    return { path: path.join('.'), line: lineCounter.linePos(node.range[0]).line }
  }
  const price = model.slug === 'price-of-going-back'
  const typed = price || model.slug === 'ai-pacing' || model.slug === 'cislunar-momentum-loop'
  for (const lane of model.lanes) {
    const key = source.nodes ? 'nodes' : ({ kernel: 'kernel', derived: 'derived', hypothesis: 'hypotheses', implementation: 'implementation_choices', open_question: 'open_questions' })[lane.id]
    for (const item of lane.items) {
      if (!typed) { item.source = locate(item.sourcePath); delete item.sourcePath; continue }
      const index = source[key].findIndex(node => node.id === item.id)
      if (index < 0) throw new Error(`Missing source node ${item.id}`)
      const node = source[key][index]
      if (['evidence', 'evidence_refs', 'evidence_links', 'results'].some(field => node[field] != null)) {
        throw new Error(`${item.id}: claim-linked evidence needs an explicit semantic mapping before publishing`)
      }
      item.kind = lane.id
      item.source = locate([key, index])
      item.statement = node.statement ?? node.question ?? node.title
      item.rationale = node.rationale
      item.evidenceNeeded = node.evidence_needed
      item.falsifier = node.falsifier
      item.stoppingRule = node.stopping_rule
      item.alternatives = node.replaceable_with ?? node.examples
      item.links = ['derived_from', 'supports', 'implements', 'relates_to'].flatMap(type => (node[type] ?? []).map(target => ({ type, target })))
      item.lineage = (node.provenance?.sources ?? []).map(id => {
        const index = source.sources.findIndex(entry => entry.id === id)
        if (index < 0) throw new Error(`Missing provenance source ${id}`)
        const entry = source.sources[index]
        return { id, title:entry.title, locator:entry.locator, role:entry.contribution, source:locate(['sources',index]) }
      })
      delete item.sourcePath
      delete item.detail
      delete item.relations
    }
  }
  model.guide = readerGuides[model.slug]
  if(model.slug === 'ai-pacing') {
    const items=model.lanes.flatMap(lane=>lane.items)
    items.find(item=>item.id==='H1').title='Capability, hardware, and power can remain separable'
    items.find(item=>item.id==='Q4').title='When might capability alone defeat separate hardware and power controls?'
    // Preserve the separate relation table literally; its directional semantics
    // differ from node-level implements, so label it as a recorded relation.
    for(const edge of source.relations) {
      const item=items.find(item=>item.id===edge.from)
      if(!item) throw new Error(`Unknown relation source ${edge.from}`)
      item.links.push({type:`table_${edge.type}`,target:edge.to})
    }
  }
  for(const path of model.paths ?? []) { if(path.sourcePath) { path.source=locate(path.sourcePath); delete path.sourcePath } }
  for (const check of model.checks ?? []) {
    if(check.sourcePath) { check.source=locate(check.sourcePath); delete check.sourcePath; continue }
    const index = Number(check.id.split('-').at(-1)) - 1
    const path = price
      ? check.id.startsWith('INV-') ? ['invariants', index] : ['failure_modes', source.failure_modes.findIndex(entry => entry.id === check.id)]
      : check.id.startsWith('F-') ? ['failure_modes', index]
        : check.id.startsWith('OM-') ? ['audit', 'omission_checks', index]
          : check.id.startsWith('FT-') ? ['audit', 'falsification_tests', index] : ['audit', 'promotion_rule']
    check.source = locate(path)
  }
  model.contextSources = source.sources ? source.sources.map((entry,index)=>({id:entry.id,title:entry.title,locator:entry.locator,role:entry.contribution,source:locate(['sources',index])})) : (source.source_anchors ?? []).map((entry, index) => ({ ...entry, source: locate(['source_anchors', index]) }))
  model.evidenceSummary = typed
    ? 'This revision states hypotheses and the tests needed to challenge them. It does not report completed empirical validation. Source lineage, where supplied, explains where the thinking came from.'
    : 'This revision defines behavior, principles, and questions to inspect. Its checks and background references do not establish that an implementation has passed them.'
  // All canonical top-level sections remain reachable in the source browser.
  // This is a coverage inventory, not a claim that every section is in the guide.
  model.sourceSections = Object.entries(source).map(([key, value]) => ({ key, value, source: locate([key]) }))
  model.sourceLocations = {}
  function walk(node, path) {
    if (node?.range && path.length) model.sourceLocations[path.join('.')] = locate(path)
    if (isMap(node)) for (const pair of node.items) walk(pair.value, [...path, String(pair.key.value)])
    if (isSeq(node)) node.items.forEach((child, index) => walk(child, [...path, index]))
  }
  walk(doc.contents, [])
  validateSemantics(model)
  return model
}

export function validateSemantics(model) {
  const items = model.lanes.flatMap(lane => lane.items)
  const ids = new Set(items.map(item => item.id))
  if (ids.size !== items.length) throw new Error(`${model.slug}: duplicate claim IDs`)
  const requireId = id => { if (!ids.has(id)) throw new Error(`${model.slug}: dangling reference ${id}`) }
  for (const item of items) {
    for (const link of item.links ?? []) requireId(link.target)
    if (!item.source?.line || !item.source.path) throw new Error(`${item.id}: missing source provenance`)
    if (item.kind === 'hypothesis' && (!item.evidenceNeeded || !item.falsifier || !item.stoppingRule)) throw new Error(`${item.id}: incomplete hypothesis mapping`)
  }
  const guide = model.guide
  const entries = [...guide.steps, ...guide.terms, guide.example, guide.uncertainty, ...(guide.returnFlow ? [guide.returnFlow] : [])]
  for (const entry of entries) {
    if (!entry.refs?.length) throw new Error('Reader explanation lacks canonical references')
    entry.refs.forEach(requireId)
  }
  guide.scopeRefs.forEach(requireId)
  guide.featured.forEach(requireId)
}
