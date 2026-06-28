import * as vscode from 'vscode';
import { generateCompdb } from './blade';
import { getConfig } from './config';

const CLANGD_ID = 'llvm-vs-code-extensions.vscode-clangd';

/** Generate compile_commands.json and (optionally) nudge toward clangd. */
export async function runGenerateCompdb(root: string): Promise<void> {
  const cfg = getConfig(vscode.Uri.file(root));
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Blade: generating compile_commands.json', cancellable: true },
    async (_progress, token) => {
      const res = await generateCompdb(root, cfg, token);
      if (res.code !== 0) {
        throw new Error(res.stderr.trim() || `blade dump --compdb exited ${res.code}`);
      }
    }
  );
  if (cfg.recommendClangd) {
    await maybeRecommendClangd();
  }
}

async function maybeRecommendClangd(): Promise<void> {
  if (vscode.extensions.getExtension(CLANGD_ID)) {
    return;
  }
  const choice = await vscode.window.showInformationMessage(
    'compile_commands.json is ready. Install clangd for C/C++ IntelliSense (code navigation & completion)?',
    'Install clangd',
    'Not now'
  );
  if (choice === 'Install clangd') {
    await vscode.commands.executeCommand('workbench.extensions.installExtension', CLANGD_ID);
  }
}
