# Richcard codex 一大轮修改 · 回滚 PRD 缺失 + 修复测试发现的 bug

> 日期：2026-06-24
> 关联：
> - PRD `octo-richcard-product-requirements.md` v1.1（已按 codex 改动 #1/#2/#4/#5 更新）
> - codex 改动：`1f0fa13 feat: refine matter richcard preview flow` + `c57cd8a feat: close richcard matter and summary loops` + `eaf3ad3 Implement rich card aggregation and summary states`

## 目标

1. **保留 codex 这一轮的设计意图**：Matter 同 entityId 卡片堆叠、群总结状态/动作重排、堆叠展开 history-card。
2. **补齐 PRD 仍要求但当前实现缺失的能力**：标记完成、Matter 来源说明、summary `revised/failed` 状态。
3. **修复手动测试发现的两条 bug**：右侧 MatterDetailPanel 缺"进入模块详情页"入口；卡片上"进入 Matter"按钮点不动。
4. **收敛 codex 自身实现风险**：`forceStandalone()` 一刀切、聚合 mutate 原始 message.content、死 CSS。

## 文件清单（按 Phase 出现顺序）

修改：

- `octo-web/packages/dmworktodo/src/utils/businessCard.ts`
- `octo-web/packages/dmworktodo/src/utils/__tests__/businessCard.test.ts`
- `octo-web/packages/dmworktodo/src/module.tsx`
- `octo-web/packages/dmworktodo/src/panel/MatterDetailPanel/index.tsx`
- `octo-web/packages/dmworkbase/src/Messages/BusinessCard/BusinessCardView.tsx`
- `octo-web/packages/dmworkbase/src/Messages/BusinessCard/index.css`
- `octo-web/packages/dmworkbase/src/Messages/BusinessCard/index.tsx`
- `octo-web/packages/dmworkbase/src/Messages/Base/index.tsx`
- `octo-web/packages/dmworkbase/src/Components/Conversation/vm.ts`

新增：

- 无（所有修复都在现有文件内）

测试：

- `octo-web/packages/dmworktodo/src/utils/__tests__/businessCard.test.ts`（断言更新）
- `octo-web/packages/dmworkbase/src/Messages/BusinessCard/__tests__/BusinessCardView.test.ts`（断言更新）
- `octo-web/packages/dmworkbase/src/Components/Conversation/__tests__/messageOrder.test.ts`（断言更新）
- `octo-web/e2e/richcard-full-acceptance.spec.ts`（M-04 + S-02 在真实环境验证）

---

## Phase 0 — 现场诊断（先做，约 15-30 分钟）

**目标**：把"卡片上进入 Matter 点不动 / 右侧栏没有进入模块详情页"两条 bug 的真实根因锁定到 1-2 个候选，不全跑 Phase 1.5。

- [ ] **Step 0.1：复现并抓 Console**
  - 在测试环境点击 Matter 卡的"进入 Matter"按钮。
  - 打开 DevTools Console，记录：
    - 是否有 Toast（文案是什么 — 「操作失败」/「加载失败」/「保存失败」）。
    - 是否有 `[BusinessCard] action failed` 报错。
    - 是否有 `Cannot read properties of undefined`、`switchToMenuById is not a function` 等。

- [ ] **Step 0.2：临时探针**
  在 `octo-web/packages/dmworkbase/src/Messages/BusinessCard/index.tsx` 的 `handleAction` 开头加：
  ```ts
  console.log("[card action]", action.type, {
    entityId: content.entityId,
    extra: content.extra,
    sourceChannelId: content.sourceChannelId,
    sourceChannelType: content.sourceChannelType,
  });
  ```
  打开聊天，点击按钮，记录输出。**完成 Phase 1.5 后必须删除。**

- [ ] **Step 0.3：DOM/CSS 检查**
  - DevTools Elements 选中"进入 Matter"按钮。
  - 确认 `disabled` 属性。
  - Computed 面板看 `pointer-events`。
  - 看父级 z-index 是否被 `wk-business-card-stack-layer*` 盖住。

- [ ] **Step 0.4：右侧栏检查**
  - 点卡片"预览"按钮，看右侧 MatterDetailPanel 有没有滑出。
  - 如果滑出了：DevTools 找 `.wk-mp-header__actions` 这个 div，看里面 `<button>` 数量。
  - 如果没滑出：回到 Step 0.1，是 Toast 吞了事件还是面板 state 没切。

