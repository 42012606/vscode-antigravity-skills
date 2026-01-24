---
description: 规范开发工作流、文件洁癖、文档架构 (5+1) 及代码分层架构守则。
trigger: always_on
---
# 🛠️ DEV FLOW (开发流规则)

## 1. 开发工作流 (Development Workflow)
* **渐进式开发**: 严禁上来就写代码。必须通过多轮对话迭代（"Q&A Loop"），厘清所有疑点后方可动手。
* **结构化流程**: 严格遵循 SOP 顺序：**构思方案 (Plan) → 提请审核 (Review) → 分解任务 (Task) → 执行 (Act)**。

## 2. 环境洁癖 (File Hygiene)
* **测试收纳**: 所有测试代码必须存放在 `tests/` 目录下。
    * 允许创建子目录结构，例如 `tests/login_module/test_api.py`。
    * **严禁** 创建 `temp/` 或在根目录直接存放测试脚本。
* **禁止乱建**: 严禁在未经允许的情况下创建新的 Markdown 文档。

## 3. 文档架构 (The 5+1 Standard)
* **门面 (Root)**: `README.md` (位于项目根目录，仅用于项目简介与快速导航)。
* **大脑 (Context)**: 所有项目上下文必须维护在 `docs/meta/` 目录中：
    * `00_CONTEXT.md`: AI 快速索引页 (技术栈 + 架构快照 + 开发红线)。
    * `01_TASKS.md`: 任务令牌列表 (当前焦点 + 进行中)。
    * `02_ARCHITECTURE.md`: 系统架构图与文件映射。
    * `03_CHANGELOG.md`: 详细的变更日志与决策记录。
    * `04_MEMO.md`: 临时草稿与思维碎片 (定期清空)。
* **扩展区 (docs/)**: `docs/` 根目录可存放用户自定义的重要文档，不强制归类。

## 4. 代码架构守则 (Code Architecture Rules)

### 4.1 关注点分离 (Separation of Concerns)
* **视图层 (View/UI)**: 严禁包含业务逻辑或数据库访问代码。
* **业务层 (Service/Logic)**: 严禁直接依赖框架或 UI 组件；必须是纯函数或纯类。
* **数据层 (Repository/DAO)**: 严禁出现业务规则判断；只做数据读写。
* **禁止跨层调用**: View 不能直接调用 DAO，必须经过 Service。

### 4.2 模块化原则 (Modularity)
* **目录即边界**: 每个功能模块必须有独立目录 (e.g., `src/modules/inventory/`)。
* **禁止乱建文件**: 新增代码文件前，必须确认其所属模块目录。若无合适目录，需先沟通是否新建模块。
* **单一入口**: 每个模块对外暴露的接口应通过 `index.ts` / `__init__.py` 统一导出。
* **依赖方向**: 公共模块 (`common/utils`) 不得依赖业务模块 (`modules/xxx`)。
