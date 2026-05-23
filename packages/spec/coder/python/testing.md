# Python 测试规范

> 仅在 Python 项目中应用以下规范

## 核心原则

- 每个行为一个测试：失败时易于定位
- 先测错误路径：不只测 happy path
- Mock 替代外部调用：数据库、HTTP、文件系统
- 测试间无共享状态：每个测试独立运行和清理

## 测试框架

统一使用 pytest，搭配以下工具：

| 工具 | 用途 |
|------|------|
| pytest | 测试框架 |
| pytest-cov | 覆盖率 |
| pytest-asyncio | 异步测试 |
| freezegun | 时间控制 |
| unittest.mock | Mock |

## 测试结构（AAA 模式）

```python
def test_user_creation():
    # Arrange - 准备数据
    data = {"username": "test", "email": "test@example.com"}

    # Act - 执行操作
    user = service.create_user(data)

    # Assert - 验证结果
    assert user.id is not None
    assert user.email == "test@example.com"
```

## 测试命名

模式：`test_<单元>_<场景>_<期望结果>`

```python
# GOOD
def test_create_user_with_valid_data_returns_user():
    ...

def test_create_user_with_duplicate_email_raises_conflict():
    ...

def test_get_user_with_unknown_id_returns_none():
    ...

# BAD
def test_1():      # 无描述
def test_user():   # 太模糊
```

## Fixtures

### 基础 Fixture

```python
@pytest.fixture
def db() -> Generator[Database, None, None]:
    """每个测试独立的数据库连接。"""
    database = Database("sqlite:///:memory:")
    database.connect()
    yield database
    database.disconnect()

def test_query(db):
    results = db.query("SELECT * FROM users")
    assert len(results) >= 0
```

### 作用域

| 作用域 | 生命周期 | 适用场景 |
|--------|---------|---------|
| `function`（默认） | 每个测试函数 | 大多数场景 |
| `module` | 每个测试模块 | 模块级共享资源 |
| `session` | 整个测试会话 | 昂贵的全局资源 |

## 参数化测试

一组输入验证同一行为。

```python
@pytest.mark.parametrize("email,expected", [
    ("user@example.com", True),
    ("test.user@domain.co.uk", True),
    ("invalid.email", False),
    ("@example.com", False),
    ("", False),
])
def test_email_validation(email: str, expected: bool):
    assert is_valid_email(email) == expected
```

## Mock

### Mock 外部 HTTP 调用

```python
from unittest.mock import Mock, patch

def test_get_user_success():
    client = APIClient("https://api.example.com")

    mock_response = Mock()
    mock_response.json.return_value = {"id": 1, "name": "John"}
    mock_response.raise_for_status.return_value = None

    with patch("requests.get", return_value=mock_response) as mock_get:
        user = client.get_user(1)
        assert user["id"] == 1
        mock_get.assert_called_once_with("https://api.example.com/users/1")
```

### Mock 重试行为

```python
def test_retries_on_transient_error():
    client = Mock()
    client.request.side_effect = [
        ConnectionError("Failed"),
        ConnectionError("Failed"),
        {"status": "ok"},
    ]
    service = ServiceWithRetry(client, max_retries=3)
    result = service.fetch()
    assert result == {"status": "ok"}
    assert client.request.call_count == 3
```

## 异常测试

```python
def test_division_by_zero():
    with pytest.raises(ZeroDivisionError, match="Division by zero"):
        divide(5, 0)

def test_invalid_input_type():
    with pytest.raises(TypeError, match="must be numbers"):
        divide("10", 5)
```

## 时间控制（freezegun）

```python
from freezegun import freeze_time

@freeze_time("2026-01-15 10:00:00")
def test_token_expiry():
    token = create_token(expires_in_seconds=3600)
    assert not token.is_expired()
```

## 测试标记

```python
@pytest.mark.slow
def test_heavy_computation(): ...

@pytest.mark.integration
def test_database_query(): ...

@pytest.mark.skip(reason="功能未实现")
def test_future_feature(): ...
```

```bash
pytest -m "not slow"         # 跳过慢测试
pytest -m integration        # 只跑集成测试
```

## 覆盖率

```bash
pytest --cov=myapp tests/                     # 基础覆盖率
pytest --cov=myapp --cov-report=html tests/   # HTML 报告
pytest --cov=myapp --cov-fail-under=80 tests/ # 低于 80% 失败
pytest --cov=myapp --cov-report=term-missing  # 显示未覆盖行
```

## 目录结构

```
tests/
├── conftest.py              # 共享 fixtures
├── unit/                    # 单元测试
│   ├── test_models.py
│   └── test_services.py
├── integration/             # 集成测试
│   ├── test_api.py
│   └── test_database.py
└── e2e/                     # 端到端测试
    └── test_workflows.py
```

## 使用建议

| 场景 | 方法 |
|------|------|
| 编写新功能测试 | AAA 模式 + pytest |
| 测试多种输入组合 | 参数化 `@pytest.mark.parametrize` |
| 隔离外部依赖 | `unittest.mock` + `patch` |
| 测试时间相关逻辑 | `freezegun` |
| 测试异常/错误路径 | `pytest.raises` + `match` |
| 验证重试逻辑 | Mock `side_effect` 列表 |
| 持续集成覆盖率门控 | `--cov-fail-under=80` |
