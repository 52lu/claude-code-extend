# Python 编码规范

> 仅在 Python 项目中应用以下规范

## Skill 使用

| Skill | 触发场景 | 核心要求 |
|-------|---------|---------|
| python-design-patterns | 设计新组件/服务、重构复杂代码、决定是否创建抽象、选择继承还是组合、评估代码耦合度 | KISS 优先；单一职责；组合优于继承；三次重复再抽象；依赖注入保证可测试性 |
| python-testing-patterns | 编写测试、搭建测试基础设施、TDD、Mock 外部依赖、测试异步代码、CI/CD 测试 | pytest + fixtures + 参数化；每个行为一个测试；先测错误路径；Mock 替代外部调用；命名 test\_\<unit\>\_\<scenario\>\_\<expected\> |
| python-performance-optimization | 定位性能瓶颈、降低延迟、优化 CPU/内存/IO、加速数据处理管道 | 先 Profile 再优化；cProfile 定位热点；生成器替代大列表；dict/set 替代 list 查找；lru\_cache 缓存重计算 |
| dataverse-python-production-code | 生成生产级代码、错误处理设计、重试逻辑、日志规范、类型标注 | 完整错误层次结构；指数退避重试；logger 替代 print；全部函数加 type hints + docstrings；PEP 8 |
| fastapi-python | 开发 FastAPI 应用、编写 API 路由/中间件、异步接口设计、请求校验与序列化、依赖注入 | async def 路由；Pydantic 校验请求/响应；Depends 注入依赖；中间件处理横切关注点；结构化错误响应 |

## 命名

- 包名：小写无下划线（`myapp` 非 `my_app`），简短有意义
- 模块名：小写下划线（`user_service.py` 非 `userService.py`）
- 类名：大驼峰（`UserService`），异常类以 `Error` 结尾（`ValidationError`）
- 函数/方法：小写下划线（`get_user_by_id`），私有方法单下划线前缀（`_internal_process`）
- 常量：全大写下划线（`MAX_RETRY_COUNT`）
- 布尔变量/方法：`is_`/`has_`/`should_` 前缀（`is_active`, `has_permission`）

## 类型标注

- Python 3.10+ 项目使用内置语法（`str | None` 而非 `Optional[str]`）
- 所有公开函数必须添加参数和返回值类型标注
- 私有函数推荐标注，复杂逻辑必须标注
- 使用 `Protocol` 定义接口，而非 `ABC`
- 容器类型用泛型（`list[str]` 而非 `List[str]`）

```python
def get_user(user_id: str) -> User | None:
    """根据 ID 获取用户，不存在返回 None。"""
    ...

class Sender(Protocol):
    async def send(self, message: str) -> None: ...
```

## 错误处理

- 业务错误定义自定义异常层次结构，不直接抛 `ValueError`/`RuntimeError`
- 用 `raise ... from err` 保留异常链
- 禁止裸 `except:` 或 `except Exception:` 吞掉异常
- 临时错误（网络超时、429）实现指数退避重试
- 日志记录错误时包含上下文信息

```python
class AppError(Exception):
    """应用基础异常。"""

class NotFoundError(AppError):
    """资源不存在。"""

class ValidationError(AppError):
    """输入校验失败。"""

async def fetch_user(user_id: str) -> User:
    try:
        return await repo.get(user_id)
    except DatabaseError as e:
        raise NotFoundError(f"用户 {user_id} 不存在") from e
```

## 函数规范

### Docstring

```python
def calculate_discount(user: User, order_history: list[Order]) -> float:
    """计算用户折扣比例。

    Args:
        user: 用户信息。
        order_history: 用户历史订单列表。

    Returns:
        折扣比例，0.0 ~ 1.0。
    """
    ...
```

### 入参与返回
- 参数不超过 5 个，超出用 dataclass/Pydantic 封装
- 返回值不超过 3 个，超出封装结构体
- 纯计算函数不依赖外部状态，便于测试

## 依赖注入

- 通过构造函数注入依赖，便于测试时替换为 Fake 实现
- 使用 `Protocol` 定义依赖接口
- 禁止在类内部直接 `import` 并实例化外部服务

```python
class Cache(Protocol):
    async def get(self, key: str) -> str | None: ...
    async def set(self, key: str, value: str, ttl: int) -> None: ...

class UserService:
    def __init__(self, repo: UserRepository, cache: Cache) -> None:
        self._repo = repo
        self._cache = cache
```

## 代码整洁度

- 禁止冗余设计：不预留字段/方法/接口/抽象层
- 禁止未使用函数/变量/导入
- 禁止注释掉代码块：直接删除，需时从 git 恢复
- 禁止 `TODO`/`FIXME` 长期残留
- 同一逻辑不写两遍：第二次提取函数，第三次考虑泛型/抽象
- 函数体≤50行，嵌套≤3层（用卫语句 early return）
- 禁止无意义中间变量：直接返回表达式

```python
# 嵌套过深 -> 卫语句
def process(data: dict) -> Result:
    if not data:
        return Result.error("empty")
    if data.get("status") != "active":
        return Result.error("inactive")
    return Result.ok(transform(data))
```

## 日志规范

- 使用标准库 `logging`，禁止 `print()` 输出信息
- 模块级 `logger = logging.getLogger(__name__)`
- 日志级别：DEBUG 调试 / INFO 关键流程 / WARNING 异常但不影响主流程 / ERROR 需要关注 / CRITICAL 系统不可用
- 日志包含上下文：`logger.info("用户创建成功", user_id=user.id)`

## Model 规范

- 使用 Pydantic BaseModel 做数据校验和序列化
- ORM Model 与 API Schema 分离，禁止将 ORM 对象直接返回给 API 层
- 金额用 `Decimal` 禁止 `float`
- 状态用 `StrEnum` / `IntEnum` + 常量枚举，禁止魔法数字

```python
from enum import StrEnum
from decimal import Decimal
from pydantic import BaseModel

class UserStatus(StrEnum):
    ACTIVE = "active"
    BLOCKED = "blocked"

class UserCreate(BaseModel):
    username: str
    email: str
    status: UserStatus = UserStatus.ACTIVE
```

## 代码结构

```
1. Imports（标准库 → 三方库 → 本地模块，各组之间空一行）
2. 常量和枚举
3. 异常类
4. 日志配置
5. 辅助函数
6. 主 Service 类
```
