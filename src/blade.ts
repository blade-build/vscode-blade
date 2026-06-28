import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BladeConfig, bladeArgv } from './config';
import { BladeTarget } from './types';

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run a blade subcommand, capturing output. Never rejects on non-zero exit. */
export function execBlade(
  root: string,
  cfg: BladeConfig,
  args: string[],
  token?: { isCancellationRequested: boolean; onCancellationRequested(cb: () => void): void }
): Promise<ExecResult> {
  const argv = bladeArgv(cfg, args);
  return new Promise((resolve, reject) => {
    let child: cp.ChildProcess;
    try {
      child = cp.spawn(argv[0], argv.slice(1), {
        cwd: root,
        env: { ...process.env, ...cfg.environment },
        shell: false
      });
    } catch (e) {
      reject(e);
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => reject(e));
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
    token?.onCancellationRequested(() => child.kill());
  });
}

/**
 * Dump all targets in the workspace as structured JSON.
 *
 * Uses `--to-file <tmp>` rather than the default `/dev/stdout` so it works on
 * Windows too, then reads and parses the file.
 */
export async function dumpTargets(
  root: string,
  cfg: BladeConfig,
  scope = '//...',
  token?: { isCancellationRequested: boolean; onCancellationRequested(cb: () => void): void }
): Promise<BladeTarget[]> {
  const tmp = path.join(os.tmpdir(), `blade-targets-${process.pid}-${Date.now()}.json`);
  try {
    const res = await execBlade(root, cfg, ['dump', '--targets', '--to-file', tmp, scope], token);
    if (!fs.existsSync(tmp)) {
      throw new Error(
        `blade dump --targets produced no output (exit ${res.code}).\n${res.stderr.trim()}`
      );
    }
    const raw = fs.readFileSync(tmp, 'utf-8');
    const parsed = JSON.parse(raw) as BladeTarget[];
    return Array.isArray(parsed) ? parsed : [];
  } finally {
    fs.promises.rm(tmp, { force: true }).catch(() => undefined);
  }
}

/** Generate a compilation database at `<root>/compile_commands.json`. */
export async function generateCompdb(
  root: string,
  cfg: BladeConfig,
  token?: { isCancellationRequested: boolean; onCancellationRequested(cb: () => void): void }
): Promise<ExecResult> {
  return execBlade(
    root,
    cfg,
    ['dump', '--compdb', '--to-file', 'compile_commands.json'],
    token
  );
}
