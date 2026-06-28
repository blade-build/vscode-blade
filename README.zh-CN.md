# Blade for Visual Studio Code

为 [Blade](https://github.com/blade-build/blade-build) 构建系统提供的官方 Visual
Studio Code 扩展。

*[English](README.md) · [文档](https://blade-build.github.io/)*

## 功能

- **目标浏览器** —— 列出工作区内的所有目标，按包分组，并提供
  **构建 / 运行 / 测试 / 调试** 的行内操作。
- **构建、运行、测试、清理** —— 可从状态栏、命令面板或目标浏览器触发，全部通过
  VS Code 的 **Tasks API** 执行：编译错误会出现在“问题”面板中，构建失败时也不会
  再误运行旧的可执行文件。
- **BUILD 文件语言支持** —— 语法高亮、目标大纲、对依赖标签
  （`//path:name`、`:name`）的 **跳转到定义**、规则类型 / 属性 / 依赖标签补全、
  悬停信息，以及对无法解析到已知目标的依赖给出告警。
- **C/C++ 智能感知** —— 一键生成 `compile_commands.json`
  （`blade dump --compdb`），配合 [clangd](https://clangd.llvm.org/) 使用。

目标信息始终来自 Blade 本身（`blade dump --targets`），而非靠扫描 BUILD 文件，
因此能准确理解每一种规则（C++、Java、Scala、Python、proto……）。

## 前置条件

- 已安装 [Blade](https://github.com/blade-build/blade-build) 并位于 `PATH` 中
  （或设置 `blade.executable`）。
- 工作区中存在 `BLADE_ROOT` 文件。

## 快速开始

1. 打开一个 Blade 工作区（包含 `BLADE_ROOT` 的目录）。
2. 活动栏中会出现 **Blade** 视图，展示你的目标。
3. 在状态栏选择活动目标，然后 **构建** / **运行** / **测试**。
4. 执行 **Blade: Generate compile_commands.json** 并安装 clangd 以获得 C/C++
   智能感知。

## 配置项

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `blade.executable` | `blade` | blade 可执行文件路径。 |
| `blade.jobs` | `0` | 并行任务数（`-j`）；`0` 表示让 blade 自动检测 CPU 数。 |
| `blade.commandPrefix` | `[]` | 在每条 blade 命令前追加的标记（例如包装脚本）。 |
| `blade.environment` | `{}` | blade 任务的额外环境变量。 |
| `blade.buildBeforeRun` | `true` | 运行目标前先构建。 |
| `blade.generateCompdbOnRefresh` | `true` | 刷新时重新生成 `compile_commands.json`。 |
| `blade.recommendClangd` | `true` | 建议安装 clangd 以获得 C/C++ 智能感知。 |

## 命令

`Blade: Refresh Targets`、`Select Active Target`、`Build / Run / Test Active
Target`、`Clean`、`Generate compile_commands.json`。

## 致谢

本扩展受社区扩展
[`dhwang.blade`](https://marketplace.visualstudio.com/items?itemName=dhwang.blade)
（作者 [@wangdh15](https://github.com/wangdh15)，MIT 许可）的启发，并作为其后继。
这是一次全新（clean-room）的重写，详见 [NOTICE](NOTICE)。

## 许可证

[MIT](LICENSE)
