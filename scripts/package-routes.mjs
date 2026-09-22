import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const locks = JSON.parse(await readFile(resolve(root, 'models.lock.json'), 'utf8'))
const commit = process.env.EXPLORER_COMMIT || 'development'
const index = await readFile(resolve(dist, 'index.html'))
const display = {
  'price-of-going-back': { title: 'The Price of Going Back', description: 'Explore the model behind a personal rollback experiment without confusing its curve for a universal price of progress.' },
  'cislunar-momentum-loop': { title: 'Cislunar Momentum Loop', description: 'Explore the architecture, feasibility gates, evidence paths, and failure boundaries of a reusable lunar transport loop.' },
  'voting-topics': { title: 'Voting Topics', description: 'Explore the typed information layers and forkable reasoning path behind human-owned civic decision guides.' },
  'ai-pacing': { title: 'AI Pacing', description: 'Explore how research, adversarial review, and reversible deployment fit together.' },
  'spoken-margins': { title: 'Spoken Margins', description: 'Explore listening that preserves context, interruption, and your own thoughts.' },
  guestbook: { title: 'Relic Guestbook', description: 'Explore portable signed acknowledgments of places, discoveries, and encounters.' },
  irap: { title: 'Idea Rendering Attestation Protocol', description: 'Explore how exact idea states, independent renderings, signed judgments, and historical recognition fit together.' },
}

async function filesUnder(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) found.push(...await filesUnder(path))
    else found.push(path)
  }
  return found
}

for (const lock of locks) {
  const route = resolve(dist, lock.slug)
  const release = resolve(route, 'releases', commit)
  await mkdir(release, { recursive: true })
  const metadata = display[lock.slug]
  const routeIndex = index.toString('utf8')
    .replace('<meta name="theme-color" content="#0b0f14" />', '<meta name="theme-color" content="#f6f5ef" />')
    .replace('<title>Idea Explorer · Proximity to Progress</title>', `<title>${metadata.title} — Explore the idea</title>`)
    .replace('Explore a canonical idea model published by Proximity to Progress.', metadata.description)
  await writeFile(resolve(route, 'index.html'), routeIndex)
  await writeFile(resolve(release, 'index.html'), routeIndex)

  const modelName = `${lock.slug}-${lock.model_sha256.slice(0, 12)}.yaml`
  const sharedFiles = [
    ...(await filesUnder(resolve(dist, 'assets'))),
    resolve(dist, 'models', modelName),
  ]
  const manifestFiles = []
  for (const path of [resolve(release, 'index.html'), ...sharedFiles]) {
    const bytes = await readFile(path)
    manifestFiles.push({
      path: relative(dist, path),
      bytes: bytes.byteLength,
      digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    })
  }
  const manifest = {
    manifest_version: '1',
    rendering: {
      id: `https://proximitytoprogress.com/ideas/${lock.slug}/renderings/explorer-${commit}`,
      title: `${metadata.title} Idea Explorer`,
      live_uri: `https://proximitytoprogress.com/ideas/${lock.slug}/`,
      source: {
        repository: 'https://github.com/uncomposed/idea-explorers.git',
        commit,
      },
      renders: {
        idea_id: `https://ideas.proximitytoprogress.com/ideas/${lock.slug}`,
        git: {
          repository: lock.repository,
          object_format: 'sha1',
          commit: lock.commit,
          path: lock.model_path,
          model_digest: `sha256:${lock.model_sha256}`,
        },
      },
      files: manifestFiles,
    },
  }
  await writeFile(resolve(release, 'rendering-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
}

await cp(resolve(dist, 'index.html'), resolve(dist, '404.html'))
console.log(`Packaged ${locks.length} explorer routes for ${commit}.`)
