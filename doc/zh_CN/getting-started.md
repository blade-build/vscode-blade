# 快速开始

## 前置条件

- 已安装 [Blade](https://github.com/blade-build/blade-build) 并位于 `PATH` 中。
  若安装在别处，请设置 `blade.executable`。
- 工作区目录中（自身或其上层）存在 `BLADE_ROOT` 文件。

## 安装

从 VS Code 应用市场安装 **Blade**，或从 `.vsix` 安装：

```sh
code --install-extension vscode-blade.vsix
```

## 首次使用

1. 打开一个 Blade 工作区。当存在 `BLADE_ROOT` 时扩展会激活，活动栏中出现
   **Blade** 视图。
2. 目标通过 `blade dump --targets` 加载。可随时点击视图上的刷新图标执行
   **Blade: Refresh Targets** 重新加载。
3. 在浏览器中点击某个目标将其设为 **活动目标**，或从状态栏控件中选择；然后使用
   状态栏的 **构建 / 运行 / 测试** 按钮。
4. 如需 C/C++ 智能感知，执行 **Blade: Generate compile_commands.json**，并在提示
   时安装 [clangd](intellisense.md)。

## 工作区检测

扩展会在每个工作区目录自身或其上层查找 `BLADE_ROOT`；若未找到，则在工作区内
搜索。支持多根工作区 —— 以第一个发现的根作为主根。
