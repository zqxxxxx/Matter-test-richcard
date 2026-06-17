# TOOLS.md — 执剑人环境笔记

Skills 定义工具怎么工作。这个文件只记录本环境特有信息。

## Environment

- Host: Evanwang 的 MacBook Pro
- OS: macOS / Darwin 24.6.0 arm64
- Workspace: `/Users/evanwang/.openclaw/workspace`
- Runtime: OpenClaw local / main agent
- Default language: 中文

## Channels

### DMWork

- Plugin: `openclaw-channel-dmwork`
- API Server: `https://im.deepminer.com.cn/api`
- Main bot name: 执剑人
- Main bot ID: `27kr3UAA0u36e6e225f_bot`
- Bound agent: `main`
- Status on 2026-05-03: 用户确认 DMWork 能收到回复

注意：不要在文件里保存 bot token / API key。需要时让用户重新提供，或使用安全的密钥管理方式。

### Octo 本地测试栈（Matter 事项工作台）

- Plugin: `openclaw-channel-octo`，账号 `Test`
- 本地栈 bot ID: `27A53HvuZrF68c737e5_bot`（本地空间里的显示名也是「执剑人」）
- API: `http://localhost:28080`，Matter 服务: `http://localhost:28080/matter`
- 凭证已存 octo-cli profile `test`，调用零 token：`octo-cli --profile test api <METHOD> <PATH>`
- octo-cli 不在 PATH 时用绝对路径：`/Users/evanwang/.npm-global/bin/octo-cli`

**Matter 事项规则（收到事项门铃 / 被 @ 派活时）：**

1. 操作前先读操作手册：`octo-cli skills octo-matter`（或 `curl -s http://localhost:28080/matter/skill.md`）。
2. 收到「事项指派 / 打回 / 圈一笔反馈」类通知：先读单
   `octo-cli --profile test api GET /api/v1/matters/<id>`，
   接单置进行中 → 真干活 → 产出写回 → 置审核中。绝不假装完成，绝不自评「完成」。
3. 群里被 @ 托付一件事时：用
   `octo-cli --profile test api POST /api/v1/matters --data '{...}'`
   建单（标题 + 目标 + leader_uid=自己 + source_channel_id=群ID + source_name=群名），
   回一句「已立事项 M-xx，做完叫你」就去干活；不要猜 `matter create` 这种不存在的命令。
4. 干完活把结果发回来源群（简短结论 + 事项编号），详细产出写在事项里。
5. 来自 `notification` 频道的门铃是系统伪用户：**不要在聊天里回它**（发了也是
   403 not_friend），一切动作走 octo-cli 写进事项；处理完输出 `NO_REPLY` 结束。
6. 事项的 timeline/产出是正式工作记录：**绝不往里写「test」之类的探针**。要验证
   API 可用性，用只读的 GET；写操作一步到位写真实内容。
7. 每个事项现在是独立会话（matter:<id>）：上下文只有这一单的事，放心专注；
   跨单背景去读事项树或项目说明，不要假设你记得别的单。

**偏好沉淀（收到「🧠 …该沉淀偏好了」门铃时）：**

1. 读单回看这单里人的圈点、打回理由、验收评语（你所在的会话里多半都有）。
2. 萃取判别闸：**「换一个同类任务这条还成立吗?」** 成立才是偏好；
   只对这单成立的是一次性指令，丢弃。
3. 写进 `~/.openclaw/workspace/preferences/preference.md`（没有就创建），格式：
   `### P-NNN [candidate] 一句话标题`，正文四行
   （⚠️ 铁律:新条目状态**只能写 [candidate]**。[confirmed] 唯一的来源是收到
   「✅ 偏好草案获准」门铃后的改写;直接写 confirmed = 伪造主人授权,严禁）：
   `- rule: 祈使句,≤2 行,可验证` / `- scope: global 或 type=<任务类型>` /
   `- confidence: 1 hit / 0 miss` / `- evidence: M-<seq> 原话摘录≤1行 · 日期`。
   已有同义条目则合并（hits+1）而不是重复新增。**整个文件 ≤150 行**，超了先淘汰。
4. 回事项里发一句你记了什么（如「已沉淀 P-013:报告先给结论」），并把草案提交人审：
   `octo-cli api POST /api/v1/matters/<id>/summary --data '{"content":"P-NNN 标题: rule 一句话"}'`
   （主人会收到「等你过目」门铃。）然后 NO_REPLY。
4b. 收到「✅ 偏好草案获准」门铃：把对应条目 [candidate]→[confirmed]。
    收到「🚫 被否」：删掉对应 candidate，别再按它行事。
5. 下次接到任务：先读 preference.md，按 scope 匹配应用。某条偏好**实质影响了
   这次产出**时，在交付说明里带一句「已应用:P-xxx」（人会反向核对）；
   没实质影响就不用提，别为声明而声明。

## Reference Contexts

### Midori / 小小六 prompt set

用户要求参考以下目录里的风格，但不要机械照搬身份：

`/Users/evanwang/Desktop/工作/Create/My-ai-context/我的Knowhow/提示词/给Midori的Claw`

包含：

- `IDENTITY.md`
- `SOUL.md`
- `AGENTS.md`
- `TOOLS.md`

可继承的原则：高密度、少废话、有判断、先看再动、最小复杂度、边界清晰。

不可直接继承的内容：Midori / 小小六 的身份、Linux 环境、Claude Opus 运行时、微信渠道等旧环境事实。

## Workspace Structure

```text
~/.openclaw/workspace/
├── AGENTS.md
├── SOUL.md
├── IDENTITY.md
├── USER.md
├── TOOLS.md
├── MEMORY.md              # 如不存在，可在需要长期记忆时创建
├── HEARTBEAT.md
└── memory/
    └── YYYY-MM-DD.md
```

## Rendering / Output Notes

- 消息渠道中少用 Markdown 表格
- 中文标点优先使用全角：，。；（）
- 涉及视觉输出时优先生成图片 / HTML / PDF，而不是 ASCII 图
- 涉及秘密时只描述“已配置 / 已存在”，不原样复述 token

## Skill Notes

（使用技能后，如有本机特定路径、账号、设备名，再补充。）
