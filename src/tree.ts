import * as path from 'path';
import * as vscode from 'vscode';
import { TargetModel } from './targetModel';
import { ActiveTarget } from './activeTarget';
import {
  BladeTarget,
  isDebuggable,
  isRunnable,
  isTestable,
  qualifiedKey,
  targetKey,
  targetLabel
} from './types';

type Node =
  | { kind: 'dir'; root: string; path: string }
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
    const key = qualifiedKey(node.root, node.path);
    const changed = expanded ? this.collapsed.delete(key) : !this.collapsed.has(key);
    if (!expanded) {
      this.collapsed.add(key);
    }
    if (changed) {
      void this.storage.update(COLLAPSED_KEY, [...this.collapsed]);
    }
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'dir') {
      const multiRoot = this.model.roots.length > 1;
      const isRootNode = node.path === '';
      // The per-root top node is labelled by the workspace folder name when
      // several are open; with a single root it is just `//`.
      const label = isRootNode
        ? multiRoot
          ? path.basename(node.root)
          : '//'
        : node.path.split('/').pop()!;
      // Only a root node can be childless (empty/failed workspace); a sub-dir
      // node exists precisely because a package lives beneath it.
      const hasChildren = !isRootNode || this.childrenOf(node.root, node.path).length > 0;
      const item = new vscode.TreeItem(
        label,
        hasChildren
          ? this.collapsed.has(qualifiedKey(node.root, node.path))
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.None
      );
      item.tooltip = isRootNode ? node.root : `${node.root}\n//${node.path}`;
      item.iconPath = new vscode.ThemeIcon(isRootNode && multiRoot ? 'root-folder' : 'folder');
      item.contextValue = this.model.inPackage(node.root, node.path).length > 0 ? 'package' : 'dir';
      // Surface why a discovered root shows nothing: a `blade dump` failure, or
      // a workspace that simply declares no targets.
      if (isRootNode) {
        const err = this.model.rootError(node.root);
        if (err) {
          item.description = 'blade failed';
          item.tooltip = `${node.root}\n\n${err}`;
          item.iconPath = new vscode.ThemeIcon(
            'error',
            new vscode.ThemeColor('list.errorForeground')
          );
        } else if (!hasChildren) {
          item.description = 'no targets';
        }
      }
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
    const active = this.active.get();
    if (active && qualifiedKey(active.root ?? '', targetKey(active)) === qualifiedKey(t.root ?? '', targetKey(t))) {
      item.description = `${t.type}  ●`;
    }
    return item;
  }

  getChildren(node?: Node): Node[] {
    if (!node) {
      // One top node per discovered workspace, so each `//` root is itself an
      // actionable (build/test `//...`) node. Failed or empty roots are kept
      // (annotated in getTreeItem) rather than hidden, so a misconfigured
      // workspace is visible instead of silently missing. With a single root
      // this is the lone `//` node.
      return this.model.roots.map((root) => ({ kind: 'dir', root, path: '' }));
    }
    if (node.kind === 'dir') {
      return this.childrenOf(node.root, node.path);
    }
    return [];
  }

  /**
   * Children of a directory: immediate sub-directories that contain packages
   * (folders first, sorted), then the targets this directory declares as a
   * package (sorted). Intermediate directories with no BUILD file still appear
   * so deeper packages remain reachable.
   */
  private childrenOf(root: string, parent: string): Node[] {
    const dirs: Node[] = subdirectories(
      this.model.targets.filter((t) => t.root === root).map((t) => t.path),
      parent
    ).map((path) => ({ kind: 'dir', root, path }));
    const targets: Node[] = this.model
      .inPackage(root, parent)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((target) => ({ kind: 'target', target }));
    return [...dirs, ...targets];
  }

  refresh(): void {
    this._onDidChange.fire();
  }
}
