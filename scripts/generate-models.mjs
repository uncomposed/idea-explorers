import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const locks = JSON.parse(await readFile(resolve(root, 'models.lock.json'), 'utf8'))
const generated = []

const words = value => typeof value === 'string' ? value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : ''
const text = value => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(' · ')
  return Object.entries(value).map(([key, item]) => `${words(key)}: ${text(item)}`).join(' · ')
}
const item = (id, title, statement, options = {}) => ({ id, title, statement: text(statement), ...options })
const check = (id, title, description, options = {}) => ({ id, title, description: text(description), ...options })

function assertNormalizedModel(model) {
  const fields = [
    ['title', model.title], ['summary', model.summary], ['framing', model.framing],
    ...model.lanes.flatMap(lane => [
      [`lane ${lane.id} title`, lane.title], [`lane ${lane.id} description`, lane.description],
      ...lane.items.flatMap(entry => [
        [`item ${entry.id} title`, entry.title], [`item ${entry.id} statement`, entry.statement],
        ...(entry.detail == null ? [] : [[`item ${entry.id} detail`, entry.detail]]),
      ]),
    ]),
    ...model.paths.flatMap(path => [
      [`path ${path.id} title`, path.title],
      ...(path.description == null ? [] : [[`path ${path.id} description`, path.description]]),
      ...path.steps.map((step, index) => [`path ${path.id} step ${index + 1}`, step]),
    ]),
    ...model.checks.flatMap(entry => [[`check ${entry.id} title`, entry.title], [`check ${entry.id} description`, entry.description]]),
    ...model.nonGoals.map((goal, index) => [`non-goal ${index + 1}`, goal]),
  ]
  for (const [label, value] of fields) {
    if (typeof value !== 'string') throw new Error(`${model.slug}: ${label} must normalize to text`)
  }
}

function normalizePrice(source, lock) {
  const spec = source.specification
  const groups = ['kernel', 'derived', 'hypothesis', 'implementation', 'open_question']
  return {
    slug: lock.slug,
    title: spec.title,
    shortTitle: 'Price of Going Back',
    summary: spec.purpose,
    version: spec.version,
    status: spec.status,
    accent: '#f08a5d',
    accentSoft: '#4a241f',
    motif: 'curve',
    framing: 'Follow a private judgment from one bounded loss to a cumulative rollback curve—without turning it into a universal price of progress.',
    metrics: [
      { value: String(source.nodes.filter(node => node.kind === 'kernel').length), label: 'kernel propositions' },
      { value: String(source.failure_modes.length), label: 'named failure modes' },
      { value: String(source.invariants.length), label: 'invariants' },
    ],
    lanes: groups.map(kind => ({
      id: kind,
      title: words(kind),
      description: source.typed_layers[kind]?.description ?? 'Declared model layer',
      items: source.nodes.filter(node => node.kind === kind).map(node => item(node.id, node.title, node.statement ?? node.rationale, {
        detail: node.rationale ?? node.falsifier ?? text(node.replaceable_with),
        relations: node.derived_from ?? node.supports ?? node.implements,
        badge: words(kind),
      })),
    })),
    paths: Object.entries(source.evidence_paths).map(([id, value]) => ({ id, title: words(id), steps: value.path })),
    checks: [
      ...source.failure_modes.map(mode => check(mode.id, mode.name, mode.signature, { catches: mode.catches, tone: 'guard' })),
      ...source.invariants.map((value, index) => check(`INV-${index + 1}`, `Invariant ${index + 1}`, value, { tone: 'boundary' })),
    ],
    nonGoals: source.non_goals,
  }
}

