# BUILD Language Features

BUILD (and `BLADE_ROOT`) files are recognized as the `blade-build` language.

## Syntax highlighting

A TextMate grammar highlights comments, strings, numbers, the boolean/`None`
constants, known rule calls (`cc_library`, `proto_library`, …) and common
attribute names (`name`, `srcs`, `deps`, …).

## Outline

The **Outline** view and breadcrumbs list the targets declared in the current
BUILD file, keyed by their `name`. Test, binary, and library rules get distinct
symbol kinds.

## Go to definition

Place the cursor on a dependency label and **Go to Definition** (F12) jumps to
that target's declaration:

- absolute labels — `//common/base:string`;
- relative labels — `:helper` (same package).

The target's BUILD file is opened and the cursor is placed on its `name`.

## Completion

- **Rule types** at the start of a statement, expanded as a snippet with a
  `name` placeholder.
- **Attribute names** inside a rule call.
- **Dependency labels** inside a `deps` / `testdata` list — every target in the
  workspace is offered, labelled with its rule type.

## Hover

Hovering a dependency label shows the target's type and its source/dependency
counts.

## Diagnostics

Absolute labels (`//path:name`) that don't resolve to any known target are
flagged as warnings. Relative and system/third-party labels are not flagged, to
avoid false positives. Diagnostics are suppressed while the target model is empty
or in error, so they never fire on a stale view.
