# 代码质量检查清单

本文档提供 Golang 代码质量检查的详细清单和检查要点。

## 目录

1. [空指针风险](#1-空指针风险)
2. [错误处理](#2-错误处理)
3. [资源泄漏](#3-资源泄漏)
4. [并发安全](#4-并发安全)
5. [安全漏洞](#5-安全漏洞)
6. [性能问题](#6-性能问题)

---

## 1. 空指针风险

### 检查要点

#### 1.1 指针解引用前判空

**问题模式**：
```go
// ❌ 错误：未判空直接使用
func processUser(user *User) string {
    return user.Name // 如果 user 为 nil 会 panic
}

// ✅ 正确：先判空
func processUser(user *User) string {
    if user == nil {
        return ""
    }
    return user.Name
}
```

#### 1.2 结构体字段访问

**问题模式**：
```go
// ❌ 错误：嵌套字段未判空
func getAddress(user *User) string {
    return user.Address.City // Address 可能为 nil
}

// ✅ 正确：逐层判空
func getAddress(user *User) string {
    if user == nil || user.Address == nil {
        return ""
    }
    return user.Address.City
}
```

#### 1.3 Map 访问

**问题模式**：
```go
// ❌ 错误：直接访问可能不存在的 key
func getValue(data map[string]string, key string) string {
    return data[key] // key 不存在时返回零值，可能不是预期行为
}

// ✅ 正确：检查 key 是否存在
func getValue(data map[string]string, key string) (string, bool) {
    value, exists := data[key]
    if !exists {
        return "", false
    }
    return value, true
}
```

#### 1.4 切片/数组访问

**问题模式**：
```go
// ❌ 错误：未检查索引范围
func getItem(items []string, index int) string {
    return items[index] // 可能越界
}

// ✅ 正确：检查边界
func getItem(items []string, index int) (string, error) {
    if index < 0 || index >= len(items) {
        return "", fmt.Errorf("index out of range")
    }
    return items[index], nil
}
```

---

## 2. 错误处理

### 检查要点

#### 2.1 忽略错误返回值

**问题模式**：
```go
// ❌ 错误：忽略错误
func saveData(data *Data) {
    db.Create(data) // 未处理返回的 error
}

// ✅ 正确：处理错误
func saveData(data *Data) error {
    if err := db.Create(data).Error; err != nil {
        return fmt.Errorf("failed to create data: %w", err)
    }
    return nil
}
```

#### 2.2 错误处理不当

**问题模式**：
```go
// ❌ 错误：吞掉错误
func processFile(filename string) {
    data, _ := os.ReadFile(filename) // 忽略错误
    // 使用 data 可能导致问题
}

// ❌ 错误：错误信息不完整
if err != nil {
    return err // 丢失了上下文
}

// ✅ 正确：提供完整的错误上下文
if err != nil {
    return fmt.Errorf("failed to read file %s: %w", filename, err)
}
```

#### 2.3 错误比较方式

**问题模式**：
```go
// ❌ 错误：使用 == 比较错误
if err == sql.ErrNoRows {
    // ...
}

// ✅ 正确：使用 errors.Is()
if errors.Is(err, sql.ErrNoRows) {
    // ...
}
```

#### 2.4 panic 使用不当

**问题模式**：
```go
// ❌ 错误：在库代码中使用 panic
func loadData(id int) *Data {
    data := db.Find(id)
    if data == nil {
        panic("data not found") // 不应该在库代码中 panic
    }
    return data
}

// ✅ 正确：返回错误
func loadData(id int) (*Data, error) {
    data := db.Find(id)
    if data == nil {
        return nil, fmt.Errorf("data not found: %d", id)
    }
    return data, nil
}
```

---

## 3. 资源泄漏

### 检查要点

#### 3.1 文件句柄泄漏

**问题模式**：
```go
// ❌ 错误：未关闭文件
func readFile(filename string) ([]byte, error) {
    file, err := os.Open(filename)
    if err != nil {
        return nil, err
    }
    // 如果这里出错，file 不会被关闭
    data, err := io.ReadAll(file)
    if err != nil {
        return nil, err
    }
    file.Close()
    return data, nil
}

// ✅ 正确：使用 defer 确保关闭
func readFile(filename string) ([]byte, error) {
    file, err := os.Open(filename)
    if err != nil {
        return nil, err
    }
    defer file.Close()

    return io.ReadAll(file)
}
```

#### 3.2 HTTP Response Body 未关闭

**问题模式**：
```go
// ❌ 错误：未关闭 response body
func fetchURL(url string) ([]byte, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    return io.ReadAll(resp.Body)
}

// ✅ 正确：关闭 response body
func fetchURL(url string) ([]byte, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

#### 3.3 数据库连接/事务泄漏

**问题模式**：
```go
// ❌ 错误：事务未回滚或提交
func updateData(data *Data) error {
    tx := db.Begin()
    tx.Update(data)
    // 如果这里出错，事务不会回滚
    return nil
}

// ✅ 正确：确保事务处理
func updateData(data *Data) error {
    tx := db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    if err := tx.Update(data).Error; err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit().Error
}
```

#### 3.4 Goroutine 泄漏

**问题模式**：
```go
// ❌ 错误：goroutine 无法退出
func processData(ch chan Data) {
    for {
        data := <-ch // 如果 ch 被关闭，这里会一直阻塞
        process(data)
    }
}

// ✅ 正确：使用 context 或 done channel
func processData(ctx context.Context, ch chan Data) {
    for {
        select {
        case data, ok := <-ch:
            if !ok {
                return
            }
            process(data)
        case <-ctx.Done():
            return
        }
    }
}
```

---

## 4. 并发安全

### 检查要点

#### 4.1 共享变量竞态

**问题模式**：
```go
// ❌ 错误：多个 goroutine 同时写共享变量
var counter int

func increment() {
    for i := 0; i < 1000; i++ {
        go func() {
            counter++ // 竞态条件
        }()
    }
}

// ✅ 正确：使用 sync.Mutex 或 atomic
var (
    counter int
    mu      sync.Mutex
)

func increment() {
    for i := 0; i < 1000; i++ {
        go func() {
            mu.Lock()
            counter++
            mu.Unlock()
        }()
    }
}

// 或使用 atomic
var counter int64

func increment() {
    for i := 0; i < 1000; i++ {
        go func() {
            atomic.AddInt64(&counter, 1)
        }()
    }
}
```

#### 4.2 Map 并发读写

**问题模式**：
```go
// ❌ 错误：并发读写普通 map
var data = make(map[string]string)

func writeToMap(key, value string) {
    data[key] = value // 并发写入会 panic
}

// ✅ 正确：使用 sync.RWMutex 或 sync.Map
var (
    data = make(map[string]string)
    mu   sync.RWMutex
)

func writeToMap(key, value string) {
    mu.Lock()
    data[key] = value
    mu.Unlock()
}

// 或使用 sync.Map
var data sync.Map

func writeToMap(key, value string) {
    data.Store(key, value)
}
```

---

## 5. 安全漏洞

### 检查要点

#### 5.1 SQL 注入

**问题模式**：
```go
// ❌ 错误：字符串拼接 SQL
func getUserByID(id string) (*User, error) {
    query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", id)
    // 直接拼接会导致 SQL 注入
}

// ✅ 正确：使用参数化查询
func getUserByID(id string) (*User, error) {
    var user User
    err := db.Where("id = ?", id).First(&user).Error
    return &user, err
}
```

#### 5.2 命令注入

**问题模式**：
```go
// ❌ 错误：用户输入直接拼接命令
func listFiles(dir string) ([]byte, error) {
    return exec.Command("ls", dir).Output()
}

// ✅ 正确：验证输入
func listFiles(dir string) ([]byte, error) {
    // 验证 dir 是否在允许的范围内
    if !isValidDir(dir) {
        return nil, fmt.Errorf("invalid directory")
    }
    return exec.Command("ls", dir).Output()
}
```

#### 5.3 敏感信息泄露

**问题模式**：
```go
// ❌ 错误：日志记录敏感信息
log.Printf("User login: password=%s", password)

// ❌ 错误：错误信息包含敏感信息
return fmt.Errorf("database connection failed: password=%s", dbPassword)

// ✅ 正确：避免记录敏感信息
log.Printf("User login: username=%s", username)
return fmt.Errorf("database connection failed: check credentials")
```

---

## 6. 性能问题

### 检查要点

#### 6.1 循环中的重复操作

**问题模式**：
```go
// ❌ 错误：每次循环都创建新对象
func processItems(items []string) []Result {
    var results []Result
    for _, item := range items {
        result := getResult(item)
        results = append(results, result)
    }
    return results
}

// ✅ 正确：预分配切片容量
func processItems(items []string) []Result {
    results := make([]Result, 0, len(items))
    for _, item := range items {
        results = append(results, getResult(item))
    }
    return results
}
```

#### 6.2 字符串拼接

**问题模式**：
```go
// ❌ 错误：循环中使用 + 拼接字符串
func concatStrings(items []string) string {
    var result string
    for _, item := range items {
        result += item // 每次都创建新字符串
    }
    return result
}

// ✅ 正确：使用 strings.Builder
func concatStrings(items []string) string {
    var builder strings.Builder
    for _, item := range items {
        builder.WriteString(item)
    }
    return builder.String()
}
```

#### 6.3 N+1 查询问题

**问题模式**：
```go
// ❌ 错误：循环中查询数据库
func getUsersWithOrders(userIDs []int) ([]User, error) {
    var users []User
    for _, id := range userIDs {
        var user User
        db.Preload("Orders").First(&user, id)
        users = append(users, user)
    }
    return users, nil
}

// ✅ 正确：批量查询
func getUsersWithOrders(userIDs []int) ([]User, error) {
    var users []User
    err := db.Preload("Orders").Where("id IN ?", userIDs).Find(&users).Error
    return users, err
}
```

---

## 检查清单总结

| 类别 | 检查项 | 严重程度 |
|------|--------|----------|
| 空指针 | 指针解引用前判空 | Critical |
| 空指针 | 嵌套字段访问判空 | Critical |
| 空指针 | Map key 存在性检查 | Major |
| 空指针 | 切片边界检查 | Critical |
| 错误处理 | 不忽略错误返回值 | Critical |
| 错误处理 | 错误上下文完整 | Major |
| 错误处理 | 使用 errors.Is/As | Major |
| 错误处理 | 避免库代码 panic | Critical |
| 资源泄漏 | defer Close() | Critical |
| 资源泄漏 | 事务回滚/提交 | Critical |
| 资源泄漏 | Goroutine 可退出 | Critical |
| 并发安全 | 共享变量加锁 | Critical |
| 并发安全 | Map 并发安全 | Critical |
| 安全漏洞 | SQL 参数化 | Critical |
| 安全漏洞 | 命令注入防护 | Critical |
| 安全漏洞 | 敏感信息保护 | Critical |
| 性能问题 | 切片预分配 | Minor |
| 性能问题 | 字符串拼接优化 | Minor |
| 性能问题 | 避免 N+1 查询 | Major |
