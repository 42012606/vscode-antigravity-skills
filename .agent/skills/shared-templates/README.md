# [Project Name] - [中文系统名称]

> **🛡️ Meta Info**
> - **版本**: V[x.y.z]
> - **状态**: [Dev/Test/Prod]
> - **最后更新**: [YYYY-MM-DD]
> - **文档指引**: 
>   - 快速理解架构与红线 -> 参阅 [docs/meta/AI_MAP.md](docs/meta/AI_MAP.md)
>   - 历史决策与变更 -> 参阅 [docs/meta/DECISION_LOG.md](docs/meta/DECISION_LOG.md)

## 1. 📖 系统全景 (System Overview)
*[一句话描述核心职责]*
* **核心价值**: [例如：数据清洗 / 自动化]
* **技术策略**: [例如：ETL / 强事务]
* **解决痛点**: [例如：防止脏数据 / 解决并发]

## 2. 🏗️ 核心架构与逻辑流转 (Architecture & Logic)
*本章节描述系统"正常情况"下的模块职责与数据流向。*

### Phase 1: [Layer Name] (e.g., ETL / Loader)
* **控制器**: `[Filename]`
* **核心逻辑**:
    1. **Action A**: [描述]
    2. **Action B**: [描述]

### Phase 2: [Layer Name] (e.g., Logic / Router)
* **控制器**: `[Filename]`
* **核心逻辑**:
    1. **Action A**: [描述]
    2. **Action B**: [描述]

### Phase 3: [Layer Name] (e.g., Execution / SP)
* **控制器**: `[Filename]`
* **核心逻辑**:
    1. **Action A**: [描述]
    2. **Action B**: [描述]

## 3. 💾 数据库对象字典 (Data Dictionary)
| 对象名 | 类型 | 用途 | 关键字段/状态说明 |
| :--- | :--- | :--- | :--- |
| `[Name]` | Table | [描述] | `[Key_Field]` |
| `[Name]` | SP | [描述] | 入参: `[Params]` |

## 4. 🚦 运维风险地图与排查 (Ops Risks & Troubleshooting)
*本章节汇总系统潜在风险点与常见故障处理方案。*

### 4.1 关键风险点 (Critical Risks)
* **[模块名]**: 🚨 [描述风险，例如：参数截断 / 缺少事务]
* **[模块名]**: 🛡️ [描述防御机制，例如：强制校验 PO]

### 4.2 常见故障排查 (Troubleshooting)
#### 场景 A: [现象描述]
* **原因**: [描述]
* **解决**: 
    1. [步骤 1]
    2. [步骤 2]

#### 场景 B: [现象描述]
* **原因**: [描述]
* **解决**: [方案]

## 5. ⚡ 部署与环境依赖 (Deployment)
1. **路径**: `[Path]`
2. **依赖**: [Dependency]
3. **配置**: [Config]
