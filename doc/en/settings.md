# Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `blade.executable` | string | `blade` | Path to the blade executable. |
| `blade.jobs` | number | `0` | Parallel build jobs (`-j`). `0` lets blade auto-detect the number of CPUs. |
| `blade.commandPrefix` | string[] | `[]` | Tokens prepended to every blade command (e.g. `bear`, a wrapper script, or environment setup). |
| `blade.buildArgs` | string[] | `[]` | Extra options passed to `blade build` (e.g. `["-p", "debug"]`, `["--verbose"]`). |
| `blade.testArgs` | string[] | `[]` | Extra options passed to `blade test` (e.g. `["--full-test"]`, `["--coverage"]`). |
| `blade.runArgs` | string[] | `[]` | Extra options passed to `blade run` (e.g. `["-p", "release"]`). |
| `blade.environment` | object | `{}` | Extra environment variables for blade tasks. |
| `blade.generateCompdbOnRefresh` | boolean | `true` | Regenerate `compile_commands.json` whenever targets are refreshed. |
| `blade.recommendClangd` | boolean | `true` | Suggest installing the clangd extension when a compilation database is generated. |

!!! note
    The **build profile** (`release` / `debug`, injected as `-p <profile>`) is
    not a setting — it is a toggle in the targets view title, remembered per
    workspace. See [Usage](usage.md#build-profile).

## Examples

Use a wrapper to run blade inside a container or with a toolchain shim:

```json
{
  "blade.commandPrefix": ["scripts/in-docker.sh"]
}
```

Pin a specific job count instead of auto-detection:

```json
{
  "blade.jobs": 16
}
```
