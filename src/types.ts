export type ExplorerItem = {
  id: string
  title: string
  statement: string
  detail?: string
  relations?: string[]
  badge?: string
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
}
