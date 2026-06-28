import * as vscode from 'vscode';

export type BladeProfile = 'debug' | 'release';

const KEY = 'blade.profile';

/**
 * The active build profile (`-p debug` / `-p release`), chosen from the targets
 * view title and persisted per workspace. Drives a `blade.profile` context key
 * so the title button can reflect the current value, and is injected into every
 * build/run/test/debug invocation.
 */
export class ProfileState implements vscode.Disposable {
  private current: BladeProfile;
  private readonly _onDidChange = new vscode.EventEmitter<BladeProfile>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.current = context.workspaceState.get<BladeProfile>(KEY, 'release');
    this.syncContext();
  }

  get value(): BladeProfile {
    return this.current;
  }

  async set(profile: BladeProfile): Promise<void> {
    if (profile === this.current) {
      return;
    }
    this.current = profile;
    await this.context.workspaceState.update(KEY, profile);
    this.syncContext();
    this._onDidChange.fire(profile);
  }

  private syncContext(): void {
    void vscode.commands.executeCommand('setContext', KEY, this.current);
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
