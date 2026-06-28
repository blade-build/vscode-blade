import * as vscode from 'vscode';
import { ActiveTarget } from './activeTarget';
import { getConfig } from './config';
import { runGenerateCompdb } from './compdb';
import { debugTarget } from './debug';
import { registerLanguageProviders } from './language/providers';
import { DepDiagnostics } from './language/diagnostics';
import { locateTarget } from './language/resolve';
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
  const active = new ActiveTarget(context, model);
  const statusBar = new StatusBar(active);
  const tree = new BladeTreeProvider(model, active);
  const diagnostics = new DepDiagnostics(model);
  context.subscriptions.push(model, active, statusBar, diagnostics);

  const treeView = vscode.window.createTreeView('bladeTargets', { treeDataProvider: tree });
  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.tasks.registerTaskProvider('blade', new BladeTaskProvider(model))
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
      void vscode.window.showErrorMessage('No Blade workspace found (no BLADE_ROOT).');
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

  async function runAction(action: BladeAction, target?: BladeTarget): Promise<void> {
    const root = await requireRoot();
    if (!root) {
      return;
    }
    await executeBladeTask(createBladeTask(root, action, target));
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

    vscode.commands.registerCommand('blade.selectTargetItem', (t: BladeTarget) => active.set(t)),

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
    vscode.commands.registerCommand('blade.debugTarget', async (arg) => {
      const root = await requireRoot();
      const t = await resolveActionTarget(arg);
      if (root && t) {
        await debugTarget(root, t);
      }
    }),

    vscode.commands.registerCommand('blade.revealTarget', async (arg) => {
      const root = model.root;
      const t = asTarget(arg);
      if (!root || !t) {
        return;
      }
      const loc = await locateTarget(root, { pkg: t.path, name: t.name, key: `${t.path}:${t.name}` });
      if (loc) {
        const doc = await vscode.workspace.openTextDocument(loc.uri);
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(loc.range.start, loc.range.end);
        editor.revealRange(loc.range, vscode.TextEditorRevealType.InCenter);
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
