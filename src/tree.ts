import * as vscode from 'vscode';
import { TargetModel } from './targetModel';
import { ActiveTarget } from './activeTarget';
import { BladeTarget, isDebuggable, isRunnable, isTestable, targetKey, targetLabel } from './types';

type Node =
  | { kind: 'package'; path: string }
  | { kind: 'target'; target: BladeTarget };

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

export class BladeTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(
    private readonly model: TargetModel,
    private readonly active: ActiveTarget
  ) {
    model.onDidChange(() => this._onDidChange.fire());
    active.onDidChange(() => this._onDidChange.fire());
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'package') {
      const item = new vscode.TreeItem(
        node.path === '' ? '//' : `//${node.path}`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.iconPath = new vscode.ThemeIcon('folder');
      item.contextValue = 'package';
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
      const packages = [...new Set(this.model.targets.map((t) => t.path))].sort();
      return packages.map((path) => ({ kind: 'package', path }));
    }
    if (node.kind === 'package') {
      return this.model
        .inPackage(node.path)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((target) => ({ kind: 'target', target }));
    }
    return [];
  }

  refresh(): void {
    this._onDidChange.fire();
  }
}
