---
name: project-sop
description: 项目全生命周期管理工具，实现 AI 主动推动的 SOP 开发流程。
---

# Skill: Project SOP

> **核心理念**: AI 是流程引擎，主动推动 SOP，用户只需回答问题。

---

## 0. 入口触发 (Entry Point)

当用户输入以下任意关键词时，**立即启动向导模式**：

- `开始` / `start` / `op`
- `新任务` / `开发` / `修复`

### 启动向导

AI 必须发送以下询问并**挂起等待**：

```
🚀 **SOP 向导已启动**

请选择模式：
1. **[Init]** 新项目初始化 (创建文档结构)
2. **[New]** 创建新需求 (从 0 到 1, 方案研磨)
3. **[Dev]** 开发已有任务 (从 1 到 N, 迭代开发)
4. **[Fix]** 修复问题 (Bug 修复)

请输入数字或关键词：
```

---

## 1. 分支路由 (Mode Router)

### [Init] 初始化模式

**触发**: 用户选择 1 或 "Init"

**AI 行为**:
1. 执行 `python .agent/skills/project-sop/scripts/ops_engine.py --mode init`
2. 完成后提示："初始化完成！输入 `开始` 创建第一个任务。"

---

### [New] 新需求模式 (对应 SOP-1)

**触发**: 用户选择 2 或 "New"

**AI 行为 (交互式收集)**:

```
📋 **需求诊断模式**

请提供以下信息：
1. **需求背景**: 为什么要做这个？(痛点/动因)
2. **核心目标**: 要达到什么效果？
3. **技术约束**: 有无特殊限制？(可选)

请逐一回答或一次性提供：
```

**收集完成后**:
1. 输出 **方案草稿** (业务层 + 技术层)
2. 阻断等待："方案是否确认？回复 `确认` 继续，或提出修改意见。"
3. 确认后 → 自动进入 **[Dev] 开发模式**

---

### [Dev] 开发模式 (对应 SOP-2)

**触发**: 用户选择 3 或 "Dev"，或从 [New] 模式流转

**Step 1: 环境检查**

```
🔍 **开发前检查**

请确认：
1. **项目状态**: 未上线 / 已上线？
2. **任务描述**: 一句话描述？
3. **影响模块**: 涉及哪些文件/模块？

请回答：
```

**Step 2: 备份与分支**

收集完成后 AI 说：
```
确认信息：
- 类型: feat
- 描述: xxx
- 分支: feat/20260122-xxx

准备创建分支并开始开发，确认？
```

用户确认 → 执行 `--mode start` → AI 输出：

```
✅ 分支已创建，任务令牌已写入。

请描述具体需求，我将输出实施方案。
或输入 `op plan` 生成方案。
```

**Step 3: 方案输出**

AI 分析需求后输出方案，阻断等待确认。

**Step 4: 编码实施**

方案确认后 AI 开始编码。完成后：

```
✅ 编码完成。

请运行测试，回复：
- `Pass` 测试通过
- 或粘贴报错信息
```

**Step 5: 完成闭环**

测试通过后：

```
🎉 测试通过！

准备完成任务：
1. 更新 01_TASKS.md
2. 追加 03_CHANGELOG.md
3. 合并分支到 main
4. 推送并删除分支

是否需要更新 00_CONTEXT.md 或 README？(y/n)
```

用户确认 → 执行 `--mode done`

---

### [Fix] 修复模式

**触发**: 用户选择 4 或 "Fix"

**与 [Dev] 类似**，但分支前缀为 `fix/`

---

## 2. 状态持久化

所有变量写入 `docs/meta/.sop_state`：

```
STATE|分支名|时间戳|任务描述|项目状态|任务类型
```

AI 在每次对话开始时读取此文件恢复上下文。

---

## 3. 脚本调用

| 模式 | 命令 |
|:---|:---|
| init | `python .agent/skills/project-sop/scripts/sop_engine.py --mode init` |
| start | `python .agent/skills/project-sop/scripts/sop_engine.py --mode start --content "描述"` |
| log | `python .agent/skills/project-sop/scripts/sop_engine.py --mode log --content "内容"` |
| done | `python .agent/skills/project-sop/scripts/sop_engine.py --mode done --content "描述"` |

---

## 4. 核心原则

1. **AI 主动推动**: 每个阶段结束时 AI 必须提示下一步
2. **用户只需回答**: 不需要记忆任何指令
3. **变量持久化**: 防止上下文丢失
4. **先问后做**: 收集完信息再执行，不猜测

---

## 5. 文档架构 (5+1 Standard)

| 文件 | 职责 |
|:---|:---|
| `00_CONTEXT.md` | AI 快速索引 |
| `01_TASKS.md` | 任务令牌 |
| `02_ARCHITECTURE.md` | 文件树 |
| `03_CHANGELOG.md` | 变更日志 |
| `04_MEMO.md` | 草稿本 |
| `README.md` | 项目门户 |
