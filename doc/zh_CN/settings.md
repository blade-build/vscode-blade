# 配置项

| 配置 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `blade.executable` | string | `blade` | blade 可执行文件路径。 |
| `blade.jobs` | number | `0` | 并行构建任务数（`-j`）。`0` 表示让 blade 自动检测 CPU 数。 |
| `blade.commandPrefix` | string[] | `[]` | 在每条 blade 命令前追加的标记（如 `bear`、包装脚本或环境准备）。 |
| `blade.buildArgs` | string[] | `[]` | 传给 `blade build` 的额外选项（如 `["-p", "debug"]`、`["--verbose"]`）。 |
| `blade.testArgs` | string[] | `[]` | 传给 `blade test` 的额外选项（如 `["--full-test"]`、`["--coverage"]`）。 |
| `blade.runArgs` | string[] | `[]` | 传给 `blade run` 的额外选项（如 `["-p", "release"]`）。 |
| `blade.environment` | object | `{}` | blade 任务的额外环境变量。 |
| `blade.generateCompdbOnRefresh` | boolean | `true` | 每次刷新目标时重新生成 `compile_commands.json`。 |
| `blade.recommendClangd` | boolean | `true` | 生成编译数据库时建议安装 clangd 扩展。 |

!!! note
    **构建配置**（`release` / `debug`，以 `-p <profile>` 注入）不是配置项，而是
    目标视图标题栏中的切换开关，按工作区记忆。参见
    [使用](usage.md#构建配置)。

## 示例

使用包装脚本在容器内或借助工具链垫片运行 blade：

```json
{
  "blade.commandPrefix": ["scripts/in-docker.sh"]
}
```

固定并行任务数而非自动检测：

```json
{
  "blade.jobs": 16
}
```
