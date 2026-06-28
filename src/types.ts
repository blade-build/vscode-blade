// The shape of one entry from `blade dump --targets` (see Target.dump() in
// blade's src/blade/target.py). Extra rule-specific attributes appear as
// additional keys, hence the index signature.
export interface BladeTarget {
  type: string; // rule name, e.g. 'cc_library', 'cc_binary', 'cc_test'
  path: string; // package dir relative to BLADE_ROOT, '' for the root package
  name: string;
  srcs: string[];
  deps: string[]; // canonical 'path:name' keys
  visibility: string[];
  tags: string[];
  root?: string; // absolute BLADE_ROOT this target was dumped from (set by TargetModel)
  [attr: string]: unknown;
}

/** Canonical label `//path:name` (or `//:name` at the root). */
export function targetLabel(t: { path: string; name: string }): string {
  return `//${t.path}:${t.name}`;
}

/** Canonical key `path:name` as used in `deps` and within a single root. */
export function targetKey(t: { path: string; name: string }): string {
  return `${t.path}:${t.name}`;
}

/**
 * Cross-root-unique identity. Target keys (`path:name`) and package paths are
 * only unique within one BLADE_ROOT, so the model qualifies them with the
 * absolute root to disambiguate when several workspaces are open at once.
 */
export function qualifiedKey(root: string, key: string): string {
  return `${root}\u0000${key}`;
}

/**
 * External libraries referenced with a `#`, e.g. system libraries like
 * `#pthread`/`#m`/`#dl`. Blade synthesizes these rather than reading them
 * from a BUILD file, so they should not appear as build/run/test targets in
 * the UI. Any target whose name or package path carries a `#` is external.
 */
export function isExternalLibrary(t: BladeTarget): boolean {
  return t.type === 'system_library' || t.path.includes('#') || t.name.includes('#');
}

export function isTestable(t: BladeTarget): boolean {
  return t.type.endsWith('_test');
}

export function isRunnable(t: BladeTarget): boolean {
  return t.type.endsWith('_binary');
}

/** Native targets we can launch under a C/C++ debugger. */
export function isDebuggable(t: BladeTarget): boolean {
  return t.type === 'cc_binary' || t.type === 'cc_test';
}
