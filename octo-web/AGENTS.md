# AGENTS.md — DMWork 项目工作约定

> 只写这个项目特有的约定。
> 通用工作习惯在 Agent 自身配置里。
> 技术规范在 **DEVELOPMENT.md**。

---

## 开始任务前

读 `DEVELOPMENT.md` — 按顶部"快速查阅"找对应章节，不需要全读。

在分配的 worktree 里工作，不要动主仓库目录。

涉及国际化、多语言或用户可见文案时，先读 `docs/i18n-agent-guide.md`，再运行相关校验。

涉及共享组件、消息渲染、业务卡片、状态聚合、路由、缓存或部署配置时，先读
`../docs/development/no-regression-guideline.md`，并在动代码前写清：

- 本次目标
- 允许改动范围
- 禁止改动范围
- 潜在影响对象
- 保护测试和回归路径

---

## 新建 UI 组件：建议先写 Story 再接业务

```
1. 建组件文件（index.tsx + index.css）
2. 写 Story（ComponentName.stories.tsx）
3. Storybook 里验证通过（light + dark 都看）
4. 再接入业务代码
```

顺序不能颠倒。建议新组件总是包含 Story，在 Storybook 里手动验证。

Story 写法见 DEVELOPMENT.md 章节四、六。

---

## 禁止事项

详细规范见 DEVELOPMENT.md 对应章节，以下为核心约束：

- **硬编码颜色/间距/圆角** → 章节二
- **`!important`** → 章节十三
- **直接覆盖 Semi class** → 章节十三
- **在组件里创建新颜色变量** → 章节十三
- **`@media (prefers-color-scheme: dark)`** → 章节十三

---

## UI/数据分离架构

本项目采用分层结构：

- `ui/` — UI 组件（新组件统一放这里，用 `pnpm gen:component` 生成）
- `bridge/` — 数据桥接层（types.ts + use*.ts）
- `Components/` / `Messages/` — 现有组件库

---

## 防串改与回归约束

以下改动自动视为高风险，不能只测当前页面：

- 群聊消息渲染链路
- 业务卡片聚合、折叠、展开、状态更新
- 多业务共用的卡片壳层、右侧栏、详情入口
- 公共 adapter、utils、bridge、store
- 静态资源、Nginx、缓存策略、构建配置

高风险改动必须先补充或选择保护测试，再修改实现。至少验证：

- 当前业务链路可用
- 相邻业务链路不受影响
- 刷新页面和重新进入后仍可用
- 线上实际加载的是新构建产物

测试数据必须使用 `[SMOKE]`、`[QA]`、`[REGRESSION]` 或
`[DO-NOT-DELETE]` 前缀，禁止生成看起来像真实业务的数据。
