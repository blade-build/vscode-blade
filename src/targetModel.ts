import * as vscode from 'vscode';
import { dumpTargets } from './blade';
import { getConfig } from './config';
import { findBladeRoots, rootForPath } from './workspace';
import { BladeTarget, isExternalLibrary, qualifiedKey, targetKey } from './types';

export interface TargetModelState {
  roots: string[];
  targets: BladeTarget[];
  error?: string;
  /** Per-root `blade dump` failure messages, keyed by absolute root. */
  rootErrors: Map<string, string>;
}

/**
 * Owns the workspace's target list. The single source of truth for the tree
 * view, status bar, quick pick, and BUILD-file language features. Refreshed
 * explicitly (command) or automatically when a BUILD/BLADE_ROOT file changes.
 */
export class TargetModel implements vscode.Disposable {
  private state: TargetModelState = { roots: [], targets: [], rootErrors: new Map() };
  private byKey = new Map<string, BladeTarget>();
  private byPath = new Map<string, BladeTarget[]>();
  private watcher?: vscode.FileSystemWatcher;
  private debounce?: NodeJS.Timeout;
  private refreshing = false;

  private readonly _onDidChange = new vscode.EventEmitter<TargetModelState>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly output: vscode.OutputChannel) {}

  /** All discovered BLADE_ROOT directories (absolute paths). */
  get roots(): readonly string[] {
    return this.state.roots;
  }

  get targets(): readonly BladeTarget[] {
    return this.state.targets;
  }

  get error(): string | undefined {
    return this.state.error;
  }

  /** The `blade dump` failure for a specific root, if it failed to load. */
  rootError(root: string): string | undefined {
    return this.state.rootErrors.get(root);
  }

  /** The BLADE_ROOT owning a file path, for per-document language features. */
  rootFor(fsPath: string): string | undefined {
    return rootForPath(this.state.roots, fsPath);
  }

  /** Look up a target by its root and `path:name` key. */
  find(root: string, key: string): BladeTarget | undefined {
    return this.byKey.get(qualifiedKey(root, key));
  }

  /** Look up a target by its already-qualified key (root + `path:name`). */
  findQualified(qkey: string): BladeTarget | undefined {
    return this.byKey.get(qkey);
  }

  /** All targets declared in a package directory of a given root. */
  inPackage(root: string, pkgPath: string): BladeTarget[] {
    return this.byPath.get(qualifiedKey(root, pkgPath)) ?? [];
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
      const roots = await findBladeRoots();
      if (roots.length === 0) {
        this.apply({ roots: [], targets: [], error: undefined, rootErrors: new Map() });
        return;
      }
      // Dump each workspace independently; one failing root must not blank the
      // others. Targets are tagged with their root so the rest of the
      // extension can route tasks/navigation back to the right `cwd`. Per-root
      // failures are kept so the tree can show *which* root failed rather than
      // silently dropping it.
      const targets: BladeTarget[] = [];
      const rootErrors = new Map<string, string>();
      for (const root of roots) {
        try {
          const cfg = getConfig(vscode.Uri.file(root));
          this.output.appendLine(`[blade] dumping targets from ${root} ...`);
          const dumped = await dumpTargets(root, cfg, '//...', token);
          for (const t of dumped) {
            if (!isExternalLibrary(t)) {
              t.root = root;
              targets.push(t);
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.output.appendLine(`[blade] dump failed for ${root}: ${msg}`);
          rootErrors.set(root, msg);
        }
      }
      this.output.appendLine(`[blade] loaded ${targets.length} targets from ${roots.length} root(s)`);
      // Surface a blocking error only when nothing loaded at all; partial
      // success keeps the working roots visible (failed ones show inline).
      const error =
        targets.length === 0 && rootErrors.size > 0
          ? [...rootErrors].map(([r, m]) => `${r}: ${m}`).join('\n')
          : undefined;
      this.apply({ roots, targets, error, rootErrors });
    } finally {
      this.refreshing = false;
    }
  }

  private apply(state: TargetModelState): void {
    this.state = state;
    this.byKey.clear();
    this.byPath.clear();
    for (const t of state.targets) {
      const root = t.root ?? '';
      this.byKey.set(qualifiedKey(root, targetKey(t)), t);
      const pkgKey = qualifiedKey(root, t.path);
      const list = this.byPath.get(pkgKey);
      if (list) {
        list.push(t);
      } else {
        this.byPath.set(pkgKey, [t]);
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
