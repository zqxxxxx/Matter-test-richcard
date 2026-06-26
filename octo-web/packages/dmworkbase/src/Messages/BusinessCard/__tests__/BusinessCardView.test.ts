import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessCardView, getBusinessCardActions } from "../BusinessCardView";
import type { BusinessCardPayload } from "../BusinessCardContent";

describe("BusinessCardView actions", () => {
  it("promotes matter cards to the workspace primary action and preview link", () => {
    const card: BusinessCardPayload = {
      id: "matter-legacy",
      cardType: "matter_status",
      title: "Matter 状态返回",
      actions: [
        { label: "查看 Matter", type: "open_matter", kind: "primary" },
        { label: "标记完成", type: "complete_matter", kind: "secondary" },
      ],
    };

    const actions = getBusinessCardActions(card);

    expect(actions.map((action) => action.type)).toEqual([
      "open_matter_workspace",
      "complete_matter",
      "open_matter",
    ]);
    expect(actions[0]).toMatchObject({
      label: "进入 Matter",
      kind: "primary",
    });
    expect(actions[2]).toMatchObject({
      label: "预览",
      kind: "ghost",
    });
  });

  it("prioritizes summary judgement actions and preview", () => {
    const card: BusinessCardPayload = {
      id: "summary-legacy",
      cardType: "summary_feedback",
      title: "群总结反馈",
      actions: [
        { label: "查看总结", type: "open_summary", kind: "primary" },
        { label: "采纳", type: "summary_accept", kind: "secondary" },
        { label: "继续优化", type: "summary_reject", kind: "secondary" },
      ],
    };

    const actions = getBusinessCardActions(card);

    expect(actions.map((action) => action.type)).toEqual([
      "summary_accept",
      "summary_reject",
      "open_summary",
    ]);
    expect(actions[0]).toMatchObject({ label: "认可", kind: "primary" });
    expect(actions[1]).toMatchObject({ label: "继续优化", kind: "secondary" });
    expect(actions[2]).toMatchObject({ label: "预览", kind: "ghost" });
  });

  it("does not duplicate workspace jump actions that already exist", () => {
    const card: BusinessCardPayload = {
      id: "matter-current",
      cardType: "matter_status",
      title: "Matter 状态返回",
      actions: [
        { label: "查看 Matter", type: "open_matter", kind: "primary" },
        { label: "进入 Matter", type: "open_matter_workspace", kind: "secondary" },
      ],
    };

    expect(getBusinessCardActions(card).filter((action) => action.type === "open_matter_workspace")).toHaveLength(1);
  });

  it("renders external links as a link preview instead of a business status card", () => {
    const card: BusinessCardPayload = {
      id: "link-preview",
      cardType: "external_link",
      title: "DeepSeek | 深度求索",
      body: "深度求索（DeepSeek），成立于 2023 年，专注于研究世界领先的通用人工智能。",
      metrics: [
        { label: "类型", value: "网页" },
        { label: "域名", value: "deepseek.com" },
      ],
      actions: [
        { label: "打开链接", type: "open_url", kind: "primary", url: "https://www.deepseek.com/" },
      ],
      extra: {
        domain: "deepseek.com",
      },
    };

    const html = renderToStaticMarkup(React.createElement(BusinessCardView, { card }));

    expect(html).toContain("wk-link-preview-card");
    expect(html).toContain("https://www.deepseek.com/");
    expect(html).toContain("DeepSeek | 深度求索");
    expect(html).not.toContain("wk-business-card-fields");
    expect(html).not.toContain("wk-business-card-footer");
  });

  it("normalizes legacy external link placeholder copy", () => {
    const card: BusinessCardPayload = {
      id: "legacy-link-preview",
      cardType: "external_link",
      title: "外部链接预览卡片",
      body: "用于验证后续外部分享链接卡片场景，点击后打开配置的真实链接。",
      actions: [
        { label: "打开链接", type: "open_url", kind: "primary", url: "https://www.deepseek.com/" },
      ],
      extra: {
        domain: "www.deepseek.com",
      },
    };

    const html = renderToStaticMarkup(React.createElement(BusinessCardView, { card }));

    expect(html).toContain("https://www.deepseek.com/");
    expect(html).toContain("DeepSeek | 深度求索");
    expect(html).toContain("深度求索，专注于研究世界领先的通用人工智能。");
    expect(html).not.toContain("外部链接预览卡片");
  });

  it("renders pending summary cards with stacked layers when multiple updates are folded", () => {
    const card: BusinessCardPayload = {
      id: "summary-stack",
      cardType: "summary_feedback",
      title: "LLM真实群总结 0623-085407",
      subtitle: "合同验收风险与行动项摘要",
      body: "客户合同已进入 v3 版本，销售、法务和 PM 需要一起确认风险条款，完成后在群里同步状态。",
      source: "Richard 验收群",
      time: "今天 09:12",
      status: "pending_confirm",
      metrics: [
        { label: "消息数", value: "7" },
        { label: "行动项", value: "3" },
        { label: "风险点", value: "1" },
      ],
      actions: [
        { label: "进入群总结", type: "open_summary_workspace", kind: "primary" },
        { label: "认可", type: "summary_accept", kind: "secondary" },
        { label: "继续优化", type: "summary_reject", kind: "secondary" },
      ],
      extra: {
        sourceName: "Richard 验收群",
        summaryTitle: "合同验收风险与行动项摘要",
        versionLabel: "v2 已修订",
        conclusion: "客户合同 v3 已具备验收条件，风险集中在付款节点、违约责任和上线前交付范围。",
        actionItems: ["销售补充客户侧承诺口径", "法务确认红线条款", "PM 在群里同步最终验收结论"],
        riskItems: ["上线前交付范围仍需客户书面确认"],
        statusHistory: [
          { id: "summary-1", statusText: "v1", title: "生成初稿：提炼行动项、风险点和待确认事项。" },
          { id: "summary-2", statusText: "v2", title: "补充接口联调风险，合并重复风险点，并补充负责人。", time: "09:12" },
        ],
      },
    };

    const html = renderToStaticMarkup(React.createElement(BusinessCardView, { card }));

    expect(html).toContain("wk-business-card--summary_feedback");
    expect(html).toContain("Richard 验收群");
    expect(html).toContain("合同验收风险与行动项摘要");
    expect(html).toContain("LLM真实群总结 0623-085407");
    expect(html).toContain("客户合同已进入 v3 版本");
    expect(html).toContain("7 条消息");
    expect(html).toContain("行动项 3");
    expect(html).toContain("风险点 1");
    expect(html).toContain("v2 已修订");
    expect(html).toContain("待确认");
    expect(html).toContain("wk-business-card--stacked");
    expect(html).toContain("wk-business-card-stack-layers");
    expect(html).toContain("2 次修订 · v2 已修订");
    expect(html).not.toContain("进入群总结");
    expect(html).toContain("认可");
    expect(html).toContain("继续优化");
    expect(html).toContain("预览");
    expect(html).toContain("关键结论");
    expect(html).toContain("行动项");
    expect(html).toContain("风险点");
    expect(html).toContain("修订记录");
    expect(html).toContain("v1");
    expect(html).toContain("v2");
    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).toContain("展开群总结修订记录");
    expect(html).not.toContain("wk-business-card-fields");
  });

  it("renders confirmed summary cards as a quiet closed state", () => {
    const card: BusinessCardPayload = {
      id: "summary-confirmed",
      cardType: "summary_feedback",
      title: "6月23日业务推进总结",
      subtitle: "群总结",
      status: "confirmed",
      body: "客户合同 v3 已进入评审，法务关注付款节点、违约责任和上线前交付范围。",
      metrics: [
        { label: "总结范围", value: "昨日 14:00-15:40" },
        { label: "消息数", value: "7 条" },
        { label: "确认人", value: "赵倩笑 PM" },
      ],
      actions: [
        { label: "进入群总结", type: "open_summary_workspace", kind: "primary" },
        { label: "认可", type: "summary_accept", kind: "secondary" },
        { label: "需要调整", type: "summary_reject", kind: "secondary" },
        { label: "预览", type: "open_summary", kind: "ghost" },
      ],
    };

    const actions = getBusinessCardActions(card);
    const html = renderToStaticMarkup(React.createElement(BusinessCardView, { card }));

    expect(actions.map((action) => action.type)).toEqual(["open_summary"]);
    expect(html).toContain("已确认");
    expect(html).toContain("wk-business-card--tone-summary-confirmed");
    expect(html).not.toContain("认可");
    expect(html).not.toContain("需要调整");
    expect(html).not.toContain("进入群总结");
    expect(html).not.toContain("wk-business-card--stacked");
  });

  it("renders revised and failed summary statuses with restrained tones", () => {
    const revisedCard: BusinessCardPayload = {
      id: "summary-revised",
      cardType: "summary_feedback",
      title: "6月23日业务推进总结",
      status: "revised",
    };
    const failedCard: BusinessCardPayload = {
      id: "summary-failed",
      cardType: "summary_feedback",
      title: "6月23日业务推进总结",
      status: "failed",
    };

    const revisedHtml = renderToStaticMarkup(React.createElement(BusinessCardView, { card: revisedCard }));
    const failedHtml = renderToStaticMarkup(React.createElement(BusinessCardView, { card: failedCard }));

    expect(revisedHtml).toContain("已修订");
    expect(revisedHtml).toContain("wk-business-card--tone-summary-pending");
    expect(failedHtml).toContain("失败");
    expect(failedHtml).toContain("wk-business-card--tone-warn");
    expect(revisedHtml).not.toContain("wk-business-card--stacked");
    expect(failedHtml).not.toContain("wk-business-card--stacked");
  });

  it("renders matter review cards with the richer Matter field hierarchy", () => {
    const card: BusinessCardPayload = {
      id: "matter-review",
      cardType: "matter_status",
      title: "风险说明已回传，等待 PM 确认",
      subtitle: "MAT-RC-004 · Matter",
      body: "法务已给出红线条款说明，销售补充了客户侧承诺口径。",
      status: "review",
      priority: "P0",
      metrics: [
        { label: "现在该谁处理", value: "赵倩笑 PM" },
        { label: "需要你确认", value: "风险口径" },
        { label: "进度", value: "3 / 4" },
      ],
      actions: [
        { label: "看东西", type: "open_matter_workspace", kind: "primary" },
        { label: "行", type: "complete_matter", kind: "secondary" },
      ],
      extra: {
        statusText: "东西回来了，等你确认",
        agentName: "Brooks",
        agentRole: "已汇总",
        participantText: "3 个参与者",
        participantRoles: ["Research", "Review"],
        trail: [
          { label: "法务", title: "提交风险说明" },
          { label: "销售", title: "补充客户口径" },
        ],
        outputs: ["风险说明", "审批结论"],
        updateCount: 2,
        statusHistory: [
          { id: "history-1", statusText: "法务同学正在处理", title: "合同进入法务复核", actor: "Brooks", time: "10:12", sourceText: "客户要求补充风险条款" },
          { id: "history-2", statusText: "东西回来了，等你确认", title: "风险说明已回传", actor: "Brooks", time: "10:30", sourceText: "法务提交风险说明" },
        ],
      },
    };

    const html = renderToStaticMarkup(React.createElement(BusinessCardView, { card }));

    expect(html).toContain("wk-business-card--tone-review");
    expect(html).toContain("等你看");
    expect(html).toContain("东西回来了，等你确认");
    expect(html).toContain("Brooks");
    expect(html).toContain("wk-business-card--stacked");
    expect(html).toContain("wk-business-card-stack-layers");
    expect(html).toContain("wk-business-card-stack-layer--back");
    expect(html).toContain("2 次状态更新已合并");
    expect(html).toContain("进入 Matter");
    expect(html).toContain("行");
    expect(html).toContain("预览");
    expect(html).toContain("wk-business-card-history");
    expect(html).toContain("合同进入法务复核");
    expect(html).toContain("风险说明已回传");
    expect(html).toContain("来源：客户要求补充风险条款");
    expect(html).toContain("来源：法务提交风险说明");
    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).toContain("展开 Matter 状态更新");
  });
});
