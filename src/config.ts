import * as vscode from 'vscode';

export interface BladeConfig {
  executable: string;
  jobs: number;
  commandPrefix: string[];
  buildArgs: string[];
  testArgs: string[];
  runArgs: string[];
  environment: Record<string, string>;
  generateCompdbOnRefresh: boolean;
  recommendClangd: boolean;
}

export function getConfig(scope?: vscode.Uri): BladeConfig {
  const c = vscode.workspace.getConfiguration('blade', scope ?? null);
  return {
    executable: c.get<string>('executable', 'blade'),
    jobs: c.get<number>('jobs', 0),
    commandPrefix: c.get<string[]>('commandPrefix', []),
    buildArgs: c.get<string[]>('buildArgs', []),
    testArgs: c.get<string[]>('testArgs', []),
    runArgs: c.get<string[]>('runArgs', []),
    environment: c.get<Record<string, string>>('environment', {}),
    generateCompdbOnRefresh: c.get<boolean>('generateCompdbOnRefresh', true),
    recommendClangd: c.get<boolean>('recommendClangd', true)
  };
}

/**
 * Build the full argv for a blade invocation, honoring `commandPrefix` and
 * `executable`. Returns an array suitable for both child_process (argv) and,
 * after shell-quoting, a ShellExecution command line.
 */
export function bladeArgv(cfg: BladeConfig, args: string[]): string[] {
  return [...cfg.commandPrefix, cfg.executable, ...args];
}

/** Append the `-j N` flag when a non-zero job count is configured. */
export function jobsArgs(cfg: BladeConfig): string[] {
  return cfg.jobs > 0 ? ['-j', String(cfg.jobs)] : [];
}
