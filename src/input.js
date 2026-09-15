import { readFile, writeFile } from 'node:fs/promises';
import { validateGraph, renderGraph } from './graph.js';

// A human sentence — an objective correction, an observation, a priority, a question — had no
// durable home. The only ingest path was `record`, which demands a node id and stores what it is
// given as work already performed; one observation pushed through it left the graph reporting
// "0 ready · 3 worked" and handed the planner an unverified claim labelled as an established
// result. This stores what arrived, from whom, as what, and nothing else: it attaches to no node,
// marks nothing worked, decides nothing, runs nothing and calls no model.
export async function input(graphPath, from, kind, text, { now = () => new Date().toISOString() } = {}) {
  if (!graphPath.endsWith('.json')) throw new Error('Point at a graph.json file.');
  for (const [name, value] of [['source', from], ['kind', kind], ['text', text]]) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`A ${name} is required.`);
  }
  let graph;
  try {
    graph = JSON.parse(await readFile(graphPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read a graph from ${graphPath}: ${error.message}`);
  }
  validateGraph(graph, graph?.objective);
  graph.inputs = [...(graph.inputs ?? []), { at: now(), from: from.trim(), kind: kind.trim(), text: text.trim() }];
  validateGraph(graph, graph.objective);
  await writeFile(graphPath, JSON.stringify(graph, null, 2) + '\n');
  const htmlPath = graphPath.slice(0, -'.json'.length) + '.html';
  await writeFile(htmlPath, renderGraph(graph));
  return { htmlPath, inputs: graph.inputs.length };
}
