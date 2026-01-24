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

2. **版本号**: 检查 `package.json` 中的 `version`，如需升级请修改版本号。

## 📦 打包与发布（半自动流程）

执行以下步骤后，向用户汇报结果：

1. **生成 VSIX 包**:
   // turbo
   `npx vsce package`

2. **Git 提交并推送**:
   // turbo
   `git add -A; git commit -m "feat: v<version> <简短描述>"; git push origin main`

3. **发布到 Open VSX**（使用 private-credentials 中的 token）:
   // turbo
   `npx ovsx publish <vsix文件名> -p <Open_VSX_Token>`

4. **汇报结果**: 向用户展示以下信息：
   - ✅ 当前版本号: `<version>`
   - ✅ GitHub 已推送
   - ✅ Open VSX 已发布
   - ⏳ **微软市场需手动上传**: [Marketplace 管理页](https://marketplace.visualstudio.com/manage/publishers/42012606)
   - 📂 VSIX 文件位置: `<项目目录>/<vsix文件名>`

## 📚 凭据位置

Token 存放在 `private-credentials` skill 中：
- **Open VSX Token**: 用于自动发布到 Open VSX
- **微软市场**: 无 PAT，需手动上传 VSIX

---

> [!TIP]
> 发布完成后，记得刷新浏览器查看 Open VSX 上的更新！
