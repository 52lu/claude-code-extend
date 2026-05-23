# Python 性能优化

> 仅在 Python 项目中应用以下规范

## 核心原则

- **先 Profile 再优化**：测量找到真正的瓶颈，不凭直觉优化
- **关注热点路径**：优化运行最频繁的代码
- **选择合适数据结构**：dict 查找、set 判断成员、list 有序遍历
- **避免过早优化**：可读性优先，确认瓶颈后再优化

## 性能分析工具

### cProfile — CPU 性能分析

定位耗时最长的函数。

```python
import cProfile
import pstats
from pstats import SortKey

def main():
    # 业务代码
    pass

if __name__ == "__main__":
    profiler = cProfile.Profile()
    profiler.enable()
    main()
    profiler.disable()

    stats = pstats.Stats(profiler)
    stats.sort_stats(SortKey.CUMULATIVE)
    stats.print_stats(10)  # 打印耗时前 10 的函数
```

命令行：

```bash
python -m cProfile -o output.prof script.py
python -m pstats output.prof
```

### line_profiler — 逐行分析

精确定位函数内哪一行耗时。

```python
# pip install line-profiler
# 在目标函数上加 @profile 装饰器

@profile
def process_data(data):
    result = []
    for item in data:
        processed = item * 2
        result.append(processed)
    return result

# 运行：kernprof -l -v script.py
```

### memory_profiler — 内存分析

追踪内存分配和泄漏。

```python
# pip install memory-profiler

from memory_profiler import profile

@profile
def memory_intensive():
    big_list = [i for i in range(1000000)]
    big_dict = {i: i**2 for i in range(100000)}
    return sum(big_list)

# 运行：python -m memory_profiler script.py
```

### py-spy — 生产环境分析

无需修改代码，可分析运行中的进程。

```bash
# pip install py-spy
py-spy top --pid 12345              # 实时查看
py-spy record -o profile.svg --pid 12345  # 生成火焰图
py-spy dump --pid 12345             # 当前调用栈
```

## 优化模式

### 生成器替代大列表

大数据集用生成器，内存占用恒定。

```python
# BAD: 一次性加载全部到内存
data = [i**2 for i in range(1000000)]
result = sum(data)

# GOOD: 生成器，按需计算
data = (i**2 for i in range(1000000))
result = sum(data)
```

### dict/set 替代 list 查找

查找操作 dict O(1) vs list O(n)。

```python
# BAD: list 查找 O(n)
items = list(range(10000))
if target in items:  # 逐个比较

# GOOD: dict O(1) 或 set O(1)
lookup = set(range(10000))
if target in lookup:  # 哈希查找
```

### 字符串拼接用 join

```python
# BAD: 循环 + 拼接
result = ""
for item in items:
    result += str(item)

# GOOD: join
result = "".join(str(item) for item in items)
```

### 局部变量替代全局变量

局部变量访问速度更快。

```python
# BAD: 循环内访问全局变量
GLOBAL_VALUE = 100
def compute():
    total = 0
    for i in range(10000):
        total += GLOBAL_VALUE  # 每次查全局
    return total

# GOOD: 缓存为局部变量
def compute():
    local_value = GLOBAL_VALUE
    total = 0
    for i in range(10000):
        total += local_value
    return total
```

### lru_cache 缓存重计算

纯函数结果缓存，适合参数固定的重复调用。

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_computation(n: int) -> int:
    # 耗时计算
    return result
```

### 列表推导替代循环

```python
# BAD
result = []
for i in range(n):
    result.append(i**2)

# GOOD
result = [i**2 for i in range(n)]
```

## 使用建议

| 场景 | 工具/方法 |
|------|----------|
| 找不到性能瓶颈在哪 | cProfile → 排序 cumtime |
| 知道哪个函数慢但不知道哪行 | line_profiler |
| 怀疑内存泄漏或内存过高 | memory_profiler |
| 生产环境无法停服分析 | py-spy |
| 大数据集内存不足 | 生成器替代列表 |
| 循环内查找 | dict/set 替代 list |
| 纯函数重复计算 | lru_cache |
| 字符串大量拼接 | join |
