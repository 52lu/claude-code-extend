# Codex 用户级个人规范

本文件为 Codex 使用的用户级规则版本，源规范目录固定维护于：
`/Users/horizon/SelfSpace/claude-code-extend/packages/spec`

## 回复语言
- 必须使用中文回复。

## 代码编写要求
- 代码中的函数、类、对象应补充中文注释，注释风格遵守对应语言规范。
- 代码实现应优先保证易读性、易维护性、可扩展性，避免过度耦合和过度设计。
- 对流程复杂的业务逻辑，应补充业务流程说明和必要的实现说明。
- 禁止在循环中查数据库（避免 N+1 查询）：需要获取关联数据时，必须先收集主键/外键集合，一次性批量查询（IN 查询或批量接口），再在内存中通过 map/字典组装数据；不得在 for/range 循环体内调用单条查询接口。代码 demo 如下：

  ```go
  // ❌ 反例：在循环中逐条查询作者，每次循环触发一次 DB 查询，产生 N+1 问题
  for i := range articles {
      author, err := articleRepo.GetAuthorByID(ctx, articles[i].AuthorID) // 循环内查 DB，禁止
      if err != nil {
          return err
      }
      articles[i].Author = author
  }

  // ✅ 正例：先收集 ID 批量查询，再在内存中按 map 组装数据
  // 1. 收集需要查询的作者 ID（去重）
  authorIDSet := make(map[int64]struct{}, len(articles))
  for _, a := range articles {
      authorIDSet[a.AuthorID] = struct{}{}
  }
  authorIDs := make([]int64, 0, len(authorIDSet))
  for id := range authorIDSet {
      authorIDs = append(authorIDs, id)
  }

  // 2. 一次性批量查询，返回 map[id]*Author，便于后续组装
  authorMap, err := articleRepo.GetAuthorsByIDs(ctx, authorIDs)
  if err != nil {
      return err
  }

  // 3. 在内存中按主键组装关联数据，无额外 DB 访问
  for i := range articles {
      if author, ok := authorMap[articles[i].AuthorID]; ok {
          articles[i].Author = author
      }
  }
  ```

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
