# Task Specification Format

将 PRD 拆解为 JSON 实现任务的完整格式规范。SKILL.md 的 Phase 5 引用此文件。

## Root Task List

保存路径：`PROJECT_ROOT/.agent/tasks.json`

```json
[
  {
    "id": "TASK-1",
    "title": "Verify project prerequisites and access",
    "category": "setup",
    "specFilePath": ".agent/tasks/TASK-1.json",
    "passes": false
  }
]
```

字段：`id`（TASK-${ID}）、`title`、`category`、`specFilePath`、`passes`（初始 false）

## Individual Task Spec

保存路径：`PROJECT_ROOT/.agent/tasks/TASK-${ID}.json`

```json
{
  "id": "TASK-${ID}",
  "title": "简要标题",
  "category": "category-name",
  "description": "详细规格：预期行为、用户流程、输出",
  "acceptanceCriteria": [
    "具体、可验证的完成条件"
  ],
  "steps": [
    {
      "step": 1,
      "description": "做什么（简述）",
      "details": "怎么做（具体代码/命令/技术）",
      "pass": false
    }
  ],
  "dependencies": ["TASK-${ID1}"],
  "estimatedComplexity": "low|medium|high|very high",
  "technicalNotes": ["实现提示、陷阱、约束"]
}
```

### Required Fields

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | TASK-${ID} 格式 |
| `title` | string | 高层概览 |
| `category` | string | 见分类表 |
| `description` | string | 详细规格 |
| `acceptanceCriteria` | string[] | 可验证的完成条件 |
| `steps` | object[] | 实现步骤（见 step 格式） |

### Optional Fields

| 字段 | 类型 | 说明 |
|------|------|------|
| `dependencies` | string[] | 前置任务 ID |
| `estimatedComplexity` | string | low/medium/high/very high |
| `technicalNotes` | string[] | 实现提示 |

### Step Object

| 字段 | 类型 | 说明 |
|------|------|------|
| `step` | number | 序号 |
| `description` | string | 做什么 |
| `details` | string | 怎么做（含代码/命令） |
| `pass` | boolean | 初始 false，完成后 true |

## TASK-1: Mandatory Prerequisite Verification

**每个任务列表必须以 TASK-1 开头**，验证实现前提：

```json
{
  "id": "TASK-1",
  "title": "Verify project prerequisites and access",
  "category": "setup",
  "description": "验证数据库、MCP、环境变量、测试用户等前置条件。",
  "acceptanceCriteria": [
    ".env.local 包含所有必需环境变量占位",
    "真实密钥未出现在 PRD/任务/日志/聊天中",
    "用户已手动填充本地密钥",
    "数据库连通性已验证或缺失已记录",
    "MCP 工具已安装认证或缺失已记录"
  ],
  "steps": [
    {
      "step": 1,
      "description": "读取 PRD 前置需求",
      "details": "打开 .agent/prd/PRD.md，审查 Prerequisites & Access 章节",
      "pass": false
    },
    {
      "step": 2,
      "description": "验证 .env.local 占位变量",
      "details": "确认文件存在且包含所有必需变量名，缺失的添加 TODO_FILL_MANUALLY 占位",
      "pass": false
    },
    {
      "step": 3,
      "description": "确认用户已手动填充密钥",
      "details": "询问用户确认已填写，绝不打印/存储/提交真实值",
      "pass": false
    },
    {
      "step": 4,
      "description": "验证数据库和服务访问",
      "details": "运行最安全的只读连通性检查，无法验证则记录阻断",
      "pass": false
    },
    {
      "step": 5,
      "description": "验证 MCP 和文档",
      "details": "确认 MCP 工具可用已认证，确认服务文档链接可用",
      "pass": false
    }
  ],
  "dependencies": [],
  "estimatedComplexity": "low",
  "technicalNotes": [
    "此任务阻塞所有下游实现任务",
    "密钥必须留在本地，永不提交"
  ]
}
```

所有需要前置条件的任务必须 `"dependencies": ["TASK-1"]`。

## Task Categories

| Category | 用途 | 示例 |
|----------|------|------|
| `setup` | 项目就绪、环境配置 | TASK-1 前置验证 |
| `functional` | 核心功能实现 | 用户注册、支付流程 |
| `ui-ux` | 界面和体验 | 响应式布局、空状态 |
| `data-model` | 数据库 schema、数据结构 | 用户表、索引 |
| `api-endpoint` | 后端 API 端点 | 登录接口、JWT 生成 |
| `integration` | 第三方集成 | Stripe 支付、OAuth |
| `security` | 安全、认证、授权 | RBAC 中间件 |
| `documentation` | 技术文档 | OpenAPI 文档 |

## Writing Good Acceptance Criteria

```json
// Good — 具体、可验证
"acceptanceCriteria": [
  "登录表单提交前验证邮箱格式",
  "无效邮箱显示 '请输入有效邮箱' 错误",
  "表单无效时提交按钮禁用",
  "登录成功跳转 /dashboard"
]

// Bad — 模糊
"acceptanceCriteria": [
  "登录功能正常",
  "表单验证好",
  "处理了错误"
]
```

## Writing Good Steps

```json
// Good — 具体、可执行
"steps": [
  {
    "step": 1,
    "description": "创建 LoginForm 组件",
    "details": "创建 src/components/LoginForm.tsx，使用 React Hook Form 管理状态，接受 onSubmit 和 onError props",
    "pass": false
  },
  {
    "step": 2,
    "description": "添加邮箱验证",
    "details": "使用 zod schema 验证邮箱格式：非空、合法正则、最大255字符，在输入框下方显示验证错误",
    "pass": false
  }
]

// Bad — 模糊
"steps": [
  {
    "step": 1,
    "description": "构建表单",
    "details": "创建登录表单",
    "pass": false
  }
]
```

## Generation Rules

1. **逐个生成**，用户逐步审查，不要一次性全部输出
2. **每个任务 ≤ 10 分钟**，超出则拆分
3. **初始 `"passes": false`**，只有开发者验证后更新
4. **测试是步骤内的验证条件，不能成为独立任务**
5. **UI 变更必须包含浏览器验证**作为验收条件
6. **禁止删除/跳过任务**，只能标记 pass/添加新任务
7. **竞品调研用 `web-access` skill**，禁止 WebSearch

## Output Files

| 文件 | 说明 |
|------|------|
| `.agent/tasks.json` | 任务索引列表 |
| `.agent/tasks/TASK-${ID}.json` | 单个任务详细规格 |
| `.agent/prd/PRD.md` | PRD 文档 |
| `.agent/prd/SUMMARY.md` | 项目总览 |
| `.env.local` | 环境变量占位（仅占位值） |