# Python 设计模式

> 仅在 Python 项目中应用以下模式

## KISS 原则

选择最简单的可行方案，复杂度必须由具体需求证明。

```python
# 过度设计：注册式工厂
class FormatterFactory:
    _formatters: dict[str, type[Formatter]] = {}

    @classmethod
    def register(cls, name: str):
        def decorator(fmt_cls):
            cls._formatters[name] = fmt_cls
            return fmt_cls
        return decorator

    @classmethod
    def create(cls, name: str) -> Formatter:
        return cls._formatters[name]()

# 简单：直接用字典
FORMATTERS = {"json": JsonFormatter, "csv": CsvFormatter}

def get_formatter(name: str) -> Formatter:
    if name not in FORMATTERS:
        raise ValueError(f"Unknown format: {name}")
    return FORMATTERS[name]()
```

## 单一职责原则（SRP）

每个类/函数只有一个变更原因。HTTP 解析、业务逻辑、数据访问必须分离。

```python
# BAD: Handler 做所有事
class UserHandler:
    async def create_user(self, request: Request) -> Response:
        data = await request.json()           # HTTP 解析
        if not data.get("email"):             # 校验
            return Response({"error": "..."}, status=400)
        user = await db.execute("INSERT ...") # 数据访问
        return Response(user.to_dict())       # 响应格式化

# GOOD: 分层职责
class UserService:
    """业务逻辑。"""
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    async def create_user(self, data: CreateUserInput) -> User:
        user = User(email=data.email, name=data.name)
        return await self._repo.save(user)

class UserHandler:
    """仅处理 HTTP。"""
    def __init__(self, service: UserService) -> None:
        self._service = service

    async def create_user(self, request: Request) -> Response:
        data = CreateUserInput(**(await request.json()))
        user = await self._service.create_user(data)
        return Response(user.to_dict(), status=201)
```

## 分层架构

```
┌──────────────────────────────────┐
│  API 层（handlers/routes）        │
│  - 解析请求 / 格式化响应           │
└──────────────┬───────────────────┘
               ▼
┌──────────────────────────────────┐
│  Service 层（业务逻辑）            │
│  - 领域规则 / 校验 / 编排          │
│  - 尽量纯函数                     │
└──────────────┬───────────────────┘
               ▼
┌──────────────────────────────────┐
│  Repository 层（数据访问）         │
│  - SQL 查询 / 外部 API / 缓存     │
└──────────────────────────────────┘
```

依赖方向：API → Service → Repository，禁止反向引用。

## 组合优于继承

通过组合对象构建行为，而非继承扩展。

```python
# BAD: 继承，紧耦合，难测试
class EmailNotificationService(NotificationService):
    def __init__(self):
        super().__init__()
        self._smtp = SmtpClient()  # 难以 mock

# GOOD: 组合，灵活，可测试
class NotificationService:
    def __init__(
        self,
        email_sender: EmailSender,
        sms_sender: SmsSender | None = None,
    ) -> None:
        self._email = email_sender
        self._sms = sms_sender

# 测试时轻松替换
service = NotificationService(
    email_sender=FakeEmailSender(),
    sms_sender=FakeSmsSender(),
)
```

## 三次法则（Rule of Three）

出现三次重复再抽象。两次重复可以忍受，错误的抽象比重复更糟。

```python
# 两个相似函数？先别抽象
# 只有出现第三个相似案例，且验证了真正的共性，才提取
```

## 依赖注入

通过构造函数传入依赖，用 `Protocol` 定义接口。

```python
from typing import Protocol

class Cache(Protocol):
    async def get(self, key: str) -> str | None: ...
    async def set(self, key: str, value: str, ttl: int) -> None: ...

class UserService:
    def __init__(self, repo: UserRepository, cache: Cache) -> None:
        self._repo = repo
        self._cache = cache

# 生产环境
service = UserService(repo=PostgresUserRepo(db), cache=RedisCache(r))

# 测试环境
service = UserService(repo=InMemoryUserRepo(), cache=FakeCache())
```

## 常见反模式

### 暴露内部类型

```python
# BAD: ORM 模型泄露到 API
@app.get("/users/{id}")
def get_user(id: str) -> UserModel:  # SQLAlchemy model
    return db.query(UserModel).get(id)

# GOOD: 使用响应 Schema
@app.get("/users/{id}")
def get_user(id: str) -> UserResponse:
    user = db.query(UserModel).get(id)
    return UserResponse.from_orm(user)
```

### 混合 IO 与业务逻辑

```python
# BAD: SQL 嵌在业务逻辑中
def calculate_discount(user_id: str) -> float:
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", user_id)

# GOOD: Repository 模式，业务逻辑纯函数
def calculate_discount(user: User, order_history: list[Order]) -> float:
    if len(order_history) > 10:
        return 0.15
    return 0.0
```

## 使用建议

- **KISS**：所有场景优先，除非复杂度有明确理由
- **SRP**：Handler/Service/Repository 三层分离
- **组合优于继承**：需要灵活扩展和测试时
- **三次法则**：犹豫是否抽象时的决策依据
- **依赖注入**：所有需要测试的 Service 类
