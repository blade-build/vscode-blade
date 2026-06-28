# C/C++ IntelliSense

Blade can emit a [compilation database](https://clang.llvm.org/docs/JSONCompilationDatabase.html)
(`compile_commands.json`) describing exactly how each translation unit is
compiled. Paired with [clangd](https://clangd.llvm.org/), this gives accurate
C/C++ completion, go-to-definition, and diagnostics — including across generated
headers — without any manual include configuration.

## Generate the database

Run **Blade: Generate compile_commands.json** (or let it happen automatically on
refresh when `blade.generateCompdbOnRefresh` is enabled). This runs:

```sh
blade dump --compdb --to-file compile_commands.json
```

at the workspace root.

## Use clangd

When the database is generated, the extension offers to install the clangd
extension if it isn't present. Install it, and clangd picks up
`compile_commands.json` automatically.

!!! tip
    clangd and Microsoft's C/C++ extension both provide IntelliSense; running
    both at once causes duplicate diagnostics. Disable the C/C++ extension's
    IntelliSense (or the extension) when using clangd.

## Why a compilation database, not a language server?

This was the original answer to the feature request that started this project
(blade-build#997): Blade already knows every compile command, so the most
accurate IntelliSense comes from handing those commands to clangd rather than
re-deriving them. The extension just makes that one-click.
