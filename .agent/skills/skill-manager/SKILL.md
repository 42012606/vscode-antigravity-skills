---
name: skill-manager
description: 对话驱动的 Skills/Rules 库管理器，一句话部署到当前项目。
---

# Skill: Skill Manager

> **用途**: 通过对话管理你的 Skills/Rules 库，一键部署到当前项目。

---

## 0. 入口触发

当用户输入以下任意关键词时，**立即启动**：

- `打开agent库` / `打开我的库` / `sk库`
- `加载skill` / `加载rules`
- `导入技能`

---

## 1. 启动向导

AI 读取 `C:\Users\陈旭洋\Desktop\MySkills` 目录（用户的 Skills 库），然后输出：

```
🗂️ **Skill Manager**

检测到你的技能库：`C:\Users\陈旭洋\Desktop\MySkills`

📦 **可用 Skills**
1. [project-sop] 项目SOP管理器 - 项目全生命周期开发流程
2. [project-refactor] 代码重构器 - 扫描项目结构、收纳测试

📜 **可用 Rules**
3. [global-core] 全局核心规则 - 语言铁律、KISS、事实为本
4. [dev-flow] 开发流规则 - 渐进式开发、5+1 文档架构

当前工作区：`{当前项目路径}`

请输入编号选择（多选用逗号分隔，如 `1,3`），或输入 `all` 全选：
```

---

## 2. 用户选择后

AI 解析用户输入，确认选择：

```
✅ 确认部署：
- [Skill] project-sop → .agent/skills/project-sop/
- [Rule] global-core → .gemini/global-core.md

确认部署到 `{当前项目路径}`？(y/n)
```

---

## 3. 执行部署

用户确认后，AI **自动执行**以下命令：

### Skills (使用 Junction)
```powershell
New-Item -ItemType Directory -Force -Path "{目标}\.agent\skills" | Out-Null
cmd /c mklink /J "{目标}\.agent\skills\{skill_id}" "C:\Users\陈旭洋\Desktop\MySkills\.agent\skills\{skill_id}"
```

### Rules (使用 Copy)
```powershell
New-Item -ItemType Directory -Force -Path "{目标}\.gemini" | Out-Null
Copy-Item "C:\Users\陈旭洋\Desktop\MySkills\.gemini\rules\{rule_id}.md" "{目标}\.gemini\{rule_id}.md"
```

---

## 4. 完成报告

部署完成后输出：

```
🎉 **部署完成！**

已安装：
- ✅ .agent/skills/project-sop/ (Junction)
- ✅ .gemini/global-core.md (Copy)

现在可以使用了！输入 `开始` 试试 project-sop。
```

---

## 5. 配置

Skills 库路径（可在此处修改）：
```
SKILLS_LIB = C:\Users\陈旭洋\Desktop\MySkills
```

---

## 6. 核心原则

1. **纯对话交互**: 无需打开浏览器或手动执行命令
2. **自动检测当前项目**: 使用当前工作区路径
3. **Junction 优先**: Skills 使用链接保持同步，Rules 复制避免污染
