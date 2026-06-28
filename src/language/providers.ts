import * as vscode from 'vscode';
import { TargetModel } from '../targetModel';
import { targetLabel } from '../types';
import { labelAt, parseBuildDocument } from './buildParser';
import { resolveAndLocate, resolveLabel } from './resolve';

const SELECTOR: vscode.DocumentSelector = { language: 'blade-build' };

// Common Blade rule names, for statement-start completion.
const RULE_TYPES = [
  'cc_library', 'cc_binary', 'cc_test', 'cc_benchmark',
  'proto_library', 'thrift_library', 'swig_library',
  'java_library', 'java_binary', 'java_test',
  'scala_library', 'scala_binary', 'scala_test',
  'py_library', 'py_binary', 'py_test',
  'resource_library', 'gen_rule', 'sh_test', 'lex_yacc_library'
];

// Common attribute names, for in-call completion.
const ATTRS = [
  'name', 'srcs', 'hdrs', 'deps', 'visibility', 'tags', 'defs', 'incs',
  'warning', 'optimize', 'extra_cppflags', 'link_all_symbols', 'testdata'
];

class SymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(doc: vscode.TextDocument): vscode.DocumentSymbol[] {
    return parseBuildDocument(doc)
      .filter((d) => d.name)
      .map((d) => {
        const kind =
          d.ruleType.endsWith('_test')
            ? vscode.SymbolKind.Event
            : d.ruleType.endsWith('_binary')
              ? vscode.SymbolKind.Function
              : vscode.SymbolKind.Class;
        return new vscode.DocumentSymbol(d.name!, d.ruleType, kind, d.fullRange, d.ruleRange);
      });
  }
}

class DefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly model: TargetModel) {}
  async provideDefinition(
    doc: vscode.TextDocument,
    pos: vscode.Position
  ): Promise<vscode.Location | undefined> {
    const hit = labelAt(doc, pos);
    if (!hit) {
      return undefined;
    }
    return resolveAndLocate(this.model, doc, hit.label);
  }
}

class HoverProvider implements vscode.HoverProvider {
  constructor(private readonly model: TargetModel) {}
  provideHover(doc: vscode.TextDocument, pos: vscode.Position): vscode.Hover | undefined {
    const hit = labelAt(doc, pos);
    const root = this.model.rootFor(doc.fileName);
    if (!hit || !root) {
      return undefined;
    }
    const resolved = resolveLabel(root, doc, hit.label);
    if (!resolved) {
      return undefined;
    }
    const t = this.model.find(root, resolved.key);
    if (!t) {
      return undefined;
    }
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${targetLabel(t)}**\n\n`);
    md.appendMarkdown(`- type: \`${t.type}\`\n`);
    md.appendMarkdown(`- srcs: ${t.srcs.length}\n`);
    md.appendMarkdown(`- deps: ${t.deps.length}\n`);
    return new vscode.Hover(md, hit.range);
  }
}

class CompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly model: TargetModel) {}
  provideCompletionItems(
    doc: vscode.TextDocument,
    pos: vscode.Position
  ): vscode.CompletionItem[] {
    const line = doc.lineAt(pos.line).text;
    const prefix = line.slice(0, pos.character);

    // Inside a string within a deps-like list: complete target labels.
    const inString = (prefix.match(/"/g)?.length ?? 0) % 2 === 1 || (prefix.match(/'/g)?.length ?? 0) % 2 === 1;
    if (inString && this.nearDepsAttr(doc, pos)) {
      // Only labels from the same workspace are valid dependencies here.
      const root = this.model.rootFor(doc.fileName);
      return this.model.targets
        .filter((t) => !root || t.root === root)
        .map((t) => {
          const item = new vscode.CompletionItem(targetLabel(t), vscode.CompletionItemKind.Reference);
          item.detail = t.type;
          return item;
        });
    }

    // Statement start: complete rule types.
    if (/^\s*[a-z_]*$/.test(prefix)) {
      return RULE_TYPES.map((r) => {
        const item = new vscode.CompletionItem(r, vscode.CompletionItemKind.Function);
        item.insertText = new vscode.SnippetString(`${r}(\n    name = "$1",\n    $0\n)`);
        return item;
      });
    }

    // Inside a call: complete attribute names.
    if (/^\s*[a-z_]*$/.test(prefix.replace(/.*[(,]\s*/, ''))) {
      return ATTRS.map((a) => {
        const item = new vscode.CompletionItem(a, vscode.CompletionItemKind.Property);
        item.insertText = new vscode.SnippetString(`${a} = `);
        return item;
      });
    }
    return [];
  }

  /** Whether the cursor sits within a `deps`/`testdata`-style list. */
  private nearDepsAttr(doc: vscode.TextDocument, pos: vscode.Position): boolean {
    for (let l = pos.line; l >= 0 && l > pos.line - 30; l--) {
      const text = doc.lineAt(l).text;
      if (/\b(deps|testdata)\b\s*=/.test(text)) {
        return true;
      }
      if (/^[a-z_]+\s*\(/.test(text) && l !== pos.line) {
        break; // hit the start of the rule call
      }
    }
    return false;
  }
}

export function registerLanguageProviders(
  context: vscode.ExtensionContext,
  model: TargetModel
): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(SELECTOR, new SymbolProvider()),
    vscode.languages.registerDefinitionProvider(SELECTOR, new DefinitionProvider(model)),
    vscode.languages.registerHoverProvider(SELECTOR, new HoverProvider(model)),
    vscode.languages.registerCompletionItemProvider(SELECTOR, new CompletionProvider(model), '"', "'", ':')
  );
}
