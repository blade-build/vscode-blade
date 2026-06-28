# Usage

## Targets explorer

The **Blade** view in the Activity Bar lists every target in the workspace,
grouped by package directory. Each target shows its rule type and an icon, and
exposes inline actions:

- **Build** — build the target.
- **Run** — for `*_binary` targets (`blade run`).
- **Test** — for `*_test` targets (`blade test`).
- **Debug** — for native `cc_binary` / `cc_test` targets.
- **Reveal in BUILD File** — jump to the target's declaration.

## Active target & status bar

The status bar shows the active target and **Build / Run / Test / Clean**
buttons. Selecting a target in the explorer (or via **Blade: Select Active
Target**) updates it. The selection is remembered per workspace.

## Tasks

All execution goes through the VS Code **Tasks API**, not a raw terminal:

- compiler diagnostics are parsed by the `$gcc` problem matcher and appear in the
  **Problems** panel;
- a failed build reports a non-zero exit code, so a broken target is never
  silently run;
- blade tasks also appear under **Terminal → Run Task** (`blade: build …`,
  `blade: test …`, `blade: clean`).

`Run` uses `blade run`, which builds and then runs the target — there is no
hardcoded output path, so it works regardless of build profile or platform.

## Clean

**Clean** runs `blade clean` (not a manual `rm -rf`), so it respects Blade's own
output layout.
