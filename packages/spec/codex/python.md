# Python 项目规范（Codex）

适用范围：Python 项目。

## 代码风格
- 优先编写清晰、可维护、可扩展的 Python 代码，避免炫技式写法。
- 函数、类、核心对象与复杂流程应补充中文注释。
- 模块职责单一，接口清晰，避免过度耦合。
- 命名要表达业务语义，减少含糊缩写。

## 设计约束
- 优先简单设计与清晰分层，遵循单一职责。
- 优先组合而不是深层继承。
- 复杂逻辑拆成小函数或独立服务对象，便于测试与复用。
- I/O、业务逻辑、数据访问尽量分离。

## 性能与健壮性
- 优先先保证正确性和可读性，再做性能优化。
- 避免不必要的全量扫描、重复计算和隐式高复杂度操作。
- 针对热点路径再做针对性优化，并说明原因。
- 关注异常处理、资源释放、超时、重试与边界条件。

## 测试建议
- 优先使用 `pytest` 风格组织测试。
- 测试覆盖正常路径、边界条件和失败路径。
- 优先测试行为与契约，而不是实现细节。
- 对复杂逻辑可采用参数化测试提高覆盖率和可读性。

## 源参考
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/python/my_style.md`
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/python/patterns.md`
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/python/performance.md`
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/python/testing.md`
