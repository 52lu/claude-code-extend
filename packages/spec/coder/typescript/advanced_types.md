# TypeScript 高级类型

> 仅在 TypeScript 项目中应用以下模式

## 核心原则

- **类型安全优于便捷**：用 `unknown` 替代 `any`，用类型守卫替代断言
- **编译时捕获错误**：discriminated unions、Branded Types、exhaustive check
- **推断优先标注**：TypeScript 能推断的不要手写，只在公开 API 声明返回类型
- **类型复杂度可控**：递归深度限制 10 层，避免过度嵌套条件类型

## 泛型

### 基础泛型函数

```typescript
function identity<T>(value: T): T {
  return value;
}

const num = identity<number>(42); // Type: number
const auto = identity(true); // 推断: boolean
```

### 泛型约束

```typescript
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(item: T): T {
  console.log(item.length);
  return item;
}

logLength("hello"); // OK
logLength(42); // Error: number has no length
```

### 多类型参数

```typescript
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}
```

## 条件类型

### 基础条件类型

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```

### infer 推断

```typescript
// 提取返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取数组元素类型
type ElementType<T> = T extends (infer U)[] ? U : never;

// 提取 Promise 内部类型
type PromiseType<T> = T extends Promise<infer U> ? U : never;
```

### 分布式条件类型

```typescript
type ToArray<T> = T extends any ? T[] : never;

type StrOrNumArray = ToArray<string | number>;
// Type: string[] | number[] (分布式展开)
```

## 映射类型

### 基础映射

```typescript
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Partial<T> = { [P in keyof T]?: T[P] };
```

### 键重映射

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

### 属性过滤

```typescript
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  age: number;
}

type OnlyNumbers = PickByType<Mixed, number>;
// { id: number; age: number }
```

## 模板字面量类型

### 事件名生成

```typescript
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"
```

### 路径类型

```typescript
type Path<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? `${K}` | `${K}.${Path<T[K]>}`
        : never;
    }[keyof T]
  : never;

interface Config {
  server: { host: string; port: number };
  database: { url: string };
}

type ConfigPath = Path<Config>;
// "server" | "database" | "server.host" | "server.port" | "database.url"
```

## Branded Types（防原始类型混淆）

```typescript
type Brand<K, T> = K & { __brand: T };
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

function processOrder(orderId: OrderId, userId: UserId) {}
// 不会误传普通 string 或混淆 OrderId/UserId
```

## Discriminated Unions

```typescript
type Success<T> = { status: "success"; data: T };
type Failed = { status: "error"; error: string };
type Loading = { status: "loading" };
type AsyncState<T> = Success<T> | Failed | Loading;

function handleState<T>(state: AsyncState<T>): void {
  switch (state.status) {
    case "success":
      console.log(state.data); // 自动收窄为 T
      break;
    case "error":
      console.log(state.error); // 自动收窄为 string
      break;
    case "loading":
      break;
  }
}
```

## 类型守卫与断言函数

### 类型守卫

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}
```

### 断言函数

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Not a string");
  }
}

function processValue(value: unknown) {
  assertIsString(value);
  // value 现在是 string 类型
  console.log(value.toUpperCase());
}
```

## 深层类型转换

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};
```

## 类型安全事件系统

```typescript
type EventMap = {
  "user:created": { id: string; name: string };
  "user:deleted": { id: string };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(callback);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners[event]?.forEach((cb) => cb(data));
  }
}
```

## 类型测试

```typescript
type AssertEqual<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

type Test1 = AssertEqual<string, string>; // true
type Test2 = AssertEqual<string, number>; // false
```

## 性能注意事项

- 避免深层嵌套条件类型（递归限制 10 层）
- 大联合类型（>100 成员）拆分或用接口替代
- 避免循环泛型约束
- 复杂映射类型仅在热点路径外使用
- `skipLibCheck: true` 加速编译

## 使用建议

| 场景 | 方法 |
|------|------|
| 防止原始类型混淆 | Branded Types |
| 异步状态/错误处理 | Discriminated Unions |
| 运行时类型收窄 | 类型守卫 + 断言函数 |
| 对象类型转换 | 映射类型 + 键重映射 |
| 字符串模式匹配 | 模板字面量类型 |
| 提取嵌套类型 | `infer` 关键字 |
| 深层 readonly/partial | DeepReadonly / DeepPartial |
| 类型安全事件/API | 泛型 + 条件类型 |
| 验证类型行为 | AssertEqual 类型测试 |