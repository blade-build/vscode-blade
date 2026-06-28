# Blade for Visual Studio Code

为 [Blade](https://github.com/blade-build/blade-build) 构建系统提供的官方 Visual
Studio Code 扩展。

本扩展让 VS Code 成为 Blade 项目的舒适开发环境：

- 带行内 构建 / 运行 / 测试 / 调试 的 **目标浏览器**；
- 通过 VS Code Tasks API 的 **构建、运行、测试、清理**（错误可点击跳转，构建失败
  不会误运行旧产物）；
- **BUILD 文件语言特性** —— 高亮、大纲、对依赖标签的跳转到定义、补全、悬停与诊断；
- 借助 `compile_commands.json` 与 clangd 的 **C/C++ 智能感知**。

## 设计原则

Blade 始终是事实来源。目标信息读取自 `blade dump --targets`，依赖图来自
`blade query`，而非扫描 BUILD 文件。因此每一种规则（C++、Java、Scala、Python、
proto……）都能被准确理解，并能随 Blade 演进而保持正确。

## 后续阅读

- [快速开始](getting-started.md)
- [使用](usage.md)
- [BUILD 语言特性](build-language.md)
- [C/C++ 智能感知](intellisense.md)
- [配置项](settings.md)
