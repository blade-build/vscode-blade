import * as vscode from 'vscode';
import { BladeConfig, getConfig, jobsArgs } from './config';
import { BladeProfile } from './profile';
import { BladeTarget, isTestable, targetLabel } from './types';
import { TargetModel } from './targetModel';

export type BladeAction = 'build' | 'run' | 'test' | 'clean';

const TASK_TYPE = 'blade';

interface BladeTaskDefinition extends vscode.TaskDefinition {
  type: typeof TASK_TYPE;
  action: BladeAction;
  target?: string;
  profile?: BladeProfile;
}

function bladeArgsFor(
  action: BladeAction,
  label: string | undefined,
  cfg: BladeConfig,
  profile?: BladeProfile
): string[] {
  const target = label ? [label] : [];
  const p = profile ? ['-p', profile] : [];
  switch (action) {
    case 'build':
      return ['build', ...p, ...jobsArgs(cfg), ...cfg.buildArgs, ...target];
    case 'test':
      return ['test', ...p, ...jobsArgs(cfg), ...cfg.testArgs, ...target];
    case 'run':
      return ['run', ...p, ...cfg.runArgs, ...target];
    case 'clean':
      return ['clean']; // profile-independent
  }
}

function shellExecution(root: string, cfg: BladeConfig, args: string[]): vscode.ShellExecution {
  const quoted: vscode.ShellQuotedString[] = args.map((value) => ({
    value,
    quoting: vscode.ShellQuoting.Strong
  }));
  // commandPrefix + executable form the command; remaining tokens are args.
  const command = cfg.commandPrefix[0] ?? cfg.executable;
  const head = cfg.commandPrefix.length > 0 ? [...cfg.commandPrefix.slice(1), cfg.executable] : [];
  const headQuoted: vscode.ShellQuotedString[] = head.map((value) => ({
    value,
    quoting: vscode.ShellQuoting.Strong
  }));
  return new vscode.ShellExecution(command, [...headQuoted, ...quoted], {
    cwd: root,
    env: cfg.environment
  });
}

/**
 * Build a vscode.Task for an action, optionally scoped. The scope is either a
 * single `BladeTarget` or a raw label such as a recursive package pattern
 * (`//common/...`); when omitted the action applies workspace-wide.
 */
export function createBladeTask(
  root: string,
  action: BladeAction,
  scope?: BladeTarget | string,
  profile?: BladeProfile
): vscode.Task {
  const cfg = getConfig(vscode.Uri.file(root));
  const label = typeof scope === 'string' ? scope : scope ? targetLabel(scope) : undefined;
  const args = bladeArgsFor(action, label, cfg, profile);
  const definition: BladeTaskDefinition = { type: TASK_TYPE, action, target: label, profile };
  const name = label ? `${action} ${label}` : action;
  const task = new vscode.Task(
    definition,
    vscode.TaskScope.Workspace,
    name,
    'blade',
    shellExecution(root, cfg, args),
    action === 'build' || action === 'run' ? ['$gcc'] : []
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    // Shared: every blade task reuses one terminal (cleared on each run) rather
    // than spawning a new one, so the idle "press any key to close" terminal is
    // reused instead of piling up — and its output stays visible for inspection.
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
    focus: action === 'run'
  };
  task.group =
    action === 'build'
      ? vscode.TaskGroup.Build
      : action === 'test'
        ? vscode.TaskGroup.Test
        : action === 'clean'
          ? vscode.TaskGroup.Clean
          : undefined;
  return task;
}

/** Execute a task and resolve with its exit code (undefined if it never ran). */
export function executeBladeTask(task: vscode.Task): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    vscode.tasks.executeTask(task).then((execution) => {
      const sub = vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution === execution) {
          sub.dispose();
          resolve(e.exitCode);
        }
      });
    }, reject);
  });
}

/**
 * Provides blade tasks (build for every target, test for testables) so they
 * also show up under "Run Task". Per-target actions are additionally available
 * from the tree view and status bar.
 */
export class BladeTaskProvider implements vscode.TaskProvider {
  constructor(
    private readonly model: TargetModel,
    private readonly profile: () => BladeProfile
  ) {}

  provideTasks(): vscode.Task[] {
    const root = this.model.root;
    if (!root) {
      return [];
    }
    const p = this.profile();
    const tasks: vscode.Task[] = [createBladeTask(root, 'clean')];
    for (const target of this.model.targets) {
      tasks.push(createBladeTask(root, 'build', target, p));
      if (isTestable(target)) {
        tasks.push(createBladeTask(root, 'test', target, p));
      }
    }
    return tasks;
  }

  resolveTask(task: vscode.Task): vscode.Task | undefined {
    const def = task.definition as BladeTaskDefinition;
    const root = this.model.root;
    if (!root || def.type !== TASK_TYPE) {
      return undefined;
    }
    const target = def.target ? this.model.find(def.target.replace(/^\/\//, '')) : undefined;
    return createBladeTask(root, def.action, target, def.profile ?? this.profile());
  }
}
