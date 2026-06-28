# Change Log

All notable changes to the Blade VS Code extension are documented here. The
format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Targets explorer (Activity Bar) grouped by package, with inline
  build / run / test / debug actions.
- Build / run / test / clean via the VS Code Tasks API, with the `$gcc` problem
  matcher and a status-bar control set.
- Active-target selection, persisted per workspace.
- Target model sourced from `blade dump --targets` (all rule kinds), with a
  file watcher that refreshes on BUILD/BLADE_ROOT changes.
- BUILD-file language support: TextMate grammar, outline (document symbols),
  go-to-definition on dependency labels, completion (rule types / attributes /
  dependency labels), hover, and unresolved-dependency diagnostics.
- C/C++ IntelliSense bridge: `blade dump --compdb` generation and a clangd
  recommendation.
- Debug launch for `cc_binary` / `cc_test` via the stable `blade-bin` path.
- Bilingual documentation (English / 简体中文).
