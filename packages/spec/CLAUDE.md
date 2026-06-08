# 回复要求
- 必须使用中文回复

# 代码规范
- 代码中的函数、类、对象都必须有中文注释，注释风格遵守不同编程语言的规范；
- 代码编写要考虑易读性、易维护、可扩展性；避免过度耦合、过度设计
- 对于流程复杂的业务，必须有对应的业务流程注释、代码实现说明

# Git 提交规范
- 禁止自动提交git 禁止自动提交git 禁止自动提交git
- 禁止使用 git worktree，不得创建、切换或操作 worktree
- **Co-Authored-By 禁止**: git 提交信息中不能包含 "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 或类似的 AI 协作者信息
- **提交信息格式**: 使用简洁明了的中文提交信息，遵循 Conventional Commits 格式（如 feat:, fix:, style: 等）
- **提交内容**: 只提交实际修改的代码文件，不要提交自动生成的文件或时文件

# Golang（仅在 Go 项目中生效）
@import ./coder/golang/my_style.md
@import ./coder/golang/patterns.md
@import ./coder/golang/concurrency.md

# Python（仅在 Python 项目中生效）
@import ./coder/python/my_style.md
@import ./coder/python/patterns.md
@import ./coder/python/performance.md
@import ./coder/python/testing.md

# TypeScript（仅在 TypeScript 项目中生效）
@import ./coder/typescript/my_style.md
@import ./coder/typescript/advanced_types.md
@import ./coder/typescript/expert_guide.md

# 联网搜索
- 禁止使用内置 WebSearch 工具进行网络搜索
- 所有联网操作必须使用 web-access skill

# SKILL使用
- 禁止直接操作git，自动提交代码;
- 当使用writing-plans编写计划时，文件名格式为: "YYYY-MM-DD_HH-xx.md" ;注意HH是小时，时区是: Asia/Shanghai; xx 代表计划名称,名称使用中文；
- 当使用writing-plans编写计划时，最后一段生成git commit 改动信息；后续人工提交使用；