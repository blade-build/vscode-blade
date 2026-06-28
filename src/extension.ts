import * as path from 'path';
import * as vscode from 'vscode';
import { ActiveTarget } from './activeTarget';
import { getConfig } from './config';
import { runGenerateCompdb } from './compdb';
import { debugTarget } from './debug';
import { registerLanguageProviders } from './language/providers';
import { DepDiagnostics } from './language/diagnostics';
import { locateTarget } from './language/resolve';
import { ProfileState, BladeProfile } from './profile';
import { StatusBar } from './statusBar';
import { BladeTaskProvider, BladeAction, createBladeTask, executeBladeTask } from './tasks';
import { TargetModel } from './targetModel';
import { BladeTreeProvider } from './tree';
import { BladeTarget, isTestable, targetLabel } from './types';

// Tree nodes pass `{ kind: 'target', target }`; commands may also receive a bare
// target. Normalize both to a BladeTarget.
function asTarget(arg: unknown): BladeTarget | undefined {
  if (arg && typeof arg === 'object') {
    const obj = arg as { kind?: string; target?: BladeTarget; type?: string; name?: string };
    if (obj.kind === 'target' && obj.target) {
      return obj.target;
    }
    if (typeof obj.type === 'string' && typeof obj.name === 'string') {
      return arg as BladeTarget;
    }
  }
  return undefined;
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Blade');
  context.subscriptions.push(output);

  const model = new TargetModel(output);
  const profile = new ProfileState(context);
  const active = new ActiveTarget(context, model);
  const statusBar = new StatusBar(active);
  const tree = new BladeTreeProvider(model, active, context.workspaceState);
  const diagnostics = new DepDiagnostics(model);
  context.subscriptions.push(model, profile, active, statusBar, diagnostics);

  const treeView = vscode.window.createTreeView('bladeTargets', { treeDataProvider: tree });
  context.subscriptions.push(
    treeView,
    treeView.onDidExpandElement((e) => tree.setExpanded(e.element, true)),
    treeView.onDidCollapseElement((e) => tree.setExpanded(e.element, false))
  );

  // Drives which `viewsWelcome` message shows. Starts as `loading` so the first
  // async refresh doesn't briefly flash "no workspace"; settles once data lands.
  const setViewState = (s: string) =>
    void vscode.commands.executeCommand('setContext', 'blade.viewState', s);
  setViewState('loading');
  model.onDidChange((state) => {
    setViewState(
      state.error ? 'error' : !state.root ? 'noWorkspace' : state.targets.length === 0 ? 'empty' : 'ready'
    );
  });

  context.subscriptions.push(
    vscode.tasks.registerTaskProvider('blade', new BladeTaskProvider(model, () => profile.value))
  );

  registerLanguageProviders(context, model);

  model.watch();

  // --- helpers -------------------------------------------------------------

  async function requireRoot(): Promise<string | undefined> {
    if (model.root) {
      return model.root;
    }
    await model.refresh();
    if (!model.root) {
      if (model.error) {
        void vscode.window
          .showErrorMessage(`Blade failed to run: ${model.error}`, 'Open Settings')
          .then((pick) => {
            if (pick === 'Open Settings') {
              void vscode.commands.executeCommand('workbench.action.openSettings', 'blade.executable');
            }
          });
      } else {
        void vscode.window
          .showErrorMessage('No Blade workspace detected (no BLADE_ROOT found).', 'Refresh')
          .then((pick) => {
            if (pick === 'Refresh') {
              void vscode.commands.executeCommand('blade.refreshTargets');
            }
          });
      }
    }
    return model.root;
  }

  async function pickTarget(): Promise<BladeTarget | undefined> {
    const items = model.targets
      .slice()
      .sort((a, b) => targetLabel(a).localeCompare(targetLabel(b)))
      .map((t) => ({ label: t.name, description: t.type, detail: targetLabel(t), target: t }));
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a Blade target',
      matchOnDescription: true,
      matchOnDetail: true
    });
    return picked?.target;
  }

  async function resolveActionTarget(arg: unknown): Promise<BladeTarget | undefined> {
    const fromArg = asTarget(arg);
    if (fromArg) {
      return fromArg;
    }
    const current = active.get();
    if (current) {
      return current;
    }
    const picked = await pickTarget();
    if (picked) {
      await active.set(picked);
    }
    return picked;
  }

  async function runAction(action: BladeAction, scope?: BladeTarget | string): Promise<void> {
    const root = await requireRoot();
    if (!root) {
      return;
    }
    await executeBladeTask(createBladeTask(root, action, scope, profile.value));
  }

  // Tree dir nodes pass `{ kind: 'dir', path }`; build/test them recursively
  // via the `//path/...` package pattern.
  function asDirScope(arg: unknown): string | undefined {
    if (arg && typeof arg === 'object') {
      const obj = arg as { kind?: string; path?: string };
      if (obj.kind === 'dir' && typeof obj.path === 'string') {
        return obj.path === '' ? '//...' : `//${obj.path}/...`;
      }
    }
    return undefined;
  }

  function asDirPath(arg: unknown): string | undefined {
    if (arg && typeof arg === 'object') {
      const obj = arg as { kind?: string; path?: string };
      if (obj.kind === 'dir' && typeof obj.path === 'string') {
        return obj.path;
      }
    }
    return undefined;
  }

  // Open a target's BUILD file and select its `name = '...'` declaration.
  async function revealTargetInBuild(t: BladeTarget): Promise<void> {
    const root = model.root;
    if (!root) {
      return;
    }
    const loc = await locateTarget(root, { pkg: t.path, name: t.name, key: `${t.path}:${t.name}` });
    if (loc) {
      const doc = await vscode.workspace.openTextDocument(loc.uri);
      const editor = await vscode.window.showTextDocument(doc);
      editor.selection = new vscode.Selection(loc.range.start, loc.range.end);
      editor.revealRange(loc.range, vscode.TextEditorRevealType.InCenter);
    }
  }

  // --- commands ------------------------------------------------------------

  context.subscriptions.push(
    vscode.commands.registerCommand('blade.refreshTargets', async () => {
      await vscode.window.withProgress(
        { location: { viewId: 'bladeTargets' }, title: 'Refreshing Blade targets' },
        () => model.refresh()
      );
      if (model.root && getConfig(vscode.Uri.file(model.root)).generateCompdbOnRefresh) {
        await runGenerateCompdb(model.root).catch((e) =>
          output.appendLine(`[blade] compdb generation failed: ${e}`)
        );
      }
    }),

    vscode.commands.registerCommand('blade.selectTarget', async () => {
      if (model.targets.length === 0) {
        await model.refresh();
      }
      const picked = await pickTarget();
      if (picked) {
        await active.set(picked);
      }
    }),

    // Clicking a target in the tree selects it as active and opens its
    // declaration in the BUILD file.
    vscode.commands.registerCommand('blade.selectTargetItem', async (t: BladeTarget) => {
      await active.set(t);
      await revealTargetInBuild(t);
    }),

    // One handler, three command ids: a stable palette entry plus a per-profile
    // pair so the view-title button can display the current value (a command's
    // title can't change at runtime, so we toggle which command is shown).
    ...(['blade.selectProfile', 'blade.selectProfileRelease', 'blade.selectProfileDebug'].map(
      (id) =>
        vscode.commands.registerCommand(id, async () => {
          const items: (vscode.QuickPickItem & { value: BladeProfile })[] = (
            ['release', 'debug'] as BladeProfile[]
          ).map((value) => ({
            label: value,
            value,
            description: value === profile.value ? '$(check) current' : undefined
          }));
          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select Blade build profile'
          });
          if (picked) {
            await profile.set(picked.value);
          }
        })
    ) as vscode.Disposable[]),

    vscode.commands.registerCommand('blade.build', () => runAction('build', active.get())),
    vscode.commands.registerCommand('blade.run', () => runAction('run', active.get())),
    vscode.commands.registerCommand('blade.test', () => runAction('test', active.get())),
    vscode.commands.registerCommand('blade.clean', () => runAction('clean')),

    vscode.commands.registerCommand('blade.buildTarget', async (arg) => {
      const t = await resolveActionTarget(arg);
      if (t) {
        await runAction('build', t);
      }
    }),
    vscode.commands.registerCommand('blade.runTarget', async (arg) => {
      const t = await resolveActionTarget(arg);
      if (t) {
        await runAction('run', t);
      }
    }),
    vscode.commands.registerCommand('blade.testTarget', async (arg) => {
      const t = await resolveActionTarget(arg);
      if (t && isTestable(t)) {
        await runAction('test', t);
      }
    }),
    vscode.commands.registerCommand('blade.buildPackage', async (arg) => {
      const scope = asDirScope(arg);
      if (scope) {
        await runAction('build', scope);
      }
    }),
    vscode.commands.registerCommand('blade.testPackage', async (arg) => {
      const scope = asDirScope(arg);
      if (scope) {
        await runAction('test', scope);
      }
    }),
    vscode.commands.registerCommand('blade.debugTarget', async (arg) => {
      const root = await requireRoot();
      const t = await resolveActionTarget(arg);
      if (root && t) {
        await debugTarget(root, t, profile.value);
      }
    }),

    // Right-click a directory to open its BUILD file.
    vscode.commands.registerCommand('blade.revealBuildFile', async (arg) => {
      const root = model.root;
      const dir = asDirPath(arg);
      if (!root || dir === undefined) {
        return;
      }
      const uri = vscode.Uri.file(path.join(root, dir, 'BUILD'));
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      } catch {
        void vscode.window.showErrorMessage(`No BUILD file at //${dir}.`);
      }
    }),

    vscode.commands.registerCommand('blade.generateCompdb', async () => {
      const root = await requireRoot();
      if (root) {
        await runGenerateCompdb(root);
      }
    })
  );

  // Initial load.
  void model.refresh();
}

export function deactivate(): void {
  // Disposables are cleaned up via context.subscriptions.
}
