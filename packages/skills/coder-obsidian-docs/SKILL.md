---
name: coder-obsidian-docs
description: "Obsidian文档编写技能，通过头脑风暴、结构化写作、风格转换三步流程生成高质量Obsidian笔记。使用场景：(1) 编写Obsidian风格的技术文档或学习笔记，(2) 将想法或知识点整理为结构化的Obsidian文档，(3) 生成包含流程图的Obsidian笔记。触发关键词：ob文档编写、ob文档、输出ob文档、生成ob文档"
---

# Coder Obsidian Docs

Obsidian文档编写技能，通过四步工作流生成高质量Obsidian笔记。

## 配置管理

本技能的输出路径通过配置文件管理，首次使用时引导用户设置，后续自动读取不再询问。

配置文件路径: `~/.claude/skills/coder-obsidian-docs/config.json`

配置文件格式:
```json
{
  "doc_root": "/path/to/obsidian/docs",
  "canvas_root": "/path/to/obsidian/canvas"
}
```

**注意**: `canvas_root` 和 `doc_root` 必须是不同的目录，canvas 文件独立存放。

### 配置读取逻辑

执行 Step 3 和 Step 4 前，检查配置文件：

1. **配置文件不存在或字段缺失**: 使用 `AskUserQuestion` 逐项要求用户输入路径，保存到配置文件后继续
2. **配置文件存在且完整**: 直接使用配置的路径，不再询问
3. **用户主动要求修改路径**: 更新配置文件中的对应字段，继续使用新路径

### 修改配置

当用户说"修改文档路径"、"修改canvas路径"、"更改输出目录"等时，使用 `AskUserQuestion` 收集新路径，更新配置文件。

## 工作流

```
用户请求 → Step 1 头脑风暴 → Step 2 文档编写 → Step 3 风格转换 → Step 4 文档输出
```

### Step 1: 头脑风暴

调用 `brainstorming` skill，与用户确认以下内容：

- **文档主题**: 核心主题和覆盖范围
- **目标读者**: 文档面向的受众
- **文档风格**: 技术深度、语言风格（中文/英文）、正式程度
- **结构大纲**: 章节划分和重点内容
- **是否需要流程图**: 识别哪些部分适合用可视化表达

完成头脑风暴后，输出确认的文档大纲供用户审核。

### Step 2: 文档编写

调用 `documentation-writer` skill，基于Step 1确认的大纲编写文档内容。

编写要求：
- 遵循 Diátaxis 文档框架原则
- 内容准确、结构清晰、示例具体
- 使用中文编写（除非用户另有要求）

### Step 3: 风格转换

将Step 2产出的内容转换为Obsidian格式：

1. **调用 `obsidian-markdown` skill** 转换文档格式，包括：
   - 添加 frontmatter (tags, date, aliases 等属性)
   - **在 frontmatter 之后、正文内容之前，插入以下警示 callout**（所有文档必须包含）：
     ```markdown
     > [!warning] ⚠️ 温馨提示
     > **我已经帮您完成了文档编写，但我无法替你吸收和学习,请保持持续进化,勿做工具人！**
     ```
   - 使用 `[[wikilinks]]` 替代普通链接
   - 使用 `> [!note]` 等 callout 语法
   - 使用 Obsidian 特有的嵌入语法

2. **流程图处理**：根据流程复杂度选择方案：

   | 场景 | 方案 | 说明 |
   |------|------|------|
   | 简单流程（节点少、线性走向） | Mermaid | 直接内嵌在文档中，轻量直观 |
   | 复杂流程（多分支、多层级、网状关系） | json-canvas | 调用 `json-canvas` skill，独立 canvas 文件 |
   | 不确定复杂度 | 询问用户 | 向用户说明两种方案优劣，由用户决定 |

   - 使用 Mermaid 时：直接在文档中写入 ` ```mermaid ``` ` 代码块
   - 使用 json-canvas 时：
     - 读取配置中的 `canvas_root` 作为保存目录（未配置则询问用户，保存后不再询问）
     - canvas 文件保存到 `canvas_root`
     - 在文档中使用 `![[filename.canvas]]` 嵌入引用

### Step 4: 文档输出

1. 读取配置中的 `doc_root` 作为文档根目录（未配置则询问用户，保存后不再询问）

2. 在 `doc_root` 下查找与文档主题匹配的子目录

3. 向用户确认目标子目录和文件名

4. 保存文档到确认的路径

5. 文档名称格式: 编号.名称.md ⚠️ 
  - 编号必须是唯一的，不能重复,保持有序递增; 
  - 编号的生成规则参考所在目录的其他文件;

## 执行规范

- 每个Step完成后向用户汇报当前进度
- Step 1 的头脑风暴结果必须经用户确认后才进入Step 2
- Step 4 的目标目录必须经用户确认后才保存文件
