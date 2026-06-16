# Go 项目规范（Codex）

适用范围：Go 项目。

## 代码风格
- 遵循 Go 官方风格与项目既有约定，保持命名清晰、结构简洁。
- 优先小函数、小接口、清晰职责边界，避免过度抽象。
- 导出符号、关键函数、结构体及复杂流程应补充中文注释。
- 错误处理应显式、就近、可读，避免吞错。

## 工程实践
- 优先组合而非继承式设计，避免无意义的层层封装。
- 依赖注入保持简单明确，方便测试和替换实现。
- 公共 API、核心领域对象、并发边界应保持稳定和可预测。
- 对复杂业务流程补充流程说明，必要时写明输入、输出和失败路径。

## 并发约束
- 启动 goroutine 必须有明确生命周期与退出机制。
- 优先使用 `context.Context` 传递取消信号、超时与请求范围数据。
- channel 仅用于明确的所有权和通信场景，避免把 channel 当通用队列滥用。
- 注意资源关闭、锁粒度、共享状态访问与死锁风险。
- 并发设计优先可读性与正确性，再考虑性能优化。

## 测试建议
- 优先表驱动测试。
- 并发逻辑应覆盖取消、超时、异常返回与竞态敏感路径。
- 仅在必要时引入 mock，优先测试真实边界行为。

## 源参考
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/golang/my_style.md`
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/golang/patterns.md`
- `/Users/horizon/SelfSpace/claude-code-extend/packages/spec/coder/golang/concurrency.md`
