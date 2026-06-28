import * as vscode from 'vscode';
import { TargetModel } from '../targetModel';
import { resolveLabel } from './resolve';

// Quoted absolute labels: "//path:name". We only validate '//'-prefixed labels;
// relative ':name' and system/third-party deps ('#pthread', etc.) are skipped to
// avoid false positives.
const ABS_LABEL = /(['"])(\/\/[\w./+-]*:[\w.+-]+|\/\/[\w./+-]+)\1/g;

/**
 * Flags dependency labels that don't resolve to any known target. Best-effort:
 * runs only when the target model is populated, and stays silent on a stale or
 * errored model.
 */
export class DepDiagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('blade');
  private readonly disposables: vscode.Disposable[] = [];
  private debounce?: NodeJS.Timeout;

  constructor(private readonly model: TargetModel) {
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((d) => this.validate(d)),
      vscode.workspace.onDidChangeTextDocument((e) => this.schedule(e.document)),
      vscode.workspace.onDidCloseTextDocument((d) => this.collection.delete(d.uri)),
      model.onDidChange(() => this.validateAll())
    );
    this.validateAll();
  }

  private schedule(doc: vscode.TextDocument): void {
    if (doc.languageId !== 'blade-build') {
      return;
    }
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => this.validate(doc), 600);
  }

  private validateAll(): void {
    for (const doc of vscode.workspace.textDocuments) {
      this.validate(doc);
    }
  }

  private validate(doc: vscode.TextDocument): void {
    if (doc.languageId !== 'blade-build') {
      return;
    }
    const root = this.model.rootFor(doc.fileName);
    if (!root || this.model.error || this.model.targets.length === 0) {
      this.collection.delete(doc.uri);
      return;
    }
    const text = doc.getText();
    const diagnostics: vscode.Diagnostic[] = [];
    ABS_LABEL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ABS_LABEL.exec(text)) !== null) {
      const label = m[2];
      const resolved = resolveLabel(root, doc, label);
      if (!resolved || this.model.find(root, resolved.key)) {
        continue;
      }
      const start = doc.positionAt(m.index + 1);
      const end = doc.positionAt(m.index + 1 + label.length);
      const diag = new vscode.Diagnostic(
        new vscode.Range(start, end),
        `Unknown Blade target: ${label}`,
        vscode.DiagnosticSeverity.Warning
      );
      diag.source = 'blade';
      diagnostics.push(diag);
    }
    this.collection.set(doc.uri, diagnostics);
  }

  dispose(): void {
    this.collection.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
  }
}
