# TypeScript 专家指南

> 仅在 TypeScript 项目中应用以下规范

## 核心原则

- **先诊断再修复**：用 `--extendedDiagnostics` 定位编译瓶颈
- **渐进迁移**：JS→TS 分步启用严格模式，不一次性开启所有检查
- **工具链适配**：根据项目规模选择工具，小项目用 Turborepo，大项目用 Nx
- **ESM-First**：新项目默认 `"type": "module"`，现代工具用 `moduleResolution: "bundler"`

## 性能优化

### 编译性能诊断

```bash
# 定位编译瓶颈
npx tsc --extendedDiagnostics --incremental false

# 生成性能追踪
npx tsc --generateTrace trace --incremental false
npx @typescript/analyze-trace trace

# 模块解析追踪
npx tsc --traceResolution > resolution.log 2>&1
```

### 编译优化配置

- `skipLibCheck: true`：跳过库类型检查（大项目显著提速）
- `incremental: true`：启用增量编译 `.tsbuildinfo`
- 精确配置 `include`/`exclude`
- Monorepo 用项目引用 `composite: true`

### 类型性能优化

- 类型交集用 `interface extends` 替代 `type &`
- 大联合类型拆分（>100 成员）
- 避免循环泛型约束
- 用类型别名打断递归

```typescript
// BAD: 无限递归
type InfiniteArray<T> = T | InfiniteArray<T>[];

// GOOD: 限制递归深度
type NestedArray<T, D extends number = 5> =
  D extends 0 ? T : T | NestedArray<T, [-1, 0, 1, 2, 3, 4][D]>[];
```

## 常见问题解决

### "推断类型无法命名"

1. 显式导出所需类型
2. 使用 `ReturnType<typeof fn>` 辅助
3. 用 `import type` 打断循环依赖

### 缺少类型声明

```typescript
// types/ambient.d.ts
declare module "some-untyped-package" {
  const value: unknown;
  export default value;
}
```

### "类型比较栈深度过大"

1. 限制递归深度（条件类型）
2. 用 `interface extends` 替代 `type &`
3. 简化泛型约束

### 模块解析问题

1. 检查 `moduleResolution` 与构建工具匹配
2. 验证 `baseUrl` 和 `paths` 对齐
3. 清除缓存：`rm -rf node_modules/.cache .tsbuildinfo`

### 运行时路径映射

TypeScript paths 仅编译时生效，运行时需额外方案：
- ts-node：`ts-node -r tsconfig-paths/register`
- 生产环境：预编译 + 路径替换

## JS→TS 迁移策略

### 渐进迁移

```bash
# 1. tsconfig.json 启用 allowJs
# { "compilerOptions": { "allowJs": true, "checkJs": true } }

# 2. 逐步重命名 .js → .ts

# 3. 文件级添加类型

# 4. 逐项启用严格模式
```

### 工具迁移决策

| 从 | 到 | 时机 | 迁移成本 |
|------|-----|------|----------|
| ESLint + Prettier | Biome | 需要速度，规则够用 | 低（1天） |
| TSC 做 lint | 仅类型检查 | 100+ 文件，需快速反馈 | 中（2-3天） |
| Lerna | Nx/Turborepo | 需缓存/并行构建 | 高（1周） |
| CJS | ESM | Node 18+，现代工具链 | 高（视情况） |

## Monorepo 管理

### Nx vs Turborepo

- **Turborepo**：简单结构，需速度，<20 包
- **Nx**：复杂依赖，需可视化，>50 包性能更优

### Monorepo tsconfig 配置

```json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" },
    { "path": "./apps/web" }
  ],
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

## 工具链选型

### Biome vs ESLint

**选 Biome：**
- 速度关键
- 想单一工具 lint + format
- TypeScript-first 项目
- 64 TS 规则够用

**保留 ESLint：**
- 需特定规则/插件
- Vue/Angular 项目
- 需要类型感知 lint（Biome 尚未支持）

### 类型测试

```typescript
// Vitest 类型测试（推荐）
import { expectTypeOf } from "vitest";
import type { Avatar } from "./avatar";

test("Avatar props are correctly typed", () => {
  expectTypeOf<Avatar>().toHaveProperty("size");
  expectTypeOf<Avatar["size"]>().toEqualTypeOf<"sm" | "md" | "lg">();
});
```

**何时测试类型：**
- 发布库
- 复杂泛型函数
- 类型级工具函数
- API 契约

## 调试工具

```bash
# 调试运行
npx tsx --inspect src/file.ts
npx ts-node --inspect-brk src/file.ts

# 内存分析
node --max-old-space-size=8192 node_modules/typescript/lib/tsc.js
```

## 代码审查要点

### 类型安全
- 禁止隐式 `any`（用 `unknown`）
- strict null checks 正确处理
- 类型断言 `as` 最少且合理
- 泛型约束定义完整
- 公开 API 声明返回类型

### 最佳实践
- 对象形状用 `interface`
- 字面量类型用 `as const`
- 利用类型守卫和 predicates
- Branded Types 防混淆
- 复杂类型有 JSDoc

### 性能
- 类型复杂度不拖慢编译
- `skipLibCheck: true` 配置
- Monorepo 项目引用配置
- 热点路径避免复杂映射类型

### 模块系统
- 统一 import/export 模式
- 无循环依赖
- barrel export 不过度打包
- ESM/CJS 兼容处理
- 动态 import 代码分割

## 快速决策树

```
仅类型检查? → tsc
类型检查 + lint 速度关键? → Biome
类型检查 + 全面 lint? → ESLint + typescript-eslint
类型测试? → Vitest expectTypeOf
构建工具? → <10包? Turborepo; 否则 Nx

编译慢? → skipLibCheck, incremental, 项目引用
构建慢? → 检查构建工具配置，启用缓存
测试慢? → Vitest 线程模式，测试中不做类型检查
语言服务慢? → tsconfig exclude node_modules，限制文件范围
```

## 使用建议

| 场景 | 工具/方法 |
|------|----------|
| 编译性能瓶颈 | `--extendedDiagnostics` → skipLibCheck + incremental |
| Monorepo 管理 | Turborepo(<20包) / Nx(>50包) |
| JS→TS 迁移 | allowJs → checkJs → 逐步 .ts → strict |
| lint + format 选型 | Biome(速度) / ESLint(规则) |
| 类型测试 | Vitest expectTypeOf |
| 模块解析问题 | `--traceResolution` + 清缓存 |
| 类型声明缺失 | `declare module` 环境声明 |
| 生产环境路径映射 | 预编译 + 路径替换 |