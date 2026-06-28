# Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `blade.executable` | string | `blade` | Path to the blade executable. |
| `blade.jobs` | number | `0` | Parallel build jobs (`-j`). `0` lets blade auto-detect the number of CPUs. |
| `blade.commandPrefix` | string[] | `[]` | Tokens prepended to every blade command (e.g. `bear`, a wrapper script, or environment setup). |
| `blade.environment` | object | `{}` | Extra environment variables for blade tasks. |
| `blade.buildBeforeRun` | boolean | `true` | Build a target before running it. |
| `blade.generateCompdbOnRefresh` | boolean | `true` | Regenerate `compile_commands.json` whenever targets are refreshed. |
| `blade.recommendClangd` | boolean | `true` | Suggest installing the clangd extension when a compilation database is generated. |

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
