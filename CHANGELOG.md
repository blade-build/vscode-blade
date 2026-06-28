# Change Log

All notable changes to the Blade VS Code extension are documented here. The
format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Targets explorer (Activity Bar) as a directory tree, with inline
  build / run / test / debug on targets and recursive build / test on
  directories (`//path/...`). Expand/collapse state is persisted and synthetic
  external libraries are hidden.
- Build / run / test / clean via the VS Code Tasks API, with the `$gcc` problem
  matcher and a status-bar control set.
- Build-profile (`release` / `debug`) selector in the view title, injected as
  `-p <profile>` into every invocation and persisted per workspace.
- Per-action extra arguments via `blade.buildArgs` / `testArgs` / `runArgs`.
- Active-target selection, persisted per workspace.
- View-welcome states for loading / no-workspace / empty / error.
- Target model sourced from `blade dump --targets` (all rule kinds), with a
  file watcher that refreshes on BUILD/BLADE_ROOT changes.
- BUILD-file language support: TextMate grammar, outline (document symbols),
  go-to-definition on dependency labels, completion (rule types / attributes /
  dependency labels), hover, and unresolved-dependency diagnostics.
- C/C++ IntelliSense bridge: `blade dump --compdb` generation and a clangd
  recommendation.
- Debug launch for `cc_binary` / `cc_test` via the stable `blade-bin` path.
- Bilingual documentation (English / 简体中文).
