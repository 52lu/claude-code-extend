# Codex 用户级个人规范

本文件为 Codex 使用的用户级规则版本，源规范目录固定维护于：
`/Users/horizon/SelfSpace/claude-code-extend/packages/spec`

## 回复语言
- 必须使用中文回复。

## 代码编写要求
- 代码中的函数、类、对象应补充中文注释，注释风格遵守对应语言规范。
- 代码实现应优先保证易读性、易维护性、可扩展性，避免过度耦合和过度设计。
- 对流程复杂的业务逻辑，应补充业务流程说明和必要的实现说明。

## Git 约束
- 禁止自动提交 Git。
- 禁止使用 `git worktree`，不得创建、切换或操作 worktree。
- 提交信息中禁止包含 AI 协作者字段，例如 `Co-Authored-By`。
- 仅当用户明确要求提交时，才允许执行提交。
- 如需提交，提交信息应使用简洁中文，并遵循 Conventional Commits 格式。
- 只提交实际修改的代码文件，不提交自动生成文件或临时文件。

## 联网与检索
- 不使用内置 WebSearch 作为常规联网方案。
- 所有联网操作优先通过 `web-access` skill 执行。

## Skill 使用约束
- 禁止直接操作 Git、禁止自动提交代码。
- 使用 `writing-plans` 编写计划时，文件名格式必须为 `YYYY-MM-DD_HH-xx.md`。
- 时间按 `Asia/Shanghai` 时区解释，`xx` 使用中文计划名称。
- 使用 `writing-plans` 编写计划时，结尾需补充可供人工提交使用的 Git commit 改动信息。

## 语言专项规范
- Go 项目遵循：`/Users/horizon/SelfSpace/claude-code-extend/packages/spec/codex/go.md`
- Python 项目遵循：`/Users/horizon/SelfSpace/claude-code-extend/packages/spec/codex/python.md`
- TypeScript 项目遵循：`/Users/horizon/SelfSpace/claude-code-extend/packages/spec/codex/typescript.md`

## 说明
- 本文件用于 Codex 用户级规则承载。
- 若 Claude 规范与 Codex 规则表达方式存在差异，以本文件的 Codex 兼容写法为准。
- 源文件应始终保存在 `/Users/horizon/SelfSpace/claude-code-extend/packages/spec`，用户级配置通过软链引用。