- [ ] **Step 0.5：结论记录**
  把诊断结果填到下表，再启动 Phase 1.5 对应的修复：

  | 现象 | 锁定到的修复候选 |
  |---|---|
  | 看到 Toast「操作失败」 + entityId 为空 | G1 |
  | 看到 Toast「加载失败」 + channelId 为空 | G1 |
  | 无 Toast，按钮 disabled=false，pointer-events: none | G2 |
  | MatterDetailPanel 滑出但 header__actions 内没按钮 | G3 |
  | mittBus.emit 调用了但 listener 没接到 | G4 |

---

## Phase 1 — 补齐 PRD 仍要求的缺失

### Task 1.A：恢复 `complete_matter` 按钮（R1）

**Files**: `octo-web/packages/dmworktodo/src/utils/businessCard.ts`

**关联**：PRD §7.2 动作表、§9.1 状态表、验收用例 M-04

- [ ] 修改 `getActions(status)` 实现：
  ```ts
  function getActions(status: string): BusinessCardPayload["actions"] {
    const actions: BusinessCardPayload["actions"] = [
      { label: "进入 Matter", type: "open_matter_workspace", kind: "primary" },
      { label: "预览", type: "open_matter", kind: "ghost" },
    ];
    if (status !== "done" && status !== "archived") {
      actions.push({ label: "标记完成", type: "complete_matter", kind: "secondary" });
    }
    return actions;
  }
  ```

- [ ] 同步更新单测：

  **File**: `octo-web/packages/dmworktodo/src/utils/__tests__/businessCard.test.ts`

  原断言：
  ```ts
  expect(card.actions?.map((action) => action.type)).toEqual([
    "open_matter_workspace",
    "open_matter",
  ]);
  ```

  改为：
  ```ts
  expect(card.actions?.map((action) => action.type)).toEqual([
    "open_matter_workspace",
    "open_matter",
    "complete_matter",
  ]);
  ```

  并新增一条 done 状态的用例，断言**不包含** `complete_matter`。

**Acceptance**：dev 预览和真实链路上，非终态 Matter 卡底部出现"标记完成"按钮；done/archived 状态不出现。M-04 验收能跑通。

---

### Task 1.B：Matter 卡来源消息原文不丢（R2 / PRD §14 收敛）

**Files**:
- `octo-web/packages/dmworkbase/src/Components/Conversation/vm.ts`
- `octo-web/packages/dmworkbase/src/Messages/BusinessCard/BusinessCardView.tsx`

**关联**：PRD CARD-05、§7.2 底部"来源说明"、§14 v1.1 风险表

- [ ] 在 `vm.ts` 的 `buildMatterCardHistoryItem` 增加 `sourceText` 字段：
  ```ts
  return {
    id: ...,
    messageSeq: ...,
    status: ...,
    statusText: ...,
    title: ...,
    subtitle: ...,
    body: ...,
    priority: ...,
    metrics: ...,
    actor: ...,
    time: ...,
    updatedAt: ...,
    sourceText: content.extra?.sourceText || "",  // ← 新增
  };
  ```

- [ ] 在 `BusinessCardView.tsx` 的 `getStatusHistory` 类型和 mapper 里把 `sourceText` 透出。

- [ ] 在 history-card 渲染里加一行：
  ```tsx
  {item.sourceText && <span className="wk-business-card-history-source">来源：{item.sourceText}</span>}
  ```

  以及对应 CSS：
  ```css
  .wk-business-card-history-source {
    color: var(--wk-text-tertiary, #8f959e);
    font-size: 12px;
    line-height: 18px;
  }
  ```

**Acceptance**：展开 history-card 列表后，每张历史卡能看到「来源：xxx」灰色脚注；折叠态仍按 codex 设计不显示，让位给 stack-note。

---

### Task 1.C：summary `revised / failed` 状态文案与色调（v1.1 §9.2）

**File**: `octo-web/packages/dmworkbase/src/Messages/BusinessCard/BusinessCardView.tsx`

- [ ] `statusCopy` 补：
  ```ts
  revised: "已修订",
  failed: "失败",
  ```

- [ ] `getSummaryTone(card)` 扩展为：
  ```ts
  function getSummaryTone(card): CardTone {
    if (card.status === "failed") return "warn";
    if (card.status === "revised") return "summary-pending";
    return isSummaryConfirmed(card) ? "summary-confirmed" : "summary-pending";
  }
  ```

- [ ] `getSummaryStatusLabel(card)` 扩展为：
  ```ts
  function getSummaryStatusLabel(card): string {
    if (card.status === "failed") return "失败";
    if (card.status === "revised") return "已修订";
    return isSummaryConfirmed(card) ? "已确认" : "待确认";
  }
  ```

**Acceptance**：把 `status: "failed"` 的 mock summary 卡丢到 dev 预览，看到 warn 黄色徽标 + "失败" 文案；`status: "revised"` 看到 summary-pending 青色 + "已修订" 文案。

---

## Phase 1.5 — 修测试发现的两条 bug

> 依赖 Phase 0 诊断结论，从下列候选挑相应的 1-2 条。

### Task G1：handler 取 matterId / channel 与 vm.ts 对齐（A1/A2 命中时必修）

**File**: `octo-web/packages/dmworktodo/src/module.tsx` `registerBusinessCardActions`

**问题**：`vm.ts` 的 `readMatterCardId` 已经加了 `extra.matterId / extra.matterNo` fallback，但 handler 仍只读 `card.entityId`。当 `entityId` 为空（如旧种子数据、聚合后边界场景）handler 直接 `Toast.error("操作失败") + return true`，按钮"看起来点了但没动"。

- [ ] 修复取值：
  ```ts
  const matterId = card.entityId
    || (card.extra?.matterId as string | undefined)
    || (card.extra?.matterNo as string | undefined);
  ```

- [ ] `channelId / channelType` 缺失时不要静默 Toast。Fallback 到当前会话：
  ```ts
  const currentChannel = WKApp.endpoints.activeConversation?.()?.channel;
  const channelId = card.sourceChannelId || data?.message?.channelId || currentChannel?.channelID;
  const channelType = card.sourceChannelType ?? data?.message?.channelType ?? currentChannel?.channelType;
  ```

- [ ] 即使 channelId/channelType 仍缺，`open_matter_workspace` 也应放行（跳转到 Matter 模块本来就不必带 channel）。只在 `open_matter` 和 `complete_matter` 处理逻辑里要求 channel。

**Acceptance**：Phase 0.2 探针看到 entityId 为空但 extra 里有 matterNo 的卡，点"进入 Matter"能切到 Matter 模块。

---

### Task G2：按钮被堆叠层/伪元素遮挡（A4 命中时）

**File**: `octo-web/packages/dmworkbase/src/Messages/BusinessCard/index.css`

- [ ] 给操作区强制独立栈层：
  ```css
  .wk-business-card-actions {
    position: relative;
    z-index: 4;
  }
  ```

- [ ] 验证 `.wk-business-card--stacked::before { z-index: 3 }` 不会跨越按钮宽度。如果存在 hit-test 问题，把 ::before 改成 `pointer-events: none`。

**Acceptance**：Phase 0.3 在 DevTools 里看不到任何元素 hover 时盖住按钮。

---

### Task G3：MatterDetailPanel 加载态也要渲染"进入 Matter"（B 命中时）

**File**: `octo-web/packages/dmworktodo/src/panel/MatterDetailPanel/index.tsx`

**问题**：header 的"进入 Matter"按钮当前用 `{matter.id && (...)}` 守卫，matter 接口失败/loading 时整个按钮消失，用户感觉"功能没了"。

- [ ] 改成用 prop `matterId` 守卫，并在 `matter` 未加载时禁用按钮但仍渲染：
  ```tsx
  {matterId && (
    <button
      type="button"
      className="wk-mp-header__action"
      onClick={handleOpenMatterWorkspace}
      disabled={!matter}
      title="进入 Matter"
    >
      <PanelRightOpen size={14} />
      <span>进入 Matter</span>
    </button>
  )}
  ```

- [ ] `handleOpenMatterWorkspace` 在 `matter` 为 null 时也能用 `matterId` 跳转：
  ```ts
  const handleOpenMatterWorkspace = useCallback(() => {
    const id = matter?.id || matterId;
    if (!id) return;
    openMatterWorkspace(id, ...);
  }, [matter, matterId, channelId, _channelType]);
  ```

**Acceptance**：右侧栏打开后，无论 matter 是否加载成功，header 右上角都能看到"进入 Matter"按钮；接口失败时按钮 disabled 但可见。

---

### Task G4：mittBus key 校对（如 Phase 0 发现 emit/listener 漂移）

