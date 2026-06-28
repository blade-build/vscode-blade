# Getting Started

## Requirements

- [Blade](https://github.com/blade-build/blade-build) installed and on your
  `PATH`. If it lives elsewhere, set `blade.executable`.
- A workspace folder that contains (at or above it) a `BLADE_ROOT` file.

## Install

Install **Blade** from the VS Code Marketplace, or from a `.vsix`:

```sh
code --install-extension vscode-blade.vsix
```

## First run

1. Open a Blade workspace. The extension activates when a `BLADE_ROOT` is
   present and the **Blade** view appears in the Activity Bar.
2. Targets are loaded via `blade dump --targets`. Use **Blade: Refresh Targets**
   (the refresh icon on the view) at any time to reload.
3. Click a target in the explorer to make it the **active target**, or pick one
   from the status-bar control. Then use the status-bar **Build / Run / Test**
   buttons.
4. For C/C++ IntelliSense, run **Blade: Generate compile_commands.json** and
   install [clangd](intellisense.md) when prompted.

## Workspace detection

The extension looks for a `BLADE_ROOT` at or above each workspace folder; if
none is found there, it searches within the workspace. Multi-root workspaces are
supported — the first discovered root is used as the primary.
