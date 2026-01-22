---
name: project-refactor
description: 项目重构工具，扫描代码库生成文档流，收纳测试脚本。
---

# Skill: Project Refactor

> **用途**: 将混乱的旧项目重构为标准 5+1 结构。
> **频率**: 一次性使用或季度审计。

---

## 0. 入口触发

当用户输入以下任意关键词时，**立即启动重构向导**：

- `重构` / `refactor`
- `整理项目` / `清理`

---

## 1. 向导流程

### Step 1: 启动确认

AI 必须发送：

```
🔧 **项目重构向导**

即将执行以下操作：
1. 扫描项目结构 (文件树 + 代码模块)
2. AI 阅读核心代码，理解业务逻辑
3. 生成 5+1 标准文档
4. 收纳测试脚本到 tests/ 目录
5. 可选：删除无用文件

⚠️ 此操作会修改文件结构，建议先 Git commit 备份。

确认开始？(y/n)
```

---

### Step 2: 扫描项目

用户确认后，执行：

```bash
python .agent/skills/project-refactor/scripts/refactor_engine.py --mode scan
```

**脚本输出**：
```
📊 **项目扫描报告**

1. 目录结构:
   - src/ (25 files)
   - tests/ (0 files) ⚠️ 空目录
   - root/ (8 files) ⚠️ 发现测试脚本

2. 发现的测试脚本:
   - test_api.py (根目录)
   - temp_test.py (根目录)
   - debug.py (src/)

3. 文档状态:
   - README.md ✅ 存在
   - docs/meta/ ❌ 不存在
```

---

### Step 3: AI 阅读代码

AI 主动阅读核心代码文件，理解：
- 技术栈
- 模块职责
- 核心数据流

然后生成 `00_CONTEXT.md` 和 `02_ARCHITECTURE.md` 草稿。

---

### Step 4: 生成文档

执行：

```bash
python .agent/skills/project-refactor/scripts/refactor_engine.py --mode docs
```

**行为**：
1. 创建 `docs/meta/` 目录
2. 生成 5+1 标准文件
3. 将 AI 分析结果写入 `00_CONTEXT.md`

---

### Step 5: 收纳测试脚本

执行：

```bash
python .agent/skills/project-refactor/scripts/refactor_engine.py --mode tidy
```

**规则**：
| 匹配模式 | 目标位置 |
|:---|:---|
| `test_*.py` | 移动到 `tests/` |
| `*_test.py` | 移动到 `tests/` |
| `temp*.py` | 移动到 `tests/_temp/` |
| `debug*.py` | 移动到 `tests/_debug/` |

---

### Step 6: 完成

AI 输出：

```
✅ **重构完成！**

已执行：
1. 创建 docs/meta/ + 5+1 文件
2. 移动 3 个测试脚本到 tests/
3. 生成项目上下文文档

建议下一步：
- 运行 `project-sop` 的 `op init` 刷新架构地图
- 检查 tests/ 目录内容
```

---

## 2. 脚本调用

| 模式 | 命令 | 说明 |
|:---|:---|:---|
| scan | `python .../refactor_engine.py --mode scan` | 扫描项目结构 |
| docs | `python .../refactor_engine.py --mode docs` | 生成文档 |
| tidy | `python .../refactor_engine.py --mode tidy` | 收纳测试脚本 |
| all | `python .../refactor_engine.py --mode all` | 一键执行全部 |

---

## 3. 错误处理

- 所有文件操作前检查目标是否存在
- 移动/删除失败时中断并报错
- 生成详细日志到 `docs/meta/.refactor_log`

---

## 4. 与 project-sop 联动

重构完成后，提示用户：

```
重构完成！建议运行 `开始` 进入 project-sop 初始化文档架构。
```
