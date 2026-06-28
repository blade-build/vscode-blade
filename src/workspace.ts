import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const BLADE_ROOT = 'BLADE_ROOT';

/** Walk up from `dir` to the filesystem root looking for a BLADE_ROOT file. */
function findRootAbove(dir: string): string | undefined {
  let cur = dir;
  for (;;) {
    if (fs.existsSync(path.join(cur, BLADE_ROOT))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) {
      return undefined;
    }
    cur = parent;
  }
}

/**
 * Discover Blade workspace roots for the open workspace.
 *
 * For each workspace folder we first look at or above it (the common case: the
 * folder *is* the root, or a subdirectory of it). If nothing is found above any
 * folder, we fall back to searching within the workspace for a BLADE_ROOT file
 * (e.g. the user opened a parent directory containing the project).
 */
export async function findBladeRoots(): Promise<string[]> {
  const roots = new Set<string>();
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const above = findRootAbove(folder.uri.fsPath);
    if (above) {
      roots.add(above);
    }
  }
  if (roots.size === 0) {
    const found = await vscode.workspace.findFiles(
      `**/${BLADE_ROOT}`,
      '**/{node_modules,build64_release,build64_debug,build32_release,build32_debug}/**',
      16
    );
    for (const uri of found) {
      roots.add(path.dirname(uri.fsPath));
    }
  }
  return [...roots].sort();
}

/** The primary (first) Blade root, or undefined if none. */
export async function findPrimaryBladeRoot(): Promise<string | undefined> {
  return (await findBladeRoots())[0];
}
