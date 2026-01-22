# [Project Name] AI Architecture Map

> **🗺️ Context**: 本文件用于描述系统核心数据流向与架构约束。
> **🤖 AI Prompt**: 阅读代码前请先读取此文件，确保理解数据流转逻辑与开发红线。

## 1. 🏗️ Tech Stack & Patterns (技术栈)
- **Core**: [Language/Framework]
- **Data**: [Database Type]
- **Key Pattern**: [e.g., ETL Pipeline / MVC / Event-Driven]

## 2. 🌊 Data Pipeline (数据流全景图)

```text
[Source: [Upstream/User Input]]
       |
       v
[Layer 1: [Module Name]] -> [File/Class]
       |
       | 1. **Validate**: [关键校验逻辑]
       | 2. **Transform**: [数据清洗/转换逻辑]
       | 3. **State**: [状态变更, e.g., Status='Pending']
       |
       v
[Layer 2: [Module Name]] -> [File/Class]
       |
       | 1. **Logic**: [核心业务逻辑]
       | 2. **Draft**: [写入临时表/缓存]
       |
       v
[Layer 3: Execution/Storage] -> [File/DB Object]
       |
       | 1. **Commit**: [最终事务提交]
       | 2. **Sync**: [外部系统同步]
```

## 3. 💾 Key Objects (核心对象)
| 对象名 | 类型 | 职责 | 关键字段/状态 |
| :--- | :--- | :--- | :--- |
| `[Name]` | Table | [描述] | `status` (0=New, 1=Done) |
| `[Name]` | API/SP | [描述] | [Input/Output] |

## 4. ⚡ Rules & Constraints (开发守则)
1.  **并发控制**: [例如: 涉及库存扣减必须开启事务或使用行锁]
2.  **数据一致性**: [例如: 主子表必须同步写入，禁止孤儿数据]
3.  **安全红线**: [例如: 禁止在前端直接拼接 SQL]
4.  **特殊处理**: [例如: 调用 SAP 接口时必须记录原始报文]
