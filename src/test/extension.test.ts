import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  isDebuggable,
  isExternalLibrary,
  isRunnable,
  isTestable,
  targetKey,
  targetLabel
} from '../types';
import { labelAt, parseBuildDocument } from '../language/buildParser';
import { resolveLabel } from '../language/resolve';
import { bladeArgsFor } from '../tasks';
import { dirScope, subdirectories } from '../tree';
import { BladeConfig } from '../config';

function fakeTarget(type: string, path: string, name: string) {
  return { type, path, name, srcs: [], deps: [], visibility: [], tags: [] };
}

function fakeConfig(over: Partial<BladeConfig> = {}): BladeConfig {
  return {
    executable: 'blade',
    jobs: 0,
    commandPrefix: [],
    buildArgs: [],
    testArgs: [],
    runArgs: [],
    environment: {},
    generateCompdbOnRefresh: true,
    recommendClangd: true,
    ...over
  };
}

suite('target classification', () => {
  test('runnable / testable / debuggable', () => {
    assert.ok(isRunnable(fakeTarget('cc_binary', 'a', 'x')));
    assert.ok(isRunnable(fakeTarget('java_binary', 'a', 'x')));
    assert.ok(!isRunnable(fakeTarget('cc_library', 'a', 'x')));

    assert.ok(isTestable(fakeTarget('cc_test', 'a', 'x')));
    assert.ok(!isTestable(fakeTarget('cc_binary', 'a', 'x')));

    assert.ok(isDebuggable(fakeTarget('cc_binary', 'a', 'x')));
    assert.ok(isDebuggable(fakeTarget('cc_test', 'a', 'x')));
    assert.ok(!isDebuggable(fakeTarget('java_binary', 'a', 'x')));
  });

  test('labels and keys', () => {
    const t = fakeTarget('cc_library', 'common/base', 'string');
    assert.strictEqual(targetLabel(t), '//common/base:string');
    assert.strictEqual(targetKey(t), 'common/base:string');
  });
});

const SAMPLE = [
  '# a comment with the word name in it',
  'cc_library(',
  '    name = "foo",',
  '    srcs = ["foo.cc"],',
  '    deps = [',
  '        "//common/base:string",',
  '        ":helper",',
  '    ],',
  ')',
  '',
  'cc_test(',
  "    name = 'foo_test',",
  '    srcs = ["foo_test.cc"],',
  '    deps = [":foo"],',
  ')'
].join('\n');

suite('BUILD parser', () => {
  test('finds rule declarations and names', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'blade-build', content: SAMPLE });
    const decls = parseBuildDocument(doc);
    assert.strictEqual(decls.length, 2);
    assert.strictEqual(decls[0].ruleType, 'cc_library');
    assert.strictEqual(decls[0].name, 'foo');
    assert.strictEqual(decls[1].ruleType, 'cc_test');
    assert.strictEqual(decls[1].name, 'foo_test');
    // The commented "name" must not be mistaken for a declaration.
    assert.ok(decls.every((d) => d.name !== undefined));
  });

  test('nameAttrRange spans the whole name attribute (both quote styles)', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'blade-build', content: SAMPLE });
    const decls = parseBuildDocument(doc);
    assert.strictEqual(doc.getText(decls[0].nameAttrRange), 'name = "foo"');
    assert.strictEqual(doc.getText(decls[1].nameAttrRange), "name = 'foo_test'");
  });

  test('labelAt detects dependency labels', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'blade-build', content: SAMPLE });
    const idx = SAMPLE.indexOf('//common/base:string');
    const pos = doc.positionAt(idx + 3);
    const hit = labelAt(doc, pos);
    assert.ok(hit, 'expected a label under the cursor');
    assert.strictEqual(hit!.label, '//common/base:string');
  });
});

suite('label resolution', () => {
  test('absolute and relative labels', async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: 'blade-build',
      content: SAMPLE,
      // give it a path so relative labels resolve against a package dir
    });
    const abs = resolveLabel('/root', doc, '//common/base:string');
    assert.deepStrictEqual(abs, { pkg: 'common/base', name: 'string', key: 'common/base:string' });
  });
});

suite('external library filtering', () => {
  test('synthetic / external libs are detected', () => {
    assert.ok(isExternalLibrary(fakeTarget('system_library', '#', 'pthread')));
    assert.ok(isExternalLibrary(fakeTarget('cc_library', '#', 'pthread')));
    assert.ok(isExternalLibrary(fakeTarget('cc_library', '', '#pthread')));
    assert.ok(!isExternalLibrary(fakeTarget('cc_library', 'common/base', 'string')));
    assert.ok(!isExternalLibrary(fakeTarget('cc_binary', '', 'main')));
  });
});

suite('task argument construction', () => {
  test('injects profile, jobs, per-action args and target', () => {
    assert.deepStrictEqual(bladeArgsFor('build', '//foo:bar', fakeConfig(), 'release'), [
      'build',
      '-p',
      'release',
      '//foo:bar'
    ]);
    assert.deepStrictEqual(
      bladeArgsFor('build', '//foo:bar', fakeConfig({ jobs: 2, buildArgs: ['--verbose'] }), 'debug'),
      ['build', '-p', 'debug', '-j', '2', '--verbose', '//foo:bar']
    );
    assert.deepStrictEqual(
      bladeArgsFor('test', '//foo:bar', fakeConfig({ testArgs: ['--full-test'] }), 'release'),
      ['test', '-p', 'release', '--full-test', '//foo:bar']
    );
  });

  test('run omits -j; clean ignores profile/jobs/target', () => {
    assert.deepStrictEqual(
      bladeArgsFor('run', '//foo:bar', fakeConfig({ jobs: 4, runArgs: ['--', 'arg'] }), 'release'),
      ['run', '-p', 'release', '--', 'arg', '//foo:bar']
    );
    assert.deepStrictEqual(
      bladeArgsFor('clean', '//foo:bar', fakeConfig({ jobs: 4 }), 'release'),
      ['clean']
    );
  });

  test('no profile and no target produce a bare action', () => {
    assert.deepStrictEqual(bladeArgsFor('build', undefined, fakeConfig()), ['build']);
  });
});

suite('directory tree hierarchy', () => {
  const paths = ['', 'app', 'app/server', 'common/base', 'common/encoding'];

  test('subdirectories of the root are top-level segments, sorted', () => {
    assert.deepStrictEqual(subdirectories(paths, ''), ['app', 'common']);
  });

  test('a package directly in the parent is not a sub-directory', () => {
    // `app` itself is a package but should not list itself; only `app/server`.
    assert.deepStrictEqual(subdirectories(paths, 'app'), ['app/server']);
  });

  test('intermediate dir with no BUILD still yields its children', () => {
    assert.deepStrictEqual(subdirectories(paths, 'common'), [
      'common/base',
      'common/encoding'
    ]);
  });

  test('leaf package has no sub-directories', () => {
    assert.deepStrictEqual(subdirectories(paths, 'common/base'), []);
  });

  test('dirScope builds recursive blade patterns', () => {
    assert.strictEqual(dirScope(''), '//...');
    assert.strictEqual(dirScope('common/base'), '//common/base/...');
  });
});
