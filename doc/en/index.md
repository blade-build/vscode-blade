# Blade for Visual Studio Code

First-party Visual Studio Code support for the
[Blade](https://github.com/blade-build/blade-build) build system.

This extension turns VS Code into a comfortable home for Blade projects:

- a **targets explorer** with inline build / run / test / debug;
- **build, run, test, clean** through the VS Code Tasks API (clickable errors,
  no run-after-failed-build);
- **BUILD-file language features** — highlighting, outline, go-to-definition on
  dependency labels, completion, hover, and diagnostics;
- **C/C++ IntelliSense** via `compile_commands.json` and clangd.

## Design principle

Blade is always the source of truth. Targets are read from
`blade dump --targets` and the dependency graph from `blade query` — never by
scraping BUILD files. As a result every rule kind (C++, Java, Scala, Python,
proto, …) is understood accurately, and the extension stays correct as Blade
evolves.

## Next steps

- [Getting Started](getting-started.md)
- [Usage](usage.md)
- [BUILD language features](build-language.md)
- [C/C++ IntelliSense](intellisense.md)
- [Settings](settings.md)
