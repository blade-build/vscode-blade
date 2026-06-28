# C/C++ 智能感知

Blade 能生成
[编译数据库](https://clang.llvm.org/docs/JSONCompilationDatabase.html)
（`compile_commands.json`），精确描述每个翻译单元的编译方式。配合
[clangd](https://clangd.llvm.org/)，即可获得准确的 C/C++ 补全、跳转到定义与诊断
（包括跨生成头文件），无需任何手动的 include 配置。

## 生成数据库

执行 **Blade: Generate compile_commands.json**（或在启用
`blade.generateCompdbOnRefresh` 时随刷新自动进行）。它会在工作区根目录运行：

```sh
blade dump --compdb --to-file compile_commands.json
```

## 使用 clangd

生成数据库后，若未安装 clangd 扩展，本扩展会提示安装。安装后，clangd 会自动
识别 `compile_commands.json`。

!!! tip
    clangd 与微软的 C/C++ 扩展都会提供智能感知；同时启用会导致诊断重复。使用
    clangd 时请关闭 C/C++ 扩展的智能感知（或禁用该扩展）。

## 为什么用编译数据库而非语言服务器？

这正是催生本项目的需求（blade-build#997）最初的答案：Blade 已经知道每一条编译
命令，因此把这些命令交给 clangd 比重新推导能得到最准确的智能感知。扩展只是让这
一步变成一键完成。
