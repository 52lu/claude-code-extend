# TypeScript 项目规范（Codex）

适用范围：TypeScript / JavaScript 项目。

## 代码风格
- 优先类型安全、可读性与可维护性。
- 函数、类、核心对象与复杂流程应补充中文注释。
- 代码组织遵循项目既有结构，不为追求“完美架构”而过度重构。
- 命名清晰，类型命名与运行时对象命名保持一致语义。

## 类型系统约束
- 优先使用精确类型，避免无约束 `any`。
- 公共 API、核心函数、领域模型应显式声明关键输入输出类型。
- 复杂泛型、条件类型和映射类型应控制复杂度，并说明设计意图。
- 能用 `unknown`、类型守卫、判别联合解决的问题，不滥用断言。

## 工程实践
- 优先与现有工具链保持一致。
- 配置、构建、运行时边界要清晰，避免类型系统和运行时语义脱节。
- 大型类型逻辑与公共类型工具应关注编译性能。
- 在 Monorepo 或多包项目中，注意模块边界、引用关系和构建缓存。

## 测试建议
- 对复杂逻辑编写单元测试；对复杂类型工具可补充类型测试。
- 测试覆盖关键行为、边界输入和失败路径。
- 避免让测试过度绑定内部实现。

## 源参考
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/typescript/my_style.md`
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/typescript/advanced_types.md`
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/typescript/expert_guide.md`