**Files**:
- `octo-web/packages/dmworkbase/src/App.tsx` 的 mittBus 类型声明
- `octo-web/packages/dmworkbase/src/Pages/Chat/index.tsx` 的 listener
- `octo-web/packages/dmworktodo/src/module.tsx` 的 emit

- [ ] 三处 key 都必须是 `"wk:toggle-matter-detail-panel"`，类型声明的 payload 形状一致。
- [ ] 检查 channel 过滤逻辑（`Chat/index.tsx:425-447` 里 `data.channelId !== channel.channelID` 早 return），确认 handler emit 时填的 `channelId/channelType` 与当前打开的会话匹配。

**Acceptance**：emit 调用时打 console.log，Chat 这边对应 listener 也打 log，两边能对上。

---

## Phase 2 — codex 自身实现风险收敛

### Task D：`forceStandalone()` 改成 hook 优先

**File**: `octo-web/packages/dmworkbase/src/Messages/Base/index.tsx`

**关联**：PRD §14 v1.1 风险表 #6

- [ ] 改写：
  ```ts
  forceStandalone() {
    const { context, message } = this.props;
    const hook = context.forceStandaloneMessage?.(message.message);
    if (hook === true) return true;
    if (hook === false) return false;
    return message.contentType === MessageContentTypeConst.businessCard;
  }
  ```

**Acceptance**：bot 折叠 session 内出现 business card 时，仍能尊重上层 hook 决定的 bubble 位置；其他场景默认独立 bubble。

---

### Task E：聚合数据走旁路，不再 mutate `message.content`

**Files**:
- `octo-web/packages/dmworkbase/src/Components/Conversation/vm.ts`
- `octo-web/packages/dmworkbase/src/Messages/BusinessCard/index.tsx`
- `octo-web/packages/dmworkbase/src/Messages/BusinessCard/BusinessCardView.tsx`

**关联**：PRD §7.2 "聚合数据载体"

- [ ] 在 `Components/Conversation/vm.ts` 增加类型与字段：
  ```ts
  export interface StackedMatterMeta {
    updateCount: number;
    statusHistory: ReturnType<typeof buildMatterCardHistoryItem>[];
    stackedClientMsgNos: string[];
  }

  export interface ConversationRenderMessageItem {
    type: "message";
    message: MessageWrap;
    stackedMatterMeta?: StackedMatterMeta;
  }
  ```

- [ ] 重写 `aggregateMatterStatusMessages`：返回 `{ visibleMessages: MessageWrap[]; metaByClientMsgNo: Map<string, StackedMatterMeta> }`；调用方在 push `renderItems` 时把 meta 挂上去；不再调用 `latestContent.applyPayload({ extra })`。

- [ ] `Messages/BusinessCard/index.tsx` 通过 props 接收 `stackedMatterMeta` 并传给 `BusinessCardView`。

- [ ] `BusinessCardView.tsx`：优先用 props 传入的 `stackedMatterMeta`，没传时 fallback 读 `card.extra.statusHistory / updateCount`（保 dev 预览 mock 兼容）。

**Acceptance**：
1. 单测：聚合后的"被隐藏的消息"`.content.extra.statusHistory` 不再被写入。
2. 把同一条 Matter 消息转发到另一群，不再带出 statusHistory。

---

### Task F：清理死 CSS

**File**: `octo-web/packages/dmworkbase/src/Messages/BusinessCard/index.css`

- [ ] 删除：
  - `.wk-business-card-trail`、`.wk-business-card-trail-step`、`.wk-business-card-trail-step span`、`.wk-business-card-trail-step strong`
  - `.wk-business-card-chips`、`.wk-business-card-chips span`
  - `.wk-business-card-updates`、`.wk-business-card-update`、`.wk-business-card-update::before`、`.wk-business-card-update-dot`、`.wk-business-card-update-copy*`
  - `@media (max-width: ...)` 里残留的 `.wk-business-card-trail` 段

- [ ] grep 全工程确认无引用：
  ```bash
  grep -rn "wk-business-card-trail\|wk-business-card-chips\|wk-business-card-update" \
    octo-web/packages octo-web/apps --include="*.ts" --include="*.tsx" --include="*.css"
  ```
  应无命中。

**Acceptance**：CSS 行数 -110 左右；视觉/单测不变。

---

## Phase 3 — 验证

### Task 3.1：单测全绿

- [ ] 运行：
  ```bash
  cd octo-web && pnpm test
  ```
