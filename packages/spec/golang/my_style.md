# Golang 编码规范

> 仅在 Go 项目中应用以下规范

## Skill 使用

| Skill | 触发场景 | 核心要求 |
|-------|---------|---------|
| golang-pro | 项目初始化、目录调整、基础库引入 | 标准项目布局(`/cmd`,`/pkg`)；必须传递`context.Context`；适配 Go 新特性与内存优化 |
| golang-patterns | 业务逻辑、接口设计、并发任务 | 优先组合非继承；复杂对象用 Functional Options；并发用 Worker Pool；接口小而精 |
| golang-testing | 提交前、修 Bug、新功能验证 ；`testify/assert`断言+`testify/mock`依赖；性能代码必须 Benchmark；修 Bug 先写失败用例；输出目录统一在`tests/`下 |

## 命名

- 包名：小写无下划线无复数（`net/http` 非 `net/https`）
- 接口：单方法`-er`结尾（`Reader`）；多方法用名词
- 导出函数：驼峰大写开头，不重复包名（`http.Get` 非 `http.HTTPGet`）
- 缩写全大/全小：`HTTPClient` / `httpClient`，禁止 `HttpClient`
- 布尔变量：`Is`/`Has`/`Should` 前缀

## 常量
- 不要在代码中写硬编码，通过定义常量的方式进行使用；
- 同样业务逻辑相关的常量，以常量组(const)的形式命名；
- 不推荐使用itoa关键字，除非特殊情况
- 命名使用驼峰，可导出
- Header相关的常量，以Header为前缀，如HeaderUserId; 如果是引用其他库，则优先取引入库的常量；
- 缓存相关的常量，以Cache为前缀
- 错误相关的常量，以Err为前缀

## 错误处理

- 项目有定义时优先用项目规则
- 命名：`ErrNotFound`（导出）、`errNotFound`（未导出）；自定义类型用 `XxxError`
- 用 `fmt.Errorf("xxx: %w", err)` 包装保留错误链
- 禁止 `_ = mayFail()`，必须处理或显式注明
- 业务错误定义在对应包内，不集中放 `errors` 包

## 接口

- 在使用方定义，而非实现方
- 1-3 个方法为佳，大接口可组合嵌入小接口
- 有第二个实现时再提取，不预先定义

## 函数规范

### 注释模板
```go
// @desc 函数功能描述
// @param paramName Parameter description
// @return returnType Return value description
// @author qinghui.liu
func (s *Struct) Method(ctx context.Context, param string) error {}
```

### 入参与方法
- 第一个参数必须是 `ctx context.Context`（纯计算/类型转换/init/String()/Error() 可省略）
- 禁止内部用 `context.Background()` 替代传入 `ctx`
- 参数不超过 5 个，超出用选项模式或结构体参数
- 返回值最多 3 个，超出封装结构体
- 接收者：1-2 小字段用值接收者，其余指针；同类型保持一致
- 纯计算函数不依赖外部状态

## 依赖管理

- `go.mod` 版本与团队最低运行版本一致
- 禁止 `replace` 本地路径提交到仓库
- 引入三方库前评估维护状态/许可证/依赖链
- 优先标准库和 `x/` 扩展包

## Model 规范

- 一个表一个 Model 文件`xxx_model.go`，命名`XxxModel`，必须实现`TableName()`
- `gorm` 标签映射列名约束，`json` 标签驼峰序列化
- 禁止 Model 嵌入业务逻辑，仅做数据承载
- 优先嵌入 `gorm.Model`；主键不同时手动定义
- 软删除用 `gorm.DeletedAt`；金额用 `decimal.Decimal` 禁止 `float64`
- 状态用 `type Status int` + 常量枚举，禁止魔法数字
- 表相关常量放对应 model 文件，禁止集中到单独常量文件；常量注释与 DB 声明一致

```go
// user_model.go
type UserModel struct {
    gorm.Model
    Username  string     `gorm:"column:username;type:varchar(64);not null;uniqueIndex" json:"username"`
    Status    UserStatus `gorm:"column:status;type:tinyint;not null;default:1" json:"status"`
}
func (UserModel) TableName() string { return "user" }

type UserStatus int
const (
    UserStatusActive  UserStatus = 1 // 活跃
    UserStatusBlocked UserStatus = 2 // 封禁
)
```

