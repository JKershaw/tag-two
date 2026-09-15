import { readFile, writeFile } from 'node:fs/promises';
import { validateGraph, renderGraph } from './graph.js';

// The smallest mechanism that lets a result of working a node reach the graph. The eighth
// dogfood run worked a node the graph itself proposed, refuted its hypothesis, and had
// nowhere to put that result: plan() writes graph.json once and nothing ever reads it back.
// This does not decide, schedule or execute anything. A human still chooses and does the work.
export async function record(graphPath, nodeId, outcome, { now = () => new Date().toISOString() } = {}) {
  if (!graphPath.endsWith('.json')) throw new Error('Point at a graph.json file.');
  if (typeof nodeId !== 'string' || !nodeId.trim()) throw new Error('A node id is required.');
  if (typeof outcome !== 'string' || !outcome.trim()) throw new Error('An outcome is required.');
  let graph;
  try {
    graph = JSON.parse(await readFile(graphPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read a graph from ${graphPath}: ${error.message}`);
  }
  validateGraph(graph, graph?.objective);
  if (!graph.run?.createdAt) throw new Error('That graph has no run provenance; it was not produced by tag plan.');
  const node = graph.nodes.find(item => item.id === nodeId);
  if (!node) {
    throw new Error(`No node "${nodeId}" in ${graphPath}. It has: ${graph.nodes.map(item => item.id).join(', ')}.`);
  }
  node.outcomes = [...(node.outcomes ?? []), { at: now(), outcome: outcome.trim() }];
  validateGraph(graph, graph.objective);
  await writeFile(graphPath, JSON.stringify(graph, null, 2) + '\n');
  const htmlPath = graphPath.slice(0, -'.json'.length) + '.html';
  await writeFile(htmlPath, renderGraph(graph));
  return { htmlPath, outcomes: node.outcomes.length };
}
