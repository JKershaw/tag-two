import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { open, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

const exec = promisify(execFile);
const parameters = properties => ({ type: 'object', properties, additionalProperties: false });
const string = description => ({ type: 'string', description });
const integer = description => ({ type: 'integer', description });

export const tools = [
  ['list_files', 'List tracked repository files. Paginate with offset.', {
    offset: integer('Zero-based file offset; default 0'),
  }],
  ['read_file', 'Read a tracked text file with line numbers. Paginate with startLine.', {
    path: string('Exact repository-relative path'),
    startLine: integer('First line, starting at 1; default 1'),
  }],
  ['search', 'Search tracked text files for literal text; returns matching paths and lines.', {
    text: string('Nonempty literal search text'),
  }],
  ['history', 'Inspect the last ten commit subjects, optionally for one tracked file.', {
    path: string('Optional exact repository-relative path'),
  }],
].map(([name, description, properties]) => ({
  type: 'function', function: { name, description, parameters: parameters(properties) },
}));

function allowed(path) {
  return !path.split('/').some(part =>
    /^(?:\.git|\.tag|\.env(?:\..*)?|\.ssh|\.aws|\.npmrc|\.netrc|secrets?(?:\..*)?|credentials?(?:\..*)?|id_rsa|id_ed25519)$/i.test(part))
    && !/\.(?:pem|key|p12|pfx)$/i.test(path)
    && !path.startsWith('.github/agents/');
}

export async function repositoryTools(directory) {
  const root = await realpath(directory);
  const git = async args => (await exec('git', [
    '--no-pager', '-c', 'core.fsmonitor=false', '-c', 'log.showSignature=false', '-C', root, ...args,
  ], { maxBuffer: 2 * 1024 * 1024, timeout: 10_000 })).stdout;
  if ((await git(['rev-parse', '--show-toplevel'])).trim() !== root) {
    throw new Error('Choose the repository root directory.');
  }
  const files = [...new Set((await git(['ls-files', '-z'])).split('\0').filter(path => path && allowed(path)))].sort();
  const known = new Set(files);
  async function textFile(path) {
    if (!known.has(path)) throw new Error('Choose a listed tracked file.');
    const absolute = resolve(root, path);
    if (await realpath(absolute) !== absolute) throw new Error('Symlinks are not readable.');
    const handle = await open(absolute, 'r');
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 256 * 1024) throw new Error('Only text files up to 256 KiB are readable.');
      const text = await handle.readFile('utf8');
      if (text.includes('\0')) throw new Error('Binary files are not readable.');
      return text.split('\n');
    } finally {
      await handle.close();
    }
  }
  return async function investigate(name, args) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Expected an argument object.');
    switch (name) {
      case 'list_files': {
        const offset = args.offset ?? 0;
        if (!Number.isInteger(offset) || offset < 0) throw new Error('Invalid offset.');
        return JSON.stringify({ files: files.slice(offset, offset + 100), total: files.length, nextOffset: offset + 100 < files.length ? offset + 100 : null });
      }
      case 'read_file': {
        const start = args.startLine ?? 1;
        if (!Number.isInteger(start) || start < 1) throw new Error('Invalid startLine.');
        const lines = await textFile(args.path);
        return lines.slice(start - 1, start + 199).map((line, index) => `${start + index}: ${line}`).join('\n')
          .slice(0, 20_000) + `\n[${lines.length} total lines; at most 200 lines / 20000 characters per read]`;
      }
      case 'search': {
        if (typeof args.text !== 'string' || !args.text.trim()) throw new Error('Expected nonempty search text.');
        const matches = [];
        for (const path of files) {
          let lines;
          try { lines = await textFile(path); } catch { continue; }
          for (const [index, line] of lines.entries()) {
            if (line.toLowerCase().includes(args.text.toLowerCase())) {
              matches.push(`${path}:${index + 1}: ${line.slice(0, 300)}`);
              if (matches.length === 50) return matches.join('\n') + '\n[Stopped at 50 matches]';
            }
          }
        }
        return matches.join('\n') || 'No matches in readable tracked files.';
      }
      case 'history':
        if (args.path !== undefined && !known.has(args.path)) throw new Error('Choose a listed tracked file.');
        return (await git(['log', '-10', '--format=%h %s', '--', ...(args.path ? [args.path] : [])])).slice(0, 20_000);
      default:
        throw new Error(`Unknown repository tool: ${name}`);
    }
  };
}
