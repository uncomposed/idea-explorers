const words = value => value.replaceAll('_', ' ').replace(/^\w/, c => c.toUpperCase())
const asText = value => typeof value === 'string' ? value.trim() : Array.isArray(value) ? value.join(' · ') : JSON.stringify(value)
const entry = (id, title, statement, sourcePath, kind = 'kernel', extra = {}) => ({ id, title, statement: asText(statement), sourcePath, kind, ...extra })
const lane = (id, title, items) => ({ id, title, description: title, items })
const checks = (values, path) => values.map((value, index) => ({id:`check-${index}`,title:asText(value),description:asText(value),sourcePath:[...path,index]}))
const paths = (values, prefix) => Object.entries(values).map(([id,value]) => ({id,title:words(id),steps:value.path ?? value,sourcePath:[...prefix,id]}))
const base = (lock, title, summary, version='0.1', status='draft') => ({ slug:lock.slug,title,shortTitle:title,summary:asText(summary),version:String(version),status,accent:'#386649',accentSoft:'#e9eee3',motif:'network',framing:asText(summary),metrics:[],lanes:[],paths:[],checks:[],nonGoals:[] })

export function normalizeAdditional(source, lock) {
  if(lock.slug === 'ai-pacing') {
    const model=base(lock,source.idea.name,source.specification.purpose,source.specification.version,source.specification.status)
    model.lanes=Object.entries(source.typed_layers).map(([kind,definition])=>lane(kind,words(kind),source.nodes.filter(n=>n.kind===kind).map(n=>entry(n.id,n.title,n.statement,['nodes',source.nodes.indexOf(n)],kind))))
    model.checks=source.acceptance_tests.map((test,index)=>({id:test.id,title:test.title,description:test.rationale,sourcePath:['acceptance_tests',index]}))
    // Authoring restrictions belong in the full source, not the idea’s user-facing limits.
    model.nonGoals=[]
    return model
  }
  if(lock.slug === 'spoken-margins') {
    const s=source.idea; const model=base(lock,s.short_name,s.summary,s.version,s.status)
    model.lanes=[
      lane('objects','Information objects',Object.entries(s.information_objects).map(([id,v])=>entry(id,words(id),v.meaning,['idea','information_objects',id],'definition',{rationale:v.invariant}))),
      lane('stages','Listening stages',s.execution_topology.stages.map((v,index)=>entry(v.id,words(v.id),v.purpose,['idea','execution_topology','stages',index],'mechanism',{links:s.execution_topology.stages[index+1]?[{type:'next',target:s.execution_topology.stages[index+1].id}]:[]}))),
      lane('principles','Principles',Object.entries(s.principles).map(([id,v])=>entry(id,words(id),v,['idea','principles',id]))),
      lane('challenges','Challenges',Object.entries(s.challenges).map(([id,v])=>entry(id,words(id),v,['idea','challenges',id],'open_question'))),
    ]
    model.paths=paths(s.evidence_paths,['idea','evidence_paths']); model.checks=checks(s.failure_modes,['idea','failure_modes']); model.nonGoals=s.non_goals
    return model
  }
  if(lock.slug === 'voting-topics') {
    const s=source.idea_model; const model=base(lock,s.name,s.thesis,s.version)
    model.lanes=[
      lane('layers','Parts of a guide',Object.entries(s.information_layers).map(([id,v])=>entry(id,words(id),v.contains,['idea_model','information_layers',id],'definition'))),
      lane('mechanism','Guide lifecycle',s.mechanism.map((v,index)=>entry(`stage-${index}`,words(v),v,['idea_model','mechanism',index],'mechanism',{links:index<s.mechanism.length-1?[{type:'next',target:`stage-${index+1}`}]:[]}))),
      lane('invariants','Principles',s.invariants.map((v,index)=>entry(`principle-${index}`,v,v,['idea_model','invariants',index]))),
      lane('questions','Open questions',s.open_challenges.map((v,index)=>entry(`question-${index}`,words(v),v,['idea_model','open_challenges',index],'open_question'))),
    ]
    model.paths=paths(s.evidence_paths,['idea_model','evidence_paths']); model.checks=checks(s.invariants,['idea_model','invariants']); model.nonGoals=s.non_goals
    return model
  }
  if(lock.slug === 'guestbook') {
    const s=source; const model=base(lock,s.idea.name,s.idea.summary,'1',s.idea.status)
    model.lanes=[
      lane('artifacts','Kinds of acknowledgment',s.artifact_types.map((v,index)=>entry(v.name,words(v.name),v.meaning,['artifact_types',index],'definition'))),
      lane('layers','Responsibilities',s.typed_layers.map((v,index)=>entry(v.name,words(v.name),v.authority,['typed_layers',index],'definition'))),
      lane('constraints','Protocol rules',s.constraints.map((v,index)=>entry(`rule-${index}`,v,v,['constraints',index]))),
      lane('principle','Core principle',[entry('principle','The host does not determine validity',s.idea.principle,['idea','principle'])]),
    ]
    model.checks=checks(s.constraints,['constraints'])
    return model
  }
  if(lock.slug === 'irap') {
    const s=source; const model=base(lock,'Idea Rendering Attestation Protocol',s.protocol.description,s.protocol.version,s.protocol.status)
    const titles=['An idea has a durable identity','A version is an exact Git commit','A rendering is an independent interpretation','Verification belongs to a named reviewer','An attestation is a signed judgment','Recognition follows the idea’s rules','Evidence can take many forms','Identity is independent of its host','Distribution does not establish truth','Older versions retain their meaning']
    model.shortTitle='Idea Rendering Attestation Protocol'
    model.lanes=[
      lane('objects','Key definitions',[
        entry('idea-state','Idea version',s.core_principles.P2,['core_principles','P2'],'definition'),
        entry('rendering','Rendering',s.rendering.definition,['rendering','definition'],'definition'),
        entry('attestation','Attestation',s.attestation.definition,['attestation','definition'],'definition'),
        entry('recognition','Recognized verification',s.trust_model.recognized_verification,['trust_model','recognized_verification'],'definition')]),
      lane('principles','Core principles',Object.entries(s.core_principles).map(([id,v],index)=>entry(id,titles[index],v,['core_principles',id]))),
      lane('trust','Trust and disagreement',Object.entries(s.trust_model).map(([id,v])=>entry(id,words(id),v,['trust_model',id]))),
    ]
    model.paths=[{id:'recognition',title:'Checking a signed judgment',steps:s.recognition_algorithm.steps,sourcePath:['recognition_algorithm','steps']}]
    model.checks=checks(s.security,['security']);model.nonGoals=s.non_goals
    return model
  }
  throw new Error(`No adapter for ${lock.slug}`)
}
