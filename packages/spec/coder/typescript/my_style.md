# TypeScript 编码规范

> 仅在 TypeScript 项目中应用以下规范

## Skill 使用

| Skill | 触发场景 | 核心要求 |
|-------|---------|---------|
| typescript-advanced-types | 创建类型安全库/框架、设计可复用泛型组件、实现复杂类型推断、构建类型安全 API 客户端、表单校验系统、状态管理类型定义、JS→TS 迁移 | 泛型约束；条件类型推断；映射类型转换；模板字面量类型；discriminated unions；`unknown` 替代 `any`；`interface` 定义对象形状 |
| typescript-expert | TypeScript 性能优化、Monorepo 管理、JS→TS 迁移策略、工具链选型、模块解析问题、类型编译调优、代码审查 | strict 模式默认；ESM-First；Branded Types 防止原始类型混淆；`satisfies` 约束校验；项目引用配置；skipLibCheck 加速编译 |

## 命名

- 文件名：小写中划线（`user-service.ts` 非 `userService.ts`）
- 类名/接口名：大驼峰（`UserService`），接口不加 `I` 前缀
- 类型别名：大驼峰（`AsyncState`）
- 函数/方法：小驼峰（`getUserById`），私有方法无前缀规范但逻辑清晰
- 常量：全大写下划线（`MAX_RETRY_COUNT`）
- 布尔变量/方法：`is_`/`has_`/`should_` 前缀（`isActive`, `hasPermission`）
- 枚举：大驼峰值（`UserStatus.Active`）
- 泛型参数：有意义的名称（`TResponse` 非 `T`），单字母仅用于简单场景

## 类型标注

- **禁止滥用 `any`**：优先 `unknown` + 类型收窄，第三方库类型不完整时可临时用 `any` 并加 `// TODO: 补充类型` 注释
- 公开 API 函数必须声明返回类型
- 对象形状用 `interface`，联合类型/复杂类型用 `type`
- 使用 `satisfies` 校验对象同时保留字面量类型
- 容器类型用泛型语法（`Array<string>` 或 `string[]`）
- 枚举用 `const enum` 或字符串枚举，禁止魔法数字

```typescript
// unknown 替代 any
function processValue(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error("Expected string");
}

// satisfies 保留字面量类型
const config = {
  api: "https://api.example.com",
  timeout: 5000,
} satisfies Record<string, string | number>;
// config.api 类型: "https://api.example.com" (字面量，非 string)

// interface vs type
interface User {
  id: string;
  name: string;
}
type AsyncState<T> = Success<T> | Error | Loading;
```

## 错误处理

- 自定义错误类继承 `Error`，保留 `name` 和 `stack`
- 使用 discriminated unions 处理异步状态和错误
- 用 `never` 类型保证 exhaustive switch

```typescript
class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "DomainError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// Discriminated union 异步状态
type Success<T> = { status: "success"; data: T };
type Failed = { status: "error"; error: string };
type Loading = { status: "loading" };
type AsyncState<T> = Success<T> | Failed | Loading;

function handleState<T>(state: AsyncState<T>): void {
  switch (state.status) {
    case "success":
      console.log(state.data);
      break;
    case "error":
      console.log(state.error);
      break;
    case "loading":
      console.log("Loading...");
      break;
  }
}
```

## 函数规范

### 注释模板
```typescript
/**
 * 函数功能描述
 * @param paramName - 参数说明
 * @returns 返回值说明
 */
async function createUser(options: CreateUserOptions): Promise<User> {
  // ...
}
```

### 入参与返回
- 参数不超过 5 个，超出用 interface/object 封装
- 返回值不超过 3 个，超出封装结构体
- 纯计算函数不依赖外部状态
- 回调优先用箭头函数保持类型推断

```typescript
interface CreateUserOptions {
  name: string;
  email: string;
  role?: UserRole;
}

async function createUser(options: CreateUserOptions): Promise<User> {
  // ...
}
```

## 代码整洁度

- 禁止冗余设计：不预留字段/方法/接口/抽象层
- 禁止未使用变量/导入（依赖 lint 工具检测）
- 禁止注释掉代码块：直接删除，需时从 git 恢复
- 禁止 `TODO`/`FIXME` 长期残留
- 同一逻辑不写两遍：第二次提取函数，第三次考虑泛型/抽象
- 函数体≤50行，嵌套≤3层（用卫语句 early return）
- 禁止无意义中间变量：直接返回表达式

```typescript
// 嵌套过深 -> 卫语句
function process(data: unknown): Result {
  if (!data) return Result.error("empty");
  if (typeof data !== "object") return Result.error("invalid");
  return Result.ok(transform(data as Config));
}
```

## 严格模式配置

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    // exactOptionalPropertyTypes: 可选属性不允许显式赋 undefined，
    // 仅在团队明确需要此约束时启用，多数项目建议关闭
    "exactOptionalPropertyTypes": false,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

## 模块规范

- ESM-First：`package.json` 设置 `"type": "module"`
- `moduleResolution: "bundler"` 配合现代构建工具
- 禁止循环依赖
- 共享类型放在独立 `types/` 目录
- 类型与实现同目录放置
- barrel export 避免过度打包

## 代码结构

```
1. Imports（类型导入用 `import type`，值导入用 `import`）
2. 常量和枚举
3. 类型定义（interface / type）
4. 辅助函数
5. 主 Service 类
6. 错误类
```