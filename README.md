# Matter v2 — 改动合集

> 本仓库包含 Octo Matter v2 相关的全部改动，涉及 6 个子仓库。
> 基于 `matter-v2` 分支，用于产研团队同步和讨论。

## 仓库结构

```
octo-matter/             核心 —— Matter 后端 + 嵌入式前端 SPA
octo-server/             IM 服务端 —— bot owner_uid, notify, bot API
octo-web/                Web 前端 —— MatterWorkspace iframe 集成
octo-deployment/         部署 —— Docker Compose + nginx 路由
octo-cli/                CLI 工具 —— Agent skill 文档（v2 操作手册）
openclaw-channel-octo/   OpenClaw 适配器 —— @必达 mention-ack + session 机制
```

## 核心改动清单

### 状态机
- **七态机**: backlog → open → in_progress → blocked → review → done (+ cancelled/archived)
- 完整的转换规则、前端看板/列表/时间线支持

### 视图
- **Timeline 甘特图**: 日/周/月缩放、拖拽调 deadline、右侧属性面板
- **Board 看板**: 6 列自适应、列内拖拽排序、水平惯性滚动
- **List 列表**: 单行 6 列信息密集布局、hover checkbox 批量归档
- **三视图工具栏统一**: ViewSwitch / 筛选 / 视图专属控件

### 数据模型
- **input_attachments**: 输入材料 vs 产出分离，Agent 读单直接拿到附件
- **sort_order**: 拖拽排序持久化
- **默认项目"收件箱"**: 每个 matter 强制绑项目
- **Preference Cards**: Zettelkasten 偏好卡片系统（DB + API + 全文搜索）

### Agent 协作
- **@ 提及 Mention Picker**: 分组（参与人 / 我的 Bot / 其他 Bot）
- **门铃机制**: 创建/状态变化自动通知 Agent
- **Skill 文档**: octo-matter v2 Agent 操作手册

### 部署
- **Docker Compose**: `docker compose up -d` 一键拉起
- **nginx 路由**: `/matter/ui/` → 嵌入式 SPA, `/matter/api/v1/` → API

## 本地部署

```bash
cd octo-deployment/docker
cp .env.example .env
# 编辑 .env 填入密码和 token
docker compose up -d
```

访问 `http://localhost:28080`

## 迁移文件

位于 `octo-matter/migrations/`，编号 014-018：
- 014: backlog 状态
- 015: sort_order
- 016: 强制绑项目
- 017: input_attachments
- 018: preference_cards
