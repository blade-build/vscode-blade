import * as vscode from 'vscode';
import { TargetModel } from './targetModel';
import { ActiveTarget } from './activeTarget';
import { BladeTarget, isDebuggable, isRunnable, isTestable, targetKey, targetLabel } from './types';

type Node =
  | { kind: 'dir'; path: string }
  | { kind: 'target'; target: BladeTarget };

/**
 * Immediate sub-directory paths of `parent` implied by the package paths in
 * `paths`, sorted. A package living directly in `parent` is not a
 * sub-directory; deeper packages contribute only their first segment (so
 * intermediate directories without a BUILD file still appear). Pure — exported
 * for testing.
 */
export function subdirectories(paths: readonly string[], parent: string): string[] {
  const prefix = parent === '' ? '' : `${parent}/`;
  const segments = new Set<string>();
  for (const p of paths) {
    if (parent !== '' && !p.startsWith(prefix)) {
      continue;
    }
    const rest = p.slice(prefix.length);
    if (rest === '') {
      continue;
    }
    segments.add(rest.split('/')[0]);
  }
  return [...segments].sort((a, b) => a.localeCompare(b)).map((seg) => prefix + seg);
}

/** The recursive blade scope (`//...` or `//path/...`) for a directory path. */
export function dirScope(path: string): string {
  return path === '' ? '//...' : `//${path}/...`;
}

function iconFor(t: BladeTarget): vscode.ThemeIcon {
  if (isTestable(t)) {
    return new vscode.ThemeIcon('beaker');
  }
  if (isRunnable(t)) {
    return new vscode.ThemeIcon('run');
  }
  if (t.type === 'proto_library') {
    return new vscode.ThemeIcon('symbol-structure');
  }
  return new vscode.ThemeIcon('library');
}

function contextValue(t: BladeTarget): string {
  const tags = ['target'];
  if (isRunnable(t)) {
    tags.push('runnable');
  }
  if (isTestable(t)) {
    tags.push('testable');
  }
  if (isDebuggable(t)) {
    tags.push('debuggable');
  }
  return tags.join('.');
}

const COLLAPSED_KEY = 'blade.collapsedDirs';

export class BladeTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  // Directory paths the user has collapsed, persisted across sessions. Absence
  // means expanded (the default), so a fresh workspace starts fully open.
  private readonly collapsed: Set<string>;

  constructor(
    private readonly model: TargetModel,
    private readonly active: ActiveTarget,
    private readonly storage: vscode.Memento
  ) {
    this.collapsed = new Set(storage.get<string[]>(COLLAPSED_KEY, []));
    model.onDidChange(() => this._onDidChange.fire());
    active.onDidChange(() => this._onDidChange.fire());
  }

  /** Record a dir's expand/collapse state; wired to the TreeView events. */
  setExpanded(node: Node, expanded: boolean): void {
    if (node.kind !== 'dir') {
      return;
    }
    const changed = expanded ? this.collapsed.delete(node.path) : !this.collapsed.has(node.path);
    if (!expanded) {
      this.collapsed.add(node.path);
    }
    if (changed) {
      void this.storage.update(COLLAPSED_KEY, [...this.collapsed]);
    }
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'dir') {
      const segment = node.path.split('/').pop() ?? node.path;
      const item = new vscode.TreeItem(
        node.path === '' ? '//' : segment,
        this.collapsed.has(node.path)
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.Expanded
      );
      item.tooltip = `//${node.path}`;
      item.iconPath = new vscode.ThemeIcon('folder');
      // A directory that itself declares targets is a package; intermediate
      // directories only group sub-packages.
      item.contextValue = this.model.inPackage(node.path).length > 0 ? 'package' : 'dir';
      return item;
    }
    const t = node.target;
    const item = new vscode.TreeItem(t.name, vscode.TreeItemCollapsibleState.None);
    item.description = t.type;
    item.tooltip = `${targetLabel(t)}\n${t.type}`;
    item.iconPath = iconFor(t);
    item.contextValue = contextValue(t);
    item.command = {
      command: 'blade.selectTargetItem',
      title: 'Select Target',
      arguments: [t]
    };
    const activeKey = this.active.get();
    if (activeKey && targetKey(activeKey) === targetKey(t)) {
      item.description = `${t.type}  ●`;
    }
    return item;
  }

  getChildren(node?: Node): Node[] {
    if (!node) {
      // Single `//` root so the whole workspace is itself an actionable
      // (build/test `//...`) node; everything else nests beneath it.
      return this.model.targets.length > 0 ? [{ kind: 'dir', path: '' }] : [];
    }
    if (node.kind === 'dir') {
      return this.childrenOf(node.path);
    }
    return [];
  }

  /**
   * Children of a directory: immediate sub-directories that contain packages
   * (folders first, sorted), then the targets this directory declares as a
   * package (sorted). Intermediate directories with no BUILD file still appear
   * so deeper packages remain reachable.
   */
  private childrenOf(parent: string): Node[] {
    const dirs: Node[] = subdirectories(
      this.model.targets.map((t) => t.path),
      parent
    ).map((path) => ({ kind: 'dir', path }));
    const targets: Node[] = this.model
      .inPackage(parent)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((target) => ({ kind: 'target', target }));
    return [...dirs, ...targets];
  }

  refresh(): void {
    this._onDidChange.fire();
  }
}
