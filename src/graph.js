const nonempty = value => typeof value === 'string' && value.trim().length > 0;

// Two consecutive paid runs returned a valid graph that was thrown away because the model
// echoed the objective without its final full stop. An exact string match is a poor drift
// detector: blind to a graph that has genuinely wandered, and fatal to a punctuation mark.
// Surrounding whitespace and trailing sentence punctuation are ignored; nothing else is.
const sameObjective = (echoed, objective) => nonempty(echoed) && nonempty(objective)
  && echoed.trim().replace(/[.!?\s]+$/, '') === objective.trim().replace(/[.!?\s]+$/, '');

export function validateGraph(graph, objective) {
  if (!graph || !sameObjective(graph.objective, objective) || !nonempty(graph.summary)
    || !Array.isArray(graph.nodes) || graph.nodes.length < 1 || graph.nodes.length > 8) {
    throw new Error('Expected the original objective, a research summary, and 1–8 nodes.');
  }
  const nodes = new Map();
  for (const node of graph.nodes) {
    if (!node || typeof node.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(node.id)
      || !nonempty(node.title) || !nonempty(node.reason)
      || !Array.isArray(node.evidence) || !node.evidence.length || !node.evidence.every(nonempty)
      || !Array.isArray(node.dependsOn) || !node.dependsOn.every(nonempty) || nodes.has(node.id)) {
      throw new Error('Each node needs a unique slug id, title, reason, evidence, and dependsOn array.');
    }
    // Outcomes are absent from a freshly planned graph and appended later by `tag record`.
    if (node.outcomes !== undefined && (!Array.isArray(node.outcomes) || !node.outcomes.length
      || !node.outcomes.every(item => item && nonempty(item.at) && nonempty(item.outcome)))) {
      throw new Error(`Node ${node.id} has outcomes that are not a nonempty list of {at, outcome}.`);
    }
    nodes.set(node.id, node);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (!nodes.has(id)) throw new Error(`Unknown dependency: ${id}`);
    if (visiting.has(id)) throw new Error(`Dependency cycle: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of nodes.get(id).dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);
  // The asked objective is authoritative; the echo only had to agree with it.
  graph.objective = objective;
  return graph;
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function renderGraph(graph) {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const worked = graph.nodes.filter(node => node.outcomes?.length).length;
  const ready = graph.nodes.filter(node => !node.dependsOn.length && !node.outcomes?.length).length;
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escape(graph.objective)} — tag-two</title>
<style>
body{font:17px/1.6 system-ui,sans-serif;max-width:1000px;margin:auto;padding:2rem;color:#172b3a;background:#f4f7fa}
h1,h2,h3{line-height:1.25}a{color:#075aa5}article,header,details{background:white;border:1px solid #ccd6df;border-radius:10px;padding:1.4rem;margin:1rem 0;overflow-wrap:anywhere}
article{border-left:5px solid #b88719}article.ready{border-left-color:#25815c}article.worked{border-left-color:#5b4b8a}.status{font-weight:bold;color:#425261}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85rem}summary{cursor:pointer}li{margin:.4rem 0}
</style>
<header><p>tag-two · proposed graph · ${escape(graph.run.createdAt)}</p>
<h1>${escape(graph.objective)}</h1>
<p>${graph.nodes.length} tasks · ${ready} ready for human selection · ${graph.nodes.length - ready - worked} dependency-blocked · ${worked} worked</p>
<p>${worked ? 'Outcomes below were recorded by a human after work was done outside tag-two.' : 'No tasks have been executed.'} “Ready” means no graph dependencies, not approval or verified feasibility. A human chooses what happens next.</p></header>
<section aria-label="Research"><h2>What the agent learned</h2><p>${escape(graph.summary)}</p></section>
<nav aria-label="Task graph"><h2>Objective → proposed tasks</h2><ul>${graph.nodes.map(node =>
    `<li><a href="#${escape(node.id)}">${escape(node.title)}</a>${node.outcomes?.length ? ' · worked' : node.dependsOn.length ? ` ← depends on ${node.dependsOn.map(id => `<a href="#${escape(id)}">${escape(nodes.get(id).title)}</a>`).join(', ')}` : ' · ready'}</li>`).join('')}</ul></nav>
<main>${graph.nodes.map(node => `<article id="${escape(node.id)}" class="${node.outcomes?.length ? 'worked' : node.dependsOn.length ? 'blocked' : 'ready'}">
<p class="status">${node.outcomes?.length ? 'Worked — see recorded outcomes' : node.dependsOn.length ? 'Blocked by dependencies' : 'Ready for human selection'}</p>
<h2>${escape(node.title)}</h2><h3>Why this matters</h3><p>${escape(node.reason)}</p>
<h3>Evidence / context</h3><ul>${node.evidence.map(item => `<li>${escape(item)}</li>`).join('')}</ul>
${node.outcomes?.length ? `<h3>Recorded outcomes</h3><ul>${node.outcomes.map(item => `<li><strong>${escape(item.at)}</strong> — ${escape(item.outcome)}</li>`).join('')}</ul>` : ''}
<h3>Depends on</h3>${node.dependsOn.length ? `<ul>${node.dependsOn.map(id => `<li><a href="#${escape(id)}">${escape(nodes.get(id).title)}</a></li>`).join('')}</ul>` : '<p>Nothing in this graph.</p>'}
</article>`).join('')}</main>
<details><summary>Run details and repository investigation</summary>
<p>Model: ${escape(graph.run.model)} · API requests: ${graph.run.requests} · Reported cost: ${graph.run.costUsd === null ? 'unavailable' : `$${escape(graph.run.costUsd)}`}</p>
<p>Repository content is evidence, not instructions. Claims are model-generated and need human review. Tests were not executed by the planner.</p>
${graph.run.transcript ? `<p>This graph carries no transcript. The unedited run, including its full investigation, is preserved at ${escape(graph.run.transcript)}.</p>` : ''}
${graph.run.investigation.map(item => `<details><summary>${escape(item.tool)} ${escape(JSON.stringify(item.arguments))}</summary><pre>${escape(item.result)}</pre></details>`).join('')}
</details>
</html>`;
}
