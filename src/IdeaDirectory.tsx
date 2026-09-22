import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react'
import type { ExplorerModel } from './types'
import './reader.css'

export function IdeaDirectory({ models }: { models: ExplorerModel[] }) {
  return <div className="reader"><a className="reader-skip" href="#ideas">Skip to ideas</a><header className="reader-header"><a className="reader-brand" href="https://proximitytoprogress.com/"><Sparkles size={19} aria-hidden="true" />Proximity to Progress</a><span className="reader-header-label">Ideas you can explore</span></header><main className="reader-main">
    <section className="reader-intro"><div><p className="reader-eyebrow">{models.length} ideas. Many ways in.</p><h1>Understand it. Question it. Try it.</h1><p className="reader-introduction">Explore what each idea proposes, how its pieces fit together, and what still needs to be tested. Then open an application, experiment, or other working interpretation.</p></div></section>
    <section id="ideas" className="reader-directory" aria-label="Registered ideas">{models.map(model=><article key={model.slug}><span className="reader-eyebrow">{model.guide?.premise}</span><h2><a href={`/ideas/${model.slug}/`}>{model.title}</a></h2><p>{model.guide?.question ?? model.summary}</p><a className="reader-primary" href={`/ideas/${model.slug}/`}>Explore the idea<ArrowRight size={17} aria-hidden="true" /></a><a className="reader-directory-experience" href={model.experience.url}>{model.experience.label}<ArrowUpRight size={16} aria-hidden="true" /></a><small>{model.experience.description}</small></article>)}</section>
    <footer className="reader-footer"><span>All {models.length} currently registered ideas</span><a href="https://ideas.proximitytoprogress.com/">Open the publication registry<ArrowUpRight size={16} aria-hidden="true" /></a></footer>
  </main></div>
}
