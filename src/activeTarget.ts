import * as vscode from 'vscode';
import { TargetModel } from './targetModel';
import { BladeTarget } from './types';

const STATE_KEY = 'blade.activeTarget';

/** The user's currently selected target, persisted across sessions. */
export class ActiveTarget implements vscode.Disposable {
  private key: string | undefined;
  private readonly _onDidChange = new vscode.EventEmitter<BladeTarget | undefined>();
  readonly onDidChange = this._onDidChange.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly model: TargetModel
  ) {
    this.key = context.workspaceState.get<string>(STATE_KEY);
    // Drop the selection if the target disappeared after a refresh.
    model.onDidChange(() => {
      if (this.key && !model.find(this.key)) {
        void this.set(undefined);
      } else {
        this._onDidChange.fire(this.get());
      }
    });
  }

  get(): BladeTarget | undefined {
    return this.key ? this.model.find(this.key) : undefined;
  }

  async set(target: BladeTarget | string | undefined): Promise<void> {
    this.key =
      typeof target === 'string' || target === undefined
        ? target
        : `${target.path}:${target.name}`;
    await this.context.workspaceState.update(STATE_KEY, this.key);
    this._onDidChange.fire(this.get());
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
