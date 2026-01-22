---
name: vscode-publish
description: VS Code 扩展发布全流程助手，支持打包校验、市场发布和 GitHub 管理。
---

# VS Code 扩展发布助手 (vscode-publish)

本 Skill 用于引导并协助开发者将 VS Code 扩展发布至官方市场 (Marketplace) 和 GitHub。

## 🛠️ 发布前校验 (Pre-release Checks)

1. **编译代码**: 确保 TypeScript 编译通过且无 lint 错误。
   // turbo
   `npm run compile`

2. **版本与发布者**: 检查 `package.json` 中的 `version` 和 `publisher`。
   > [!IMPORTANT]
   > 如果这是首次发布，请确保已在 [Marketplace 管理页](https://marketplace.visualstudio.com/manage) 创建了发布者。

3. **依赖检查**: 确保 `out/` 文件夹已生成且包含最新的代码。

## 📦 打包与测试

1. **生成 VSIX 包**:
   // turbo
   `npx vsce package`

2. **本地安装测试**:
   你可以将生成的 `.vsix` 文件直接拖入 VS Code 进行安装，验证功能是否符合预期。

## 🚀 发布流程

### A. 市场发布 (Marketplace)

1. **登录发布者**:
   你需要从 Azure DevOps 获得 Personal Access Token (PAT)。
   `npx vsce login <publisher_id>`

2. **正式发布**:
   // turbo
   `npx vsce publish`

### B. GitHub 发布

1. **打标签并同步**:
   `git tag v<version>`
   `git push origin v<version>`

2. **创建 GitHub Release**:
   在仓库页面将生成的 `.vsix` 作为附件上传。

---

## 📣 推广与社交

1. **命名一致性**: 确保 `package.json` 中的 `displayName` 与 GitHub 仓库名逻辑一致，方便用户搜索。
2. **点星 (Star)**: 检查 `README.md` 中已有 GitHub Star 徽章和链接。
3. **赞助 (Sponsor)**: 检查 `README.md` 中是否已添加 "Buy Me A Coffee" 或其他赞助链接。
   > [!TIP]
   > 记得将 `README.md` 中的占位链接（如 `yourusername`）替换为你真实的个人链接。

---

## 📚 常见问题

- **PAT 过期**: 如果发布失败并提示权限问题，请检查 Azure DevOps 上的 PAT 是否过期或权限不足（必须具有 Marketplace: Manage 权限）。
- **Read-only 模式**: `vsce package` 时如果报错，请检查文件是否被占用。
