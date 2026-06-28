import * as path from 'path';
import * as vscode from 'vscode';
import { TargetModel } from '../targetModel';
import { parseBuildDocument } from './buildParser';

export interface ResolvedLabel {
  pkg: string;
  name: string;
  key: string; // 'pkg:name'
}

/** Resolve a dep label relative to the BUILD file it appears in. */
export function resolveLabel(
  root: string,
  fromDoc: vscode.TextDocument,
  label: string
): ResolvedLabel | undefined {
  let pkg: string;
  let name: string;
  if (label.startsWith('//')) {
    const rest = label.slice(2);
    const idx = rest.lastIndexOf(':');
    if (idx >= 0) {
      pkg = rest.slice(0, idx);
      name = rest.slice(idx + 1);
    } else {
      pkg = rest;
      name = path.posix.basename(rest);
    }
  } else if (label.startsWith(':')) {
    pkg = path.relative(root, path.dirname(fromDoc.fileName)).split(path.sep).join('/');
    if (pkg === '.') {
      pkg = '';
    }
    name = label.slice(1);
  } else {
    return undefined;
  }
  return { pkg, name, key: `${pkg}:${name}` };
}

/** Location of a target's declaration in its BUILD file (name string if found). */
export async function locateTarget(
  root: string,
  resolved: ResolvedLabel
): Promise<vscode.Location | undefined> {
  const buildUri = vscode.Uri.file(path.join(root, resolved.pkg, 'BUILD'));
  let doc: vscode.TextDocument;
  try {
    doc = await vscode.workspace.openTextDocument(buildUri);
  } catch {
    return undefined;
  }
  const decl = parseBuildDocument(doc).find((d) => d.name === resolved.name);
  const range =
    decl?.nameAttrRange ?? decl?.nameRange ?? decl?.ruleRange ?? new vscode.Range(0, 0, 0, 0);
  return new vscode.Location(buildUri, range);
}

export async function resolveAndLocate(
  model: TargetModel,
  fromDoc: vscode.TextDocument,
  label: string
): Promise<vscode.Location | undefined> {
  const root = model.root;
  if (!root) {
    return undefined;
  }
  const resolved = resolveLabel(root, fromDoc, label);
  if (!resolved) {
    return undefined;
  }
  return locateTarget(root, resolved);
}