function normalizeCislunar(source, lock) {
  const layerDefinitions = [
    ['kernel', 'Kernel', source.typed_layers.kernel, source.kernel],
    ['derived', 'Derived mechanisms', source.typed_layers.derived, source.derived],
    ['hypothesis', 'Feasibility hypotheses', source.typed_layers.hypothesis, source.hypotheses],
    ['implementation', 'Replaceable choices', source.typed_layers.implementation, source.implementation_choices],
    ['open_question', 'Open questions', source.typed_layers.open_question, source.open_questions],
  ]
  return {
    slug: lock.slug,
    title: source.idea.name,
    shortTitle: 'Cislunar Momentum Loop',
    summary: source.idea.summary,
    version: source.idea.version,
    status: source.idea.status,
    accent: '#79d4e8',
    accentSoft: '#15364a',
    motif: 'orbit',
    framing: `${source.decision_boundary.objective} Primary screen: ${source.decision_boundary.primary_metric}.`,
    metrics: [
      { value: String(source.kernel.length), label: 'kernel propositions' },
      { value: String(source.hypotheses.length), label: 'feasibility gates' },
      { value: String(source.resources.length), label: 'tracked resources' },
    ],
    lanes: layerDefinitions.map(([id, title, description, values]) => ({
      id,
      title,
      description: text(description?.description ?? description),
      items: values.map((node, index) => item(node.id ?? `${String(id).slice(0, 1).toUpperCase()}${index + 1}`, node.title ?? node.question, node.statement ?? node.evidence_needed ?? node.question, {
        detail: node.falsifier ?? node.stopping_rule ?? text(node.examples),
        relations: node.derived_from ?? node.supports,
        badge: node.status ?? words(id),
      })),
    })),
    paths: Object.entries(source.evidence_paths).map(([id, steps]) => ({ id, title: words(id), steps })),
    checks: [
      ...source.audit.omission_checks.map((value, index) => check(`OM-${index + 1}`, `Omission check ${index + 1}`, value, { tone: 'guard' })),
      ...source.audit.falsification_tests.map((value, index) => check(`FT-${index + 1}`, `Falsification test ${index + 1}`, value, { tone: 'question' })),
      check('PROMOTE', 'Promotion rule', source.audit.promotion_rule, { tone: 'boundary' }),
    ],
    nonGoals: source.non_goals,
  }
}

function normalizeVoting(source, lock) {
  const model = source.idea_model
  return {
    slug: lock.slug,
    title: model.name,
    shortTitle: 'Voting Topics',
    summary: model.thesis.trim(),
    version: model.version,
    status: 'working-draft',
    accent: '#f2c14e',
    accentSoft: '#4c3b13',
    motif: 'fork',
    framing: 'Trace how a personal priority becomes an inspectable guide—and how a peer can disagree by forking the inputs rather than mutating someone else’s judgment.',
    metrics: [
      { value: String(Object.keys(model.information_layers).length), label: 'information layers' },
      { value: String(model.mechanism.length), label: 'mechanism steps' },
      { value: String(model.invariants.length), label: 'invariants' },
    ],
    lanes: Object.entries(model.information_layers).map(([id, value], laneIndex) => ({
      id,
      title: words(id),
      description: `Layer ${laneIndex + 1} of ${Object.keys(model.information_layers).length}`,
      items: value.contains.map((entry, index) => item(`${laneIndex + 1}.${index + 1}`, words(entry), entry, { badge: words(id) })),
    })),
    paths: [
      { id: 'mechanism', title: 'Guide lifecycle', description: 'The idea’s declared end-to-end mechanism', steps: model.mechanism },
      ...Object.entries(model.evidence_paths).map(([id, value]) => ({ id, title: words(id), steps: value.path })),
    ],
    checks: [
      ...model.invariants.map((value, index) => check(`INV-${index + 1}`, `Invariant ${index + 1}`, value, { tone: 'boundary' })),
      ...model.open_challenges.map((value, index) => check(`Q-${index + 1}`, words(value), value, { tone: 'question' })),
    ],
    nonGoals: model.non_goals,
  }
}

