import * as vscode from 'vscode';
import { dumpTargets } from './blade';
import { getConfig } from './config';
import { findPrimaryBladeRoot } from './workspace';
import { BladeTarget, targetKey } from './types';

export interface TargetModelState {
  root?: string;
  targets: BladeTarget[];
  error?: string;
}

/**
 * Owns the workspace's target list. The single source of truth for the tree
 * view, status bar, quick pick, and BUILD-file language features. Refreshed
 * explicitly (command) or automatically when a BUILD/BLADE_ROOT file changes.
 */
export class TargetModel implements vscode.Disposable {
  private state: TargetModelState = { targets: [] };
  private byKey = new Map<string, BladeTarget>();
  private byPath = new Map<string, BladeTarget[]>();
  private watcher?: vscode.FileSystemWatcher;
  private debounce?: NodeJS.Timeout;
  private refreshing = false;

  private readonly _onDidChange = new vscode.EventEmitter<TargetModelState>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly output: vscode.OutputChannel) {}

  get root(): string | undefined {
    return this.state.root;
  }

  get targets(): readonly BladeTarget[] {
    return this.state.targets;
  }

  get error(): string | undefined {
    return this.state.error;
  }

  /** Look up a target by its `path:name` key. */
  find(key: string): BladeTarget | undefined {
    return this.byKey.get(key);
  }

  /** All targets declared in a package directory. */
  inPackage(pkgPath: string): BladeTarget[] {
    return this.byPath.get(pkgPath) ?? [];
  }

  /** Set up file watching; call once after construction. */
  watch(): void {
    this.watcher = vscode.workspace.createFileSystemWatcher('**/{BUILD,BLADE_ROOT}');
    const onChange = () => this.scheduleRefresh();
    this.watcher.onDidCreate(onChange);
    this.watcher.onDidChange(onChange);
    this.watcher.onDidDelete(onChange);
  }

  private scheduleRefresh(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => void this.refresh(), 500);
  }

  async refresh(token?: vscode.CancellationToken): Promise<void> {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    try {
      const root = await findPrimaryBladeRoot();
      if (!root) {
        this.apply({ targets: [], error: undefined });
        return;
      }
      const cfg = getConfig(vscode.Uri.file(root));
      this.output.appendLine(`[blade] dumping targets from ${root} ...`);
      const targets = await dumpTargets(root, cfg, '//...', token);
      this.output.appendLine(`[blade] loaded ${targets.length} targets`);
      this.apply({ root, targets, error: undefined });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.output.appendLine(`[blade] target refresh failed: ${msg}`);
      this.apply({ root: this.state.root, targets: [], error: msg });
    } finally {
      this.refreshing = false;
    }
  }

  private apply(state: TargetModelState): void {
    this.state = state;
    this.byKey.clear();
    this.byPath.clear();
    for (const t of state.targets) {
      this.byKey.set(targetKey(t), t);
      const list = this.byPath.get(t.path);
      if (list) {
        list.push(t);
      } else {
        this.byPath.set(t.path, [t]);
      }
    }
    this._onDidChange.fire(state);
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onDidChange.dispose();
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
  }
}
