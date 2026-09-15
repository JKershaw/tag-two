import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateGraph, renderGraph } from './graph.js';

// The loop did not close. Runs 12, 13 and 14 each produced a graph; none of them reached the
// durable one, which stayed frozen at the seventh run's output plus two hand-written outcomes.
// Adopting is one file-level operation, not a mutation protocol: the new graph replaces the old
// one wholesale and every recorded outcome is carried across, because an outcome is evidence
// about work that really happened and node ids do not survive replanning.
export async function adopt(fromPath, ontoPath) {
  const read = async path => {
    let graph;
    try {
      graph = JSON.parse(await readFile(resolve(path), 'utf8'));
    } catch (error) {
      throw new Error(`Could not read a graph from ${path}: ${error.message}`);
    }
    return validateGraph(graph, graph?.objective);
  };
  if (!ontoPath.endsWith('.json')) throw new Error('Point at a graph.json file.');
  const replacement = await read(fromPath);
  const durable = await read(ontoPath).catch(error => {
    if (error.message.includes('ENOENT')) return null;
    throw error;
  });
  if (durable && durable.objective !== replacement.objective) {
    throw new Error(`That graph answers a different objective:\n  durable: ${durable.objective}\n  new:     ${replacement.objective}`);
  }
  const carried = durable?.outcomes ?? [];
  // Input is carried for the same reason outcomes are: it arrived from outside the graph and is
  // not about any one node, so replanning must not throw it away.
  const inputs = durable?.inputs ?? [];
  // The transcript stays with the archived run. Adopting the fourteenth run's graph whole put the
  // durable graph at 44 KB, past the planner's own 40,000-byte read limit, so the file recording
  // what the system believes would have been unreadable by it — the README's failure, mechanised.
  const adopted = {
    ...replacement,
    run: { ...replacement.run, investigation: [], transcript: fromPath },
    outcomes: carried.length ? carried : undefined,
    inputs: inputs.length ? inputs : undefined,
  };
  if (adopted.outcomes === undefined) delete adopted.outcomes;
  if (adopted.inputs === undefined) delete adopted.inputs;
  validateGraph(adopted, adopted.objective);
  await writeFile(resolve(ontoPath), JSON.stringify(adopted, null, 2) + '\n');
  const htmlPath = ontoPath.slice(0, -'.json'.length) + '.html';
  await writeFile(resolve(htmlPath), renderGraph(adopted));
  const retired = carried.filter(item => !adopted.nodes.some(node => node.id === item.node)).length;
  return { htmlPath, nodes: adopted.nodes.length, carried: carried.length, retired, inputs: inputs.length };
}