function normalizeIrap(source, lock) {
  const lifecycle = [
    item('IDEA', 'Idea state', source.core_principles.P1, { detail: source.core_principles.P2, badge: 'Git identity' }),
    item('RENDER', 'Rendering', source.rendering.definition, { detail: text(source.rendering.required), badge: 'Artifact digest' }),
    item('ATTEST', 'Attestation', source.attestation.definition, { detail: source.attestation.evidence, badge: 'Signed judgment' }),
    item('RECOGNIZE', 'Recognition', source.trust_model.recognized_verification, { detail: source.trust_model.disagreement, badge: 'Historical policy' }),
  ]
  const principles = Object.entries(source.core_principles).map(([id, statement]) => item(id, `Principle ${id.slice(1)}`, statement, { badge: 'Core principle' }))
  const trust = Object.entries(source.trust_model).map(([id, statement], index) => item(`T${index + 1}`, words(id), statement, { badge: 'Trust boundary' }))
  return {
    slug: lock.slug,
    title: source.protocol.name,
    shortTitle: 'IRAP',
    summary: source.protocol.description.trim(),
    version: source.protocol.version,
    status: source.protocol.status,
    accent: '#b7a6ff',
    accentSoft: '#302659',
    motif: 'network',
    framing: 'Separate immutable identity, independent expression, attributable judgment, and locally recognized verification.',
    metrics: [
      { value: String(principles.length), label: 'core principles' },
      { value: String(source.recognition_algorithm.steps.length), label: 'recognition steps' },
      { value: String(Object.keys(source.recognition_rules_v0_1).length - 1), label: 'recognition rules' },
    ],
    lanes: [
      { id: 'lifecycle', title: 'Protocol lifecycle', description: 'The four objects people most often collapse together', items: lifecycle },
      { id: 'principles', title: 'Core principles', description: 'Normative identity and verification rules', items: principles },
      { id: 'trust', title: 'Trust model', description: 'Where authority does—and does not—come from', items: trust },
    ],
    paths: [
      { id: 'recognition', title: 'Recognition algorithm', description: 'How a signed claim becomes locally recognized evidence', steps: source.recognition_algorithm.steps },
      ...Object.entries(source.recognition_rules_v0_1).filter(([id]) => id !== 'restriction').map(([id, value]) => ({ id, title: words(id), steps: [value.recognized_when] })),
    ],
    checks: source.security.map((value, index) => check(`SEC-${index + 1}`, `Security boundary ${index + 1}`, value, { tone: 'guard' })),
    nonGoals: source.non_goals,
  }
}

const normalizers = {
  'price-of-going-back': normalizePrice,
  'cislunar-momentum-loop': normalizeCislunar,
  'voting-topics': normalizeVoting,
  irap: normalizeIrap,
}

for (const lock of locks) {
  const response = await fetch(lock.raw_url, { redirect: 'error' })
  if (!response.ok) throw new Error(`Could not fetch ${lock.slug}: HTTP ${response.status}`)
  const yaml = await response.text()
  const digest = createHash('sha256').update(yaml).digest('hex')
  if (digest !== lock.model_sha256) throw new Error(`${lock.slug} model digest changed: ${digest}`)
  const normalized = normalizers[lock.slug](parse(yaml), lock)
  assertNormalizedModel(normalized)
  generated.push({
    ...normalized,
    repository: lock.repository,
    commit: lock.commit,
    modelPath: lock.model_path,
    modelSha256: digest,
    modelUrl: `/ideas/models/${lock.slug}-${digest.slice(0, 12)}.yaml`,
    registryUrl: `https://ideas.proximitytoprogress.com/ideas/${lock.slug}`,
  })
  await mkdir(resolve(root, 'public/models'), { recursive: true })
  await writeFile(resolve(root, `public/models/${lock.slug}-${digest.slice(0, 12)}.yaml`), yaml)
}

await mkdir(resolve(root, 'src'), { recursive: true })
await writeFile(resolve(root, 'src/generated.ts'), `import type { ExplorerModel } from './types'\n\nexport const models = ${JSON.stringify(generated, null, 2)} as ExplorerModel[]\n`)
console.log(`Prepared ${generated.length} digest-verified idea models.`)
