# Golang 并发规范

> 仅在 Go 项目中应用以下规范

## 核心原则

- 协程池统一管理：使用 [ants](https://github.com/panjf2000/ants) 协程池启动和管理工作协程，禁止使用原生 `go func(){}()` 启动协程
- 优先用 channel 通信，而非共享内存
- goroutine 必须有退出机制（context 取消 / done channel / WaitGroup）
- 禁止无缓冲 channel 在同一个 goroutine 中收发，会死锁
- `sync.Map` 仅用于 key 稳定且读写比极度悬殊的场景，否则用 `map + sync.RWMutex`
- 所有工作协程都要考虑 panic recovery，防止整个进程崩溃

## 协程池规范

- 全局初始化一个 `ants.Pool`，通过依赖注入传递，禁止在每个函数内创建临时池
- 池大小根据 CPU 核数和任务 IO 比例设定：CPU 密集型建议 `runtime.NumCPU()`，IO 密集型可适当放大
- 使用 `ants.WithPreAlloc(true)` 预分配协程，减少运行时开销
- 任务提交失败（池已满）时必须处理错误，禁止忽略
- 搭配 `errgroup` 实现错误收集和 context 取消传播

```go
// @desc 初始化全局协程池
func NewPool(maxWorkers int) (*ants.Pool, error) {
    return ants.NewPool(maxWorkers, ants.WithPreAlloc(true))
}

// ✗ 禁止：原生 go 启动协程
func ProcessBad(tasks []Task) {
    for _, t := range tasks {
        go func(task Task) { // 无池管理，无并发控制
            process(task)
        }(t)
    }
}

// ✓ 正确：通过 ants 池提交任务
// @desc 并发处理任务
func ProcessConcurrently(ctx context.Context, tasks []Task, pool *ants.Pool) error {
    eg, egCtx := errgroup.WithContext(ctx)
    for _, t := range tasks {
        task := t // 避免闭包捕获循环变量
        if err := pool.Submit(func() {
            eg.Go(func() error {
                return process(egCtx, task)
            })
        }); err != nil {
            return fmt.Errorf("submit task %d: %w", task.ID, err)
        }
    }
    return eg.Wait()
}
```

## panic recovery

- ants 池默认提供 panic recovery，可通过 `ants.WithPanicHandler` 自定义 panic 处理（记录日志、上报监控）
- 若确实需要脱离池使用协程（极少数场景），必须用 `defer recover()` 包裹

```go
// @desc 自定义 panic handler 的协程池
func NewPoolWithRecovery(maxWorkers int, logger Logger) (*ants.Pool, error) {
    return ants.NewPool(maxWorkers,
        ants.WithPreAlloc(true),
        ants.WithPanicHandler(func(err interface{}) {
            logger.Error("goroutine panic recovered", "error", err, "stack", string(debug.Stack()))
        }),
    )
}
```

## context 取消传播

- 并发任务必须接收 `context.Context`，并在循环/select 中检查 `ctx.Done()`
- 使用 `errgroup.WithContext(ctx)` 实现任一任务失败时自动取消其余任务

```go
// @desc 带取消传播的并发任务
func BatchProcess(ctx context.Context, items []Item, pool *ants.Pool) error {
    eg, egCtx := errgroup.WithContext(ctx)
    for _, item := range items {
        item := item
        if err := pool.Submit(func() {
            eg.Go(func() error {
                select {
                case <-egCtx.Done():
                    return egCtx.Err()
                default:
                    return processItem(egCtx, item)
                }
            })
        }); err != nil {
            return fmt.Errorf("submit item %d: %w", item.ID, err)
        }
    }
    return eg.Wait()
}
```
