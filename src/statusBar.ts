import * as vscode from 'vscode';
import { ActiveTarget } from './activeTarget';
import { isRunnable, isTestable, targetLabel } from './types';

/** Status-bar controls: active target + build/run/test/clean buttons. */
export class StatusBar implements vscode.Disposable {
  private readonly items: vscode.StatusBarItem[] = [];
  private readonly target: vscode.StatusBarItem;

  constructor(private readonly active: ActiveTarget) {
    const left = vscode.StatusBarAlignment.Left;
    this.target = this.add(left, 100, '$(target) No Target', 'blade.selectTarget', 'Select the active Blade target');
    this.add(left, 99, '$(gear)', 'blade.build', 'Build the active target');
    this.add(left, 98, '$(run)', 'blade.run', 'Run the active target');
    this.add(left, 97, '$(beaker)', 'blade.test', 'Test the active target');
    this.add(left, 96, '$(clear-all)', 'blade.clean', 'Clean the workspace');

    active.onDidChange(() => this.render());
    this.render();
  }

  private add(
    alignment: vscode.StatusBarAlignment,
    priority: number,
    text: string,
    command: string,
    tooltip: string
  ): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(alignment, priority);
    item.text = text;
    item.command = command;
    item.tooltip = tooltip;
    item.show();
    this.items.push(item);
    return item;
  }

  private render(): void {
    const t = this.active.get();
    this.target.text = t ? `$(target) ${targetLabel(t)}` : '$(target) No Target';
    this.target.tooltip = t
      ? `Active target: ${targetLabel(t)} (${t.type})${
          isRunnable(t) ? ' — runnable' : isTestable(t) ? ' — testable' : ''
        }`
      : 'Select the active Blade target';
  }

  dispose(): void {
    for (const item of this.items) {
      item.dispose();
    }
  }
}
