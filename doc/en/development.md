# Development

## Prerequisites

- Node.js 20+
- VS Code

## Setup

```sh
npm install
```

## Common scripts

| Script | What it does |
| --- | --- |
| `npm run compile` | Bundle the extension with esbuild (`dist/extension.js`). |
| `npm run watch` | Rebuild on change. |
| `npm run check-types` | Type-check with `tsc --noEmit`. |
| `npm run lint` | Lint `src` with ESLint. |
| `npm test` | Compile and run the integration tests in a VS Code host. |
| `npm run package` | Production bundle (used by `vsce`). |

## Running the extension

Press <kbd>F5</kbd> to launch an Extension Development Host with the extension
loaded. Open a Blade workspace in that window.

## Architecture

The extension never parses BUILD files for semantic data — Blade is the source
of truth:

- `blade.ts` — runs blade (`dump --targets`, `dump --compdb`).
- `targetModel.ts` — caches the target list, watches BUILD/BLADE_ROOT files.
- `tasks.ts` — Tasks API integration for build/run/test/clean.
- `tree.ts`, `statusBar.ts`, `activeTarget.ts` — UI and selection state.
- `language/` — BUILD-file outline, navigation, completion, hover, diagnostics
  (a lightweight parser, not a full Python parse).

## Tests & CI

Tests run in a real VS Code host via `@vscode/test-cli`. CI
(`.github/workflows/ci.yml`) type-checks, lints, bundles, and runs the tests on
Linux/macOS/Windows, then packages a `.vsix` artifact.