- [ ] 期望以下文件全部通过：
  - `dmworkbase/src/Components/Conversation/__tests__/messageOrder.test.ts`
  - `dmworkbase/src/Messages/BusinessCard/__tests__/BusinessCardView.test.ts`
  - `dmworktodo/src/utils/__tests__/businessCard.test.ts`
  - `dmworktodo/src/utils/__tests__/matterWorkspaceNavigation.test.ts`

### Task 3.2：dev 预览页人眼自检

- [ ] 启动 dev 服务，打开 `richCardPreview` 路由。
- [ ] 切到 `matter-card-open`：看到 4 个按钮（进入 Matter / 标记完成 / 展开 N / 预览 >）；点每个都在右侧动作回放出现一行。
- [ ] 切到 `matter-card-done`：**不**出现"标记完成"按钮。
- [ ] 切到 summary 卡：状态徽标显示"待确认"或"已确认"；切 mock 加一个 `status: "failed"` 的临时样本，看到 warn 色 + "失败"。
- [ ] 任何卡都看不到旧的 trail / chips / 时间轴样式残留。

### Task 3.3：真实环境复测（Phase 0 复现路径）

- [ ] 在测试群里点"进入 Matter"按钮，期望切换到 Matter 模块，模块顶部能看到"返回原群"入口。
- [ ] 在测试群里点"预览"按钮，期望右侧 MatterDetailPanel 滑出。
- [ ] 滑出的面板 header 右上角能看到"进入 Matter"按钮，点击切到 Matter 模块。
- [ ] 在测试群里点"标记完成"按钮，期望 Matter 状态切换到 done，并在群里出现新的状态卡。

### Task 3.4：e2e 验收

- [ ] 运行：
  ```bash
  cd octo-web && pnpm exec playwright test e2e/richcard-full-acceptance.spec.ts --project=chromium
  ```
- [ ] 期望 M-04（标记完成）、S-02（认可 / 需要调整）两条用例通过。

---

## 风险与回滚

| 风险 | 影响 | 缓解 |
|---|---|---|
| Task E 改聚合数据载体涉及 4 个文件、需要透传 props | 改动面广，回归风险高 | 先一步 Phase 1 + Phase 1.5，最后做 Task E；Task E 失败时回退到 codex 原方案（mutate 写法），单加防御 `extra = { ...extra }` 深拷贝 |
| Task G1 改动 handler 取值逻辑可能让原本能跳的卡跳错 | open_matter 用错 channel | 加日志埋点 + 真实环境 smoke test |
| Task G3 改 panel 守卫条件 | 加载错误时按钮可点但跳转报错 | `disabled={!matter}` 兜底；handleOpenMatterWorkspace 内 `if (!id) return` |
| Phase 0 探针忘记删除 | 生产环境 console 噪音 | Phase 1.5 完成后 grep `[card action]` 全工程清理 |

---

## 执行顺序建议

```
Phase 0 (诊断)
  ↓
Phase 1.A → 1.B → 1.C (PRD 缺失补齐，互相独立可并行)
  ↓
Phase 1.5 (按诊断结论挑 G1-G4)
  ↓
真实环境 smoke test（Task 3.3 子集）
  ↓
Phase 2.D (forceStandalone hook 顺序) → 2.F (CSS 清理)
  ↓
Phase 2.E (聚合旁路，最复杂、最后做)
  ↓
Phase 3 完整验证
```

## 最终通过标准

- [ ] Matter 卡非终态状态下显示 4 个动作（进入 Matter / 标记完成 / 展开 N / 预览）
- [ ] Matter 卡 done/archived 状态隐藏"标记完成"
- [ ] 点击"进入 Matter"切到 Matter 模块（手动测试 + e2e）
- [ ] 点击"预览"右侧 MatterDetailPanel 滑出，header 右上角"进入 Matter"按钮可见可点
- [ ] 点击"标记完成"调真实 API + 群内出现新状态卡（e2e M-04）
- [ ] 展开 history-card 列表每张能看到「来源：xxx」
- [ ] summary 卡 `revised / failed` 状态有正确文案和色调
- [ ] business 卡 `forceStandalone()` 尊重 `context.forceStandaloneMessage` hook
- [ ] 聚合产生的 `statusHistory` 不再写入 `message.content.extra`
- [ ] 死 CSS 已清理（grep 验证无引用）
- [ ] 所有单测 + e2e 验收通过
- [ ] PRD v1.1 全部 P0 条款可在真实环境复现
