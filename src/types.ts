export type SourceLocation = { path: string; line: number }
export type ModelValue = null | string | number | boolean | ModelValue[] | { [key: string]: ModelValue }
export type ReadingNote = { title: string; text: string; refs: string[] }
export type ReaderGuide = {
  question: string
  introduction: string
  premise: string
  scope: string
  scopeRefs: string[]
  mechanismTitle: string
  mechanismDescription: string
  steps: Array<{ id: string; title: string; description: string; refs: string[]; connection: string }>
  terms: Array<{ id: string; title: string; meaning: string; refs: string[] }>
  example: ReadingNote
  uncertainty: ReadingNote
  returnFlow?: ReadingNote
  featured: string[]
}

export type ExplorerItem = {
  id: string
  title: string
  statement: string
  detail?: string
  relations?: string[]
  badge?: string
  kind?: string
  source?: SourceLocation
  rationale?: string
  evidenceNeeded?: string
  falsifier?: string
  stoppingRule?: string
  alternatives?: string[]
  links?: Array<{ type: 'derived_from' | 'supports' | 'implements'; target: string }>
}

export type ExplorerLane = {
  id: string
  title: string
  description: string
  items: ExplorerItem[]
}

export type ExplorerPath = {
  id: string
  title: string
  description?: string
  steps: string[]
}

export type ExplorerCheck = {
  id: string
  title: string
  description: string
  catches?: string[]
  tone?: 'guard' | 'question' | 'boundary'
  source?: SourceLocation
}

export type ExplorerModel = {
  slug: string
  title: string
  shortTitle: string
  summary: string
  version: string
  status: string
  repository: string
  commit: string
  modelPath: string
  modelSha256: string
  modelUrl: string
  registryUrl: string
  accent: string
  accentSoft: string
  motif: 'curve' | 'orbit' | 'fork' | 'network'
  metrics: Array<{ value: string; label: string }>
  framing: string
  lanes: ExplorerLane[]
  paths: ExplorerPath[]
  checks: ExplorerCheck[]
  nonGoals: string[]
  guide?: ReaderGuide
  contextSources?: Array<{ id: string; title: string; uri: string; role: string; source: SourceLocation }>
  sourceSections?: Array<{ key: string; value: ModelValue; source: SourceLocation }>
  sourceLocations?: Record<string, SourceLocation>
}
