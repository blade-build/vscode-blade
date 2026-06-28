# 开发文档

## 前置条件

- Node.js 20+
- VS Code

## 准备

```sh
npm install
```

## 常用脚本

| 脚本 | 作用 |
| --- | --- |
| `npm run compile` | 用 esbuild 打包扩展（`dist/extension.js`）。 |
| `npm run watch` | 变更时重新构建。 |
| `npm run check-types` | 用 `tsc --noEmit` 做类型检查。 |
| `npm run lint` | 用 ESLint 检查 `src`。 |
| `npm test` | 在 VS Code 宿主中编译并运行集成测试。 |
| `npm run package` | 生产打包（供 `vsce` 使用）。 |

## 运行扩展

按 <kbd>F5</kbd> 启动加载了本扩展的扩展开发宿主（Extension Development Host），
在该窗口中打开一个 Blade 工作区。

## 架构

扩展从不为获取语义信息而解析 BUILD 文件 —— Blade 才是事实来源：

- `blade.ts` —— 运行 blade（`dump --targets`、`dump --compdb`）。
- `targetModel.ts` —— 缓存目标列表，监听 BUILD/BLADE_ROOT 文件。
- `tasks.ts` —— 构建/运行/测试/清理的 Tasks API 集成。
- `tree.ts`、`statusBar.ts`、`activeTarget.ts` —— 界面与选择状态。
- `language/` —— BUILD 文件的大纲、导航、补全、悬停与诊断（轻量解析，而非完整的
  Python 解析）。

## 测试与 CI

测试通过 `@vscode/test-cli` 在真实 VS Code 宿主中运行。CI
（`.github/workflows/ci.yml`）在 Linux/macOS/Windows 上做类型检查、lint、打包并
运行测试，然后产出 `.vsix` 制品。
