# Golang 最佳实践参考

本文档提供 Golang 最佳实践参考，包括命名规范、代码组织、错误处理、并发编程等方面。

## 目录

1. [命名规范](#1-命名规范)
2. [注释规范](#2-注释规范)
3. [代码组织](#3-代码组织)
4. [错误处理](#4-错误处理)
5. [接口设计](#5-接口设计)
6. [并发编程](#6-并发编程)
7. [测试规范](#7-测试规范)

---

## 1. 命名规范

### 1.1 包命名

**规则**：
- 小写，单个单词
- 简洁、有意义
- 避免使用下划线或驼峰

**示例**：
```go
// ✅ 正确
package http
package json
package user

// ❌ 错误
package httpClient
package user_service
package UserService
```

### 1.2 变量命名

**规则**：
- 驼峰命名法
- 简短但有意义
- 布尔值以 `is`、`has`、`can` 等开头

**示例**：
```go
// ✅ 正确
var userName string
var isActive bool
var hasPermission bool
var itemCount int

// ❌ 错误
var user_name string
var active bool // 不够明确
var count int   // 太泛化
```

### 1.3 函数命名

**规则**：
- 驼峰命名法
- 导出函数首字母大写
- 动词开头，表达行为
- 返回值在名称中体现（可选）

**示例**：
```go
// ✅ 正确
func GetUserByID(id int) (*User, error) {}
func calculateTotal(items []Item) int {}
func isValidEmail(email string) bool {}

// ❌ 错误
func get_user(id int) {}      // 下划线
func user(id int) {}          // 缺少动词
func GetUser(id int) {}       // 未表达清楚是单个还是列表
```

### 1.4 接口命名

**规则**：
- 单方法接口以 `er` 结尾
- 描述行为，而非实现

**示例**：
```go
// ✅ 正确
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type TaskProcessor interface {
    Process(task *Task) error
}

// ❌ 错误
type ReaderInterface interface {}  // 不需要 Interface 后缀
type IReader interface {}          // 不需要 I 前缀
```

### 1.5 常量命名

**规则**：
- 驼峰命名法
- 枚举常量使用 `iota`

**示例**：
```go
// ✅ 正确
const (
    StatusPending = iota
    StatusProcessing
    StatusCompleted
    StatusFailed
)

const (
    maxRetryCount = 3
    defaultTimeout = 30 * time.Second
)

// ❌ 错误
const (
    STATUS_PENDING = 0   // 全大写
    STATUS_PROCESSING = 1
)
```

---

## 2. 注释规范

### 2.1 包注释

**规则**：
- 在 package 语句前添加
- 描述包的功能和用途

**示例**：
```go
// Package user provides user management functionality including
// user registration, authentication, and profile management.
package user
```

### 2.2 函数注释

**规则**：
- 导出函数必须注释
- 以函数名开头
- 描述功能、参数、返回值

**示例**：
```go
// GetUserByID retrieves a user by their unique identifier.
// Returns ErrNotFound if the user does not exist.
//
// Parameters:
//   - id: The unique identifier of the user
//
// Returns:
//   - *User: The user object
//   - error: An error if the operation fails
func GetUserByID(id int64) (*User, error) {
    // implementation
}

// 简洁版本（推荐）
// GetUserByID 根据 ID 获取用户信息
// @param id 用户唯一标识
// @return *User 用户对象
// @return error 错误信息
// @author qinghui.liu
// @date 2026-02-28
func GetUserByID(id int64) (*User, error) {
    // implementation
}
```

### 2.3 结构体注释

**规则**：
- 导出结构体必须注释
- 描述结构体用途
- 字段注释在字段后

**示例**：
```go
// User represents a user in the system.
type User struct {
    ID        int64     // Unique identifier
    Name      string    // User's full name
    Email     string    // User's email address
    CreatedAt time.Time // Account creation time
    UpdatedAt time.Time // Last update time
}
```

### 2.4 代码块注释

**规则**：
- 解释复杂逻辑
- 说明为什么这样做，而非做了什么
- 使用 `//` 而非 `/* */`

**示例**：
```go
// ✅ 正确
// Retry up to 3 times with exponential backoff to handle transient failures
for i := 0; i < maxRetries; i++ {
    if err := doSomething(); err == nil {
        break
    }
    time.Sleep(time.Second * time.Duration(1<<i))
}

// ❌ 错误（无意义的注释）
// Loop from 0 to maxRetries
for i := 0; i < maxRetries; i++ {
    // ...
}
```

---

## 3. 代码组织

### 3.1 文件组织

**推荐结构**：
```go
// 1. Package declaration
package user

// 2. Imports (grouped)
import (
    // Standard library
    "context"
    "fmt"

    // Third-party packages
    "gorm.io/gorm"

    // Local packages
    "horizon.ai/aidi/label/dao"
)

// 3. Constants
const (
    maxRetryCount = 3
)

// 4. Variables
var (
    defaultTimeout = 30 * time.Second
)

// 5. Types
type UserService struct {
    db *gorm.DB
}

// 6. Constructors
func NewUserService(db *gorm.DB) *UserService {
    return &UserService{db: db}
}

// 7. Methods (grouped by receiver)
func (s *UserService) GetUser(id int64) (*User, error) {}
func (s *UserService) CreateUser(user *User) error {}

// 8. Functions
func validateEmail(email string) bool {}
```

### 3.2 函数设计原则

**原则**：
- 单一职责：一个函数只做一件事
- 短小精悍：建议不超过 50 行
- 减少嵌套：最多 3 层嵌套
- 减少参数：最多 4 个参数，超过则使用结构体

**示例**：
```go
// ❌ 错误：函数过长，职责不清
func ProcessOrder(order *Order) error {
    // 验证订单（20 行）
    // 计算价格（30 行）
    // 库存检查（25 行）
    // 支付处理（40 行）
    // 发送通知（15 行）
    // 总计 130 行
}

// ✅ 正确：拆分为多个小函数
func ProcessOrder(order *Order) error {
    if err := validateOrder(order); err != nil {
        return err
    }

    if err := calculatePrice(order); err != nil {
        return err
    }

    if err := checkInventory(order); err != nil {
        return err
    }

    if err := processPayment(order); err != nil {
        return err
    }

    return sendNotification(order)
}
```

### 3.3 参数传递

**规则**：
- 最多 4 个参数
- 超过则使用 Option 结构体或函数选项模式

**示例**：
```go
// ❌ 错误：参数过多
func CreateUser(name string, age int, email string, phone string, address string) error {}

// ✅ 正确：使用结构体
type CreateUserOptions struct {
    Name    string
    Age     int
    Email   string
    Phone   string
    Address string
}

func CreateUser(opts *CreateUserOptions) error {}

// ✅ 正确：函数选项模式
type UserOption func(*User)

func WithEmail(email string) UserOption {
    return func(u *User) {
        u.Email = email
    }
}

func WithPhone(phone string) UserOption {
    return func(u *User) {
        u.Phone = phone
    }
}

func CreateUser(name string, age int, opts ...UserOption) *User {
    user := &User{Name: name, Age: age}
    for _, opt := range opts {
        opt(user)
    }
    return user
}
```

---

## 4. 错误处理

### 4.1 错误返回

**规则**：
- 错误作为最后一个返回值
- 不要返回错误的多个值

**示例**：
```go
// ✅ 正确
func GetUser(id int64) (*User, error) {}

// ❌ 错误
func GetUser(id int64) (*User, bool, error) {} // 多余的 bool
```

### 4.2 错误包装

**规则**：
- 使用 `fmt.Errorf("context: %w", err)` 包装错误
- 提供足够的上下文信息

**示例**：
```go
// ✅ 正确
func ProcessOrder(orderID int64) error {
    order, err := GetOrder(orderID)
    if err != nil {
        return fmt.Errorf("failed to get order %d: %w", orderID, err)
    }

    if err := Payment(order); err != nil {
        return fmt.Errorf("failed to process payment for order %d: %w", orderID, err)
    }

    return nil
}
```

### 4.3 错误检查

**规则**：
- 使用 `errors.Is()` 比较错误值
- 使用 `errors.As()` 获取特定错误类型

**示例**：
```go
// ✅ 正确
import "errors"

if errors.Is(err, sql.ErrNoRows) {
    // 处理未找到的情况
}

var customErr *CustomError
if errors.As(err, &customErr) {
    // 处理特定错误类型
}

// ❌ 错误
if err == sql.ErrNoRows {
    // 不能处理包装后的错误
}
```

### 4.4 自定义错误

**规则**：
- 实现 `error` 接口
- 提供有用的错误信息

**示例**：
```go
// ✅ 正确
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on field %s: %s", e.Field, e.Message)
}

// 使用
if user.Name == "" {
    return &ValidationError{
        Field:   "name",
        Message: "name cannot be empty",
    }
}
```

---

## 5. 接口设计

### 5.1 接口定义原则

**原则**：
- 在消费者端定义接口，而非生产者端
- 接口要小（1-3 个方法）
- 接口描述行为，而非数据

**示例**：
```go
// ✅ 正确：消费者端定义
// 在 service/user.go 中
type UserRepository interface {
    GetByID(id int64) (*User, error)
    Save(user *User) error
}

// ❌ 错误：生产者端定义
// 在 dao/user_repository.go 中
type UserRepository interface {
    GetByID(id int64) (*User, error)
    GetByEmail(email string) (*User, error)
    Save(user *User) error
    Delete(id int64) error
    // ... 很多方法
}
```

### 5.2 接口隔离

**规则**：
- 大接口拆分为小接口
- 客户端不应该依赖它不需要的方法

**示例**：
```go
// ❌ 错误：大接口
type UserOps interface {
    GetByID(id int64) (*User, error)
    GetByEmail(email string) (*User, error)
    Create(user *User) error
    Update(user *User) error
    Delete(id int64) error
}

// ✅ 正确：拆分为小接口
type UserReader interface {
    GetByID(id int64) (*User, error)
    GetByEmail(email string) (*User, error)
}

type UserWriter interface {
    Create(user *User) error
    Update(user *User) error
    Delete(id int64) error
}

// 组合接口
type UserRepository interface {
    UserReader
    UserWriter
}
```

---

## 6. 并发编程

### 6.1 Goroutine 使用

**规则**：
- 知道 goroutine 何时结束
- 使用 context 控制生命周期
- 避免 goroutine 泄漏

**示例**：
```go
// ✅ 正确：使用 context 控制
func ProcessTasks(ctx context.Context, tasks <-chan Task) {
    for {
        select {
        case task, ok := <-tasks:
            if !ok {
                return
            }
            process(task)
        case <-ctx.Done():
            return
        }
    }
}

// ❌ 错误：无法控制 goroutine 退出
func ProcessTasks(tasks <-chan Task) {
    for task := range tasks {
        process(task)
    }
}
```

### 6.2 Channel 使用

**规则**：
- 明确 channel 的所有权
- 发送方关闭 channel，接收方不关闭
- 使用 `select` + `default` 避免阻塞

**示例**：
```go
// ✅ 正确：发送方关闭
func GenerateNumbers(ctx context.Context) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for i := 0; ; i++ {
            select {
            case out <- i:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// ✅ 正确：非阻塞发送
select {
case ch <- data:
    // 发送成功
default:
    // channel 满了，处理其他逻辑
}
```

### 6.3 WaitGroup 使用

**规则**：
- 在 goroutine 外调用 Add
- 使用 defer 调用 Done

**示例**：
```go
// ✅ 正确
func ProcessConcurrently(items []Item) error {
    var wg sync.WaitGroup
    errCh := make(chan error, len(items))

    for _, item := range items {
        wg.Add(1) // 在 goroutine 外调用
        go func(item Item) {
            defer wg.Done() // 使用 defer
            if err := process(item); err != nil {
                errCh <- err
            }
        }(item)
    }

    wg.Wait()
    close(errCh)

    // 处理错误
    for err := range errCh {
        if err != nil {
            return err
        }
    }
    return nil
}
```

---

## 7. 测试规范

### 7.1 测试文件命名

**规则**：
- 测试文件以 `_test.go` 结尾
- 与被测试文件同目录

**示例**：
```
user.go
user_test.go
```

### 7.2 测试函数命名

**规则**：
- 以 `Test` 开头
- 描述测试场景

**示例**：
```go
// ✅ 正确
func TestGetUserByID_Success(t *testing.T) {}
func TestGetUserByID_NotFound(t *testing.T) {}
func TestGetUserByID_InvalidID(t *testing.T) {}

// ❌ 错误
func TestUser(t *testing.T) {}           // 描述不清
func testGetUserByID(t *testing.T) {}    // 首字母小写
```

### 7.3 表驱动测试

**规则**：
- 使用表驱动测试覆盖多种场景
- 测试用例清晰易读

**示例**：
```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        want    bool
    }{
        {"valid email", "user@example.com", true},
        {"empty email", "", false},
        {"missing @", "userexample.com", false},
        {"missing domain", "user@", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := validateEmail(tt.email)
            if got != tt.want {
                t.Errorf("validateEmail(%q) = %v, want %v", tt.email, got, tt.want)
            }
        })
    }
}
```

### 7.4 Mock 使用

**规则**：
- 使用 gomock 或 testify/mock
- 验证调用次数和参数

**示例**：
```go
// 使用 gomock
func TestUserService_GetUser(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockRepo := NewMockUserRepository(ctrl)
    mockRepo.EXPECT().
        GetByID(int64(1)).
        Return(&User{ID: 1, Name: "John"}, nil)

    service := NewUserService(mockRepo)
    user, err := service.GetUser(1)

    assert.NoError(t, err)
    assert.Equal(t, "John", user.Name)
}
```

---

## 最佳实践总结

| 类别 | 要点 |
|------|------|
| 命名 | 驼峰命名、导出首字母大写、接口以 er 结尾 |
| 注释 | 导出必须注释、以名称开头、描述 Why |
| 组织 | 单一职责、函数 <50 行、参数 <4 个 |
| 错误 | 作为最后返回值、使用 %w 包装、errors.Is/As |
| 接口 | 消费者端定义、小接口、描述行为 |
| 并发 | context 控制、发送方关闭、defer Done |
| 测试 | 表驱动测试、覆盖多种场景、使用 mock |
