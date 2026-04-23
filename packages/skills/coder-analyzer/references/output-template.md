# 输出文档模板

## 标准 Obsidian 输出格式

```markdown
### API 分析: [API Name]
- **文件路径**: `[Source Path]`
- **功能描述**: [简短描述]

### 业务流程图
\`\`\`mermaid
[Mermaid 流程图代码]
\`\`\`

### 核心逻辑说明
- **Step 1**: [说明及关键代码片段]
  ```go
  // 代码示例
  ```
- **Step 2**: [说明及关键代码片段]

### 💡 实现亮点与潜在风险
- **亮点**: [描述]
- **风险**: [描述]
```

## Mermaid 图表类型选择

### 1. 时序图 (sequenceDiagram)
适用场景：
- 多个服务/模块之间的调用关系
- 有明确的时间顺序
- 需要展示请求-响应流程

示例：
```mermaid
sequenceDiagram
    participant Client
    participant Service
    participant DAO
    participant DB

    Client->>Service: CreateTask(request)
    Service->>Service: 参数校验
    Service->>DAO: CreateTask()
    DAO->>DB: INSERT
    DB-->>DAO: Success
    DAO-->>Service: TaskID
    Service-->>Client: Response
```

### 2. 流程图 (flowchart)
适用场景：
- 条件分支逻辑
- 并行处理
- 循环结构
- 单个服务内部逻辑

示例：
```mermaid
flowchart TD
    A[开始] --> B{参数校验}
    B -->|失败| C[返回错误]
    B -->|成功| D[创建任务]
    D --> E{是否成功}
    E -->|失败| F[回滚操作]
    E -->|成功| G[返回结果]
```

### 3. 状态图 (stateDiagram)
适用场景：
- 状态流转分析
- 生命周期展示

示例：
```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing: 开始处理
    Processing --> Completed: 成功
    Processing --> Failed: 失败
    Completed --> [*]
    Failed --> [*]
```

## 代码片段引用格式

```go
// 文件路径: service/odd/odd.go:271
func (s *OddService) CreateOddTask(ctx context.Context, req *CreateOddTaskRequest) error {
    // 核心逻辑
}
```

使用 `file_path:line_number` 格式便于定位。
