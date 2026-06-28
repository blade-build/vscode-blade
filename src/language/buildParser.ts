import * as vscode from 'vscode';

export interface TargetDecl {
  ruleType: string;
  name?: string;
  ruleRange: vscode.Range; // the rule function identifier
  nameRange?: vscode.Range; // the name string literal value (without quotes)
  fullRange: vscode.Range; // the whole rule(...) call
}

// A top-level rule call: optional indent, an identifier, then '('. We only treat
// lower_snake_case identifiers as rules (matches blade's rule names and skips
// most helper calls/keywords).
const RULE_START = /(^|\n)([ \t]*)([a-z_][a-z0-9_]*)[ \t]*\(/g;
const NAME_ATTR = /\bname[ \t]*=[ \t]*(['"])(.*?)\1/;

/** Find the offset of the ')' matching the '(' at `open`, skipping strings/comments. */
function matchParen(text: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '#') {
      // comment to end of line
      const nl = text.indexOf('\n', i);
      if (nl === -1) {
        return text.length - 1;
      }
      i = nl;
    } else if (ch === '"' || ch === "'") {
      // skip string (no triple-quote handling needed for BUILD attributes)
      const quote = ch;
      i++;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') {
          i++;
        }
        i++;
      }
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  return text.length - 1;
}

/**
 * Parse the rule declarations in a BUILD document. Heuristic (no full Python
 * parse), but robust enough for outline / navigation: it does paren matching
 * and skips strings and comments.
 */
export function parseBuildDocument(doc: vscode.TextDocument): TargetDecl[] {
  const text = doc.getText();
  const decls: TargetDecl[] = [];
  RULE_START.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RULE_START.exec(text)) !== null) {
    const ruleType = m[3];
    const idStart = m.index + m[1].length + m[2].length;
    const openParen = m.index + m[0].length - 1; // the '(' that ends the match
    const close = matchParen(text, openParen);
    const body = text.slice(openParen, close + 1);
    const decl: TargetDecl = {
      ruleType,
      ruleRange: new vscode.Range(doc.positionAt(idStart), doc.positionAt(idStart + ruleType.length)),
      fullRange: new vscode.Range(doc.positionAt(idStart), doc.positionAt(close + 1))
    };
    const nameMatch = NAME_ATTR.exec(body);
    if (nameMatch) {
      const valueOffset = openParen + nameMatch.index + nameMatch[0].length - nameMatch[2].length - 1;
      decl.name = nameMatch[2];
      decl.nameRange = new vscode.Range(
        doc.positionAt(valueOffset),
        doc.positionAt(valueOffset + nameMatch[2].length)
      );
    }
    decls.push(decl);
    RULE_START.lastIndex = close + 1;
  }
  return decls;
}

const LABEL = /(\/\/[\w./+-]*:[\w.+-]+|\/\/[\w./+-]+|:[\w.+-]+)/;

/** The dependency label (e.g. `//common/base:string` or `:foo`) under `pos`. */
export function labelAt(doc: vscode.TextDocument, pos: vscode.Position): { label: string; range: vscode.Range } | undefined {
  const range = doc.getWordRangeAtPosition(pos, LABEL);
  if (!range) {
    return undefined;
  }
  return { label: doc.getText(range), range };
}
