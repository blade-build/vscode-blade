# Blade for Visual Studio Code

First-party Visual Studio Code support for the [Blade](https://github.com/blade-build/blade-build)
build system.

*[中文说明](README.zh-CN.md) · [Documentation](https://blade-build.github.io/)*

## Features

- **Targets explorer** — every target in the workspace, grouped by package, with
  inline **build / run / test / debug** actions.
- **Build, run, test, clean** from the status bar, the command palette, or the
  explorer — executed through the VS Code **Tasks API**, so compiler errors land
  in the Problems panel and a failed build never silently runs a stale binary.
- **BUILD-file language support** — syntax highlighting, an outline of targets,
  **go-to-definition** on dependency labels (`//path:name`, `:name`),
  completion of rule types / attributes / dependency labels, hover, and warnings
  for dependencies that don't resolve to a known target.
- **C/C++ IntelliSense** — one click generates `compile_commands.json`
  (`blade dump --compdb`) for use with [clangd](https://clangd.llvm.org/).

Targets are always read from Blade itself (`blade dump --targets`), never by
scraping BUILD files — so every rule kind (C++, Java, Scala, Python, proto, …)
is understood accurately.

## Requirements

- [Blade](https://github.com/blade-build/blade-build) installed and on your
  `PATH` (or set `blade.executable`).
- A workspace containing a `BLADE_ROOT` file.

## Getting started

1. Open a Blade workspace (a folder with a `BLADE_ROOT`).
2. The **Blade** view appears in the Activity Bar with your targets.
3. Pick an active target from the status bar, then **Build** / **Run** / **Test**.
4. Run **Blade: Generate compile_commands.json** and install clangd for C/C++
   IntelliSense.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `blade.executable` | `blade` | Path to the blade executable. |
| `blade.jobs` | `0` | Parallel jobs (`-j`); `0` lets blade auto-detect CPUs. |
| `blade.commandPrefix` | `[]` | Tokens prepended to every blade command (e.g. a wrapper). |
| `blade.environment` | `{}` | Extra environment variables for blade tasks. |
| `blade.buildBeforeRun` | `true` | Build before running a target. |
| `blade.generateCompdbOnRefresh` | `true` | Regenerate `compile_commands.json` on refresh. |
| `blade.recommendClangd` | `true` | Suggest installing clangd for C/C++ IntelliSense. |

## Commands

`Blade: Refresh Targets`, `Select Active Target`, `Build / Run / Test Active
Target`, `Clean`, `Generate compile_commands.json`.

## Acknowledgements

Inspired by, and superseding, the community extension
[`dhwang.blade`](https://marketplace.visualstudio.com/items?itemName=dhwang.blade)
by [@wangdh15](https://github.com/wangdh15) (MIT). This is a clean-room
reimplementation; see [NOTICE](NOTICE).

## License

[MIT](LICENSE)
