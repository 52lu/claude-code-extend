# 使用示例

## 示例 1: 分析 CreateOddTask 函数

**用户输入**：
```
使用 code-logic-analyzer 分析 service/odd/odd.go 第 271 行的 CreateOddTask 函数
关注点：创建前的校验逻辑、状态流转、异常处理
输出到：/Users/horizon/Documents/notes/createTask.md
```

**技能会自动**：
1. 读取 service/odd/odd.go 文件并定位到第 271 行
2. 递归扫描所有调用的内部函数（最多 5 层深度）
3. 提取校验逻辑、状态流转、异常处理相关代码片段
4. 生成 Mermaid 时序图展示调用链路
5. 输出符合 Obsidian 格式的 Markdown 文档

## 示例 2: 快速分析

**用户输入**：
```
分析 logic/odd/odd_label.go 的 LabelData 函数
```

**输出示例**：
```markdown
### API 分析: LabelData
- **文件路径**: `logic/odd/odd_label.go:45`
- **功能描述**: 标注数据

### 业务流程图
\`\`\`mermaid
sequenceDiagram
    Service->>Logic: LabelData
    Logic->>DAO: GetTask
    Logic->>DAO: UpdateLabel
    DAO->>DB: UPDATE
\`\`\`

### 核心逻辑说明
- **Step 1**: 获取任务信息
- **Step 2**: 验证标注权限
- **Step 3**: 更新标注数据

### 💡 实现亮点与潜在风险
- **亮点**: 使用事务保证原子性
- **风险**: 需要注意并发更新冲突
```

## 示例 3: 深度分析

**用户输入**：
```
深度分析 dao/task/task.go 的 CreateTask 方法，包含 4 层调用深度
```

**技能会**：
- 使用 Level 2 分析深度
- 包含主流程 + 4 层子调用
- 提供完整代码片段和详细注释