## DAO 规范

- 文件`dao_xxx.go`，结构体`XxxDao`，持有`*gorm.DB`，不持有业务状态
- 方法首参 `ctx context.Context`，GORM 调用必须 `.WithContext(ctx)`
- 返回`(结果, error)`，禁止 DAO 层记业务日志或返回业务错误码
- 命名：单条`Get`/`FindByXxx`，列表`List`/`FindXxx`，统计`CountXxx`，写操作`Create`/`Update`/`Delete`/`Upsert`，批量`Batch`前缀
- 可复用查询封装为 GORM Scope
- 事务由 Service 层 `db.Transaction()` 控制，DAO 通过接收 `*gorm.DB`(可能是 tx) 参与事务，禁止 DAO 内部自行开事务
- 禁止拼接原生 SQL，优先 GORM 链式 API；必须用时 `db.Raw()` + 参数占位符

```go
type UserDao interface {
    FindByID(ctx context.Context, id uint) (*UserModel, error)
    ListByStatus(ctx context.Context, status UserStatus, offset, limit int) ([]*UserModel, int64, error)
    Create(ctx context.Context, user *UserModel) error
    BatchCreate(ctx context.Context, users []*UserModel) error
}

type userDaoImpl struct { db *gorm.DB }
func NewUserDao(db *gorm.DB) UserDao { return &userDaoImpl{db: db} }

func (d *userDaoImpl) FindByID(ctx context.Context, id uint) (*UserModel, error) {
    var user UserModel
    err := d.db.WithContext(ctx).First(&user, id).Error
    return &user, err
}

// Service 事务示例：传入 tx 而非 db，DAO 自动运行在事务中
func (s *UserService) CreateUserWithConfig(ctx context.Context, user *UserModel) error {
    return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        txDao := NewUserDao(tx)
        return txDao.Create(ctx, user)
    })
}
```

## 代码整洁度

- 禁止冗余设计：不预留字段/方法/接口/抽象层
- 禁止未使用函数/变量/导入：`go vet` 无警告
- 禁止注释掉代码块：直接删除，需时从 git 恢复
- 禁止 `TODO`/`FIXME` 长期残留
- 同一逻辑不写两遍：第二次提取函数，第三次考虑泛型/接口
- 函数体≤80行，文件≤500行，嵌套≤3层（用卫语句 early return）
- 禁止无意义中间变量：直接返回表达式

```go
// ✗ 嵌套过深 → ✓ 卫语句
func Process(ctx context.Context, req *Request) error {
    if req == nil { return ErrInvalidParam }
    if req.ID <= 0 { return ErrInvalidParam }
    if req.Status != StatusActive { return ErrInactive }
    return nil
}
```

## 单元测试规范

### 1. 测试文件位置
- 所有测试统一写在 `tests/` 目录下，禁止业务包内零散 `_test.go`
- 命名`xxx_test.go`，与被测模块对应

### 2. 项目初始化
- 测试函数执行前必须调用初始化函数（如 `Init`），确保环境一致
- 初始化函数统一在 `tests/` 下编写，职责：加载配置、初始化 DB、注册依赖

```go
// tests/setup.go
var once sync.Once

func Init() {
    once.Do(func() {
        // 加载测试配置、初始化 DB 连接等
    })
}
```

### 3. 完整业务流程覆盖
- 每个被测模块必须包含至少一个**完整业务流程**测试，命名`TestXxxFlow`/`TestXxxE2E`
- 覆盖从入口到终态全链路，而非仅验证单一函数

```go
func TestUserRegisterFlow(t *testing.T) {
    Init()
    ctx := context.Background()
    // 1. 创建
    user := &UserModel{Username: "test_user", Status: UserStatusActive}
    err := userService.Create(ctx, user)
    assert.NoError(t, err)
    // 2. 查询
    found, err := userService.FindByID(ctx, user.ID)
    assert.Equal(t, "test_user", found.Username)
    // 3. 更新
    found.Status = UserStatusBlocked
    assert.NoError(t, userService.Update(ctx, found))
    // 4. 删除
    assert.NoError(t, userService.Delete(ctx, user.ID))
}
```

### 4. 目录结构
```
tests/
├── setup.go                  # 初始化函数
├── user_service_test.go      # 含完整流程
├── order_service_test.go
└── ...
```
