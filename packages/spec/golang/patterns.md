# Golang 设计模式

> 仅在 Go 项目中应用以下模式

## 选项模式（Functional Options）

用于构建灵活、可扩展的配置 API，替代多参数构造函数。

```go
type Option func(*Config)

// @desc 设置超时时间
func WithTimeout(d time.Duration) Option {
    return func(c *Config) { c.Timeout = d }
}

// @desc 设置重试次数
func WithRetry(n int) Option {
    return func(c *Config) { c.MaxRetry = n }
}

// @desc 创建配置实例
func NewConfig(opts ...Option) *Config {
    c := &Config{Timeout: defaultTimeout}
    for _, opt := range opts {
        opt(c)
    }
    return c
}
```

**使用场景**：结构体字段多且有合理默认值、API 需要向前兼容、构建器模式过于冗长时。

**要点**：
- `Option` 类型为 `func(*T)`，通过闭包修改目标结构
- `New` 函数内先设默认值，再循环应用选项
- 新增选项只需添加 `WithXxx` 函数，无需改签名
- 选项可组合、可条件传入、可在测试中覆盖

## 单例模式（Singleton）

Go 中使用 `sync.Once` 实现线程安全的单例。

```go
var (
    instance *Database
    once     sync.Once
)

// @desc 获取数据库单例
func GetDB() *Database {
    once.Do(func() {
        instance = &Database{dsn: "default"}
    })
    return instance
}
```

**使用场景**：全局唯一资源（连接池、配置、日志器、缓存）。

**要点**：
- `sync.Once` 保证初始化函数只执行一次，且后续调用阻塞等待
- 初始化函数内发生 panic 也会标记为已完成，后续调用返回 nil — 需在 Do 内 recover
- 如需懒加载 + 错误处理，可使用 `sync.OnceValues`（Go 1.21+）返回值和错误
- 避免在 `Once.Do` 内递归调用自身，会死锁

## 工厂模式（Factory）

将对象创建逻辑与使用逻辑解耦。

### 简单工厂

```go
// @desc 根据格式创建解析器
func NewParser(format string) (Parser, error) {
    switch format {
    case "json":
        return &JSONParser{}, nil
    case "yaml":
        return &YAMLParser{}, nil
    default:
        return nil, fmt.Errorf("unsupported format: %s", format)
    }
}
```

### 工厂方法（基于注册表）

```go
var registry = map[string]func() Handler{}

// @desc 注册处理器
func Register(name string, fn func() Handler) {
    registry[name] = fn
}

// @desc 根据名称创建处理器
func NewHandler(name string) (Handler, error) {
    fn, ok := registry[name]
    if !ok {
        return nil, fmt.Errorf("handler %q not registered", name)
    }
    return fn(), nil
}
```

**使用场景**：根据配置/输入创建不同实现、插件化架构、需要开闭原则时。

**要点**：
- 简单工厂用 `switch` 足够，超过 5-8 个分支改用注册表
- 注册表模式让各实现自行 `init()` 注册，工厂无需 import 所有实现
- 返回接口类型，调用方只依赖抽象
- 工厂函数返回错误而非 panic

### Worker Pool 模式（基于 ants）

> 详见「Golang 并发规范」章节，包含 ants 协程池初始化、任务提交、panic recovery、context 取消传播完整规范

### 接口组合

通过嵌入小接口组合出大接口。

```go
// @desc 基础读取接口
type Reader interface {
    Read(p []byte) (n int, err error)
}

// @desc 基础写入接口
type Writer interface {
    Write(p []byte) (n int, err error)
}

// @desc 带关闭的写入接口
type WriteCloser interface {
    Writer
    io.Closer
}

// @desc 组合接口：读写一体
type ReadWriter interface {
    Reader
    Writer
}
```

**要点**：
- 优先定义 1-2 个方法的小接口，通过组合满足复杂需求
- 在使用方定义接口，只包含调用方需要的方法
- 接口嵌入顺序：读在前、写在后，关闭最后

### 策略模式

将算法族封装为独立策略，运行时可替换。

```go
// @desc 排序策略接口
type SortStrategy interface {
    Sort(data []int) []int
}

// @desc 快速排序策略
type QuickSort struct{}

func (s *QuickSort) Sort(data []int) []int {
    sort.Ints(data)
    return data
}

// @desc 归并排序策略
type MergeSort struct{}

func (s *MergeSort) Sort(data []int) []int {
    if len(data) <= 1 {
        return data
    }
    mid := len(data) / 2
    left := s.Sort(data[:mid])
    right := s.Sort(data[mid:])
    return merge(left, right)
}

// @desc 排序上下文
type Sorter struct {
    strategy SortStrategy
}

// @desc 设置排序策略
func (s *Sorter) SetStrategy(strategy SortStrategy) {
    s.strategy = strategy
}

// @desc 执行排序
func (s *Sorter) Execute(data []int) []int {
    return s.strategy.Sort(data)
}
```

**使用场景**：算法族需要可替换、支付方式切换、压缩/编码方式选择、日志输出格式切换。

**要点**：
- 策略接口定义在调用方，只包含调用方需要的方法
- 策略实现无状态时用值类型，有状态时用指针
- 通过依赖注入或 `SetStrategy` 切换策略，避免 if-else/switch 分支

### 观察者模式

```go
// @desc 观察者接口
type Observer interface {
    Update(event string)
}

// @desc 被观察主体（并发安全）
type Subject struct {
    mu        sync.RWMutex
    observers []Observer
}

// @desc 注册观察者
func (s *Subject) Attach(observer Observer) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.observers = append(s.observers, observer)
}

// @desc 通知所有观察者
func (s *Subject) Notify(event string) {
    s.mu.RLock()
    observers := make([]Observer, len(s.observers))
    copy(observers, s.observers)
    s.mu.RUnlock()

    for _, obs := range observers {
        obs.Update(event)
    }
}
```

## 使用建议

- **单例模式**：用于数据库连接、配置管理器等
- **工厂模式**：创建对象需要复杂逻辑时; 优先使用简单工厂
- **策略模式**：算法族需要可替换时
- **观察者模式**：事件驱动系统
- **Worker Pool 模式**：所有并发场景，必须使用 ants 协程池
- **接口组合**：通过嵌入小接口组合大接口，保持接口小而精
- **函数选项模式**：Go 中最推荐的配置模式；当初始化对象参数过多时，优先使用
