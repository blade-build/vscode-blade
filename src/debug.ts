import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { createBladeTask, executeBladeTask } from './tasks';
import { BladeTarget, isDebuggable, targetLabel } from './types';

/**
 * Build a target, then launch it under a C/C++ debugger.
 *
 * Uses the stable `blade-bin` symlink for the program path (it always points at
 * the most recently built output tree, regardless of profile/bits).
 */
export async function debugTarget(root: string, target: BladeTarget): Promise<void> {
  if (!isDebuggable(target)) {
    void vscode.window.showErrorMessage(
      `${targetLabel(target)} (${target.type}) is not a debuggable native target.`
    );
    return;
  }
  const exitCode = await executeBladeTask(createBladeTask(root, 'build', target));
  if (exitCode !== 0) {
    void vscode.window.showErrorMessage(`Build failed for ${targetLabel(target)}; not launching debugger.`);
    return;
  }
  const program = path.join(root, 'blade-bin', target.path, target.name);
  const config: vscode.DebugConfiguration = {
    type: 'cppdbg',
    request: 'launch',
    name: `Debug ${targetLabel(target)}`,
    program,
    args: [],
    cwd: root,
    MIMode: os.platform() === 'darwin' ? 'lldb' : 'gdb',
    stopAtEntry: false
  };
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(root));
  const started = await vscode.debug.startDebugging(folder, config);
  if (!started) {
    void vscode.window.showErrorMessage(
      'Failed to start the debugger. The C/C++ extension (ms-vscode.cpptools) provides the "cppdbg" debug type.'
    );
  }
}
