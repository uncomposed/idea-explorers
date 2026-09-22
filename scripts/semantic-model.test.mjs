import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parse } from 'yaml'
import { attachSemantics, validateSemantics } from './semantic-model.mjs'

const locks = JSON.parse(await readFile(new URL('../models.lock.json', import.meta.url), 'utf8'))
async function fixture(slug, editSource = value => value) {
  const lock = locks.find(entry => entry.slug === slug)
  const yaml = await readFile(new URL(`../public/models/${slug}-${lock.model_sha256.slice(0, 12)}.yaml`, import.meta.url), 'utf8')
  assert.equal(createHash('sha256').update(yaml).digest('hex'), lock.model_sha256, 'Tests must use the pinned source bytes')
  const source = parse(yaml)
  const groups = slug === 'price-of-going-back'
    ? ['kernel', 'derived', 'hypothesis', 'implementation', 'open_question'].map(id => [id, source.nodes.filter(entry => entry.kind === id)])
    : [['kernel', source.kernel], ['derived', source.derived], ['hypothesis', source.hypotheses], ['implementation', source.implementation_choices], ['open_question', source.open_questions]]
  const model = { slug, lanes: groups.map(([id, nodes]) => ({ id, items: nodes.map(node => ({ id: node.id, title: node.title ?? node.question })) })) }
  return { model: attachSemantics(model, editSource(yaml)), source, yaml }
}
const item = (model, id) => model.lanes.flatMap(lane => lane.items).find(entry => entry.id === id)

test('Price H1 preserves reasoning, evidence requirements, falsifier, and stopping rule as distinct roles', async () => {
  const { model, source } = await fixture('price-of-going-back')
  const actual = item(model, 'H1')
  const expected = source.nodes.find(entry => entry.id === 'H1')
  assert.equal(actual.statement, expected.statement)
  assert.equal(actual.evidenceNeeded, expected.evidence_needed)
  assert.equal(actual.falsifier, expected.falsifier)
  assert.equal(actual.stoppingRule, expected.stopping_rule)
  assert.equal(actual.rationale, undefined)
  assert.equal(actual.detail, undefined, 'Must not relabel a falsifier as Why it matters')
})

test('Cislunar H1 is a claim, not its proposed evidence list', async () => {
  const { model, source } = await fixture('cislunar-momentum-loop')
  const actual = item(model, 'H1')
  assert.equal(actual.statement, source.hypotheses[0].title)
  assert.notEqual(actual.statement, source.hypotheses[0].evidence_needed)
  assert.equal(actual.evidenceNeeded, source.hypotheses[0].evidence_needed)
  assert.equal(actual.stoppingRule, source.hypotheses[0].stopping_rule)
})

for (const slug of ['price-of-going-back', 'cislunar-momentum-loop']) {
  test(`${slug}: all source sections survive the projection without data loss`, async () => {
    const { model, source } = await fixture(slug)
    assert.deepEqual(Object.fromEntries(model.sourceSections.map(entry => [entry.key, entry.value])), source)
  })
  test(`${slug}: every proposition resolves to its exact YAML location`, async () => {
    const { model, yaml } = await fixture(slug)
    for (const actual of model.lanes.flatMap(lane => lane.items)) {
      assert.equal(yaml.split('\n')[actual.source.line - 1].trim(), `- id: ${actual.id}`)
    }
  })
}

test('declared relation types survive independently, including simultaneous types', async () => {
  const { model } = await fixture('price-of-going-back', yaml => yaml.replace('derived_from: [K1, K3, K7]', 'derived_from: [K1, K3, K7]\n    supports: [H1]'))
  assert.deepEqual(item(model, 'D1').links, [
    { type: 'derived_from', target: 'K1' }, { type: 'derived_from', target: 'K3' }, { type: 'derived_from', target: 'K7' }, { type: 'supports', target: 'H1' },
  ])
})

test('dangling relationships stop generation rather than create dead links', async () => {
  const { model } = await fixture('price-of-going-back')
  item(model, 'D1').links.push({ type: 'derived_from', target: 'MISSING' })
  assert.throws(() => validateSemantics(model), /dangling reference MISSING/)
})

test('Cislunar background sources retain their declared role, not invented claim support', async () => {
  const { model, source } = await fixture('cislunar-momentum-loop')
  assert.deepEqual(model.contextSources.map(({ source: location, ...entry }) => entry), source.source_anchors)
  assert.equal(item(model, 'H2').evidence, undefined)
  assert.equal(model.guide.returnFlow.refs.includes('D4'), true, 'Optional Earth tether needs a canonical source')
})

test('reader annotations with missing canonical references fail validation', async () => {
  const { model } = await fixture('price-of-going-back')
  const copy = structuredClone(model)
  copy.guide.terms[0].refs = []
  assert.throws(() => validateSemantics(copy), /lacks canonical references/)
})

test('new claim-linked evidence cannot silently inherit the no-evidence display', async () => {
  await assert.rejects(fixture('price-of-going-back', yaml => yaml.replace('    kind: hypothesis', '    evidence: [new-result]\n    kind: hypothesis')), /explicit semantic mapping/)
})
