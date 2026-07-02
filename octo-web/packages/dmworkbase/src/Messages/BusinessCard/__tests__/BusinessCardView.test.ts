/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import React from "react";
import ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react-dom/test-utils";
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
      "open_matter",
    ]);
    expect(actions[0]).toMatchObject({
      label: "进入 Matter",
      kind: "primary",
    });
    expect(actions[1]).toMatchObject({
      label: "预览",
      kind: "ghost",
    });
  });

  it("keeps summary cards navigation-only even when legacy judgement actions exist", () => {
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
      "open_summary_workspace",
      "open_summary",
    ]);
    expect(actions[0]).toMatchObject({ label: "进入群总结", kind: "primary" });
    expect(actions[1]).toMatchObject({ label: "预览", kind: "ghost" });
  });

  it("does not duplicate workspace jump actions that already exist", () => {
    const card: BusinessCardPayload = {
      id: "matter-current",
      cardType: "matter_status",
      title: "Matter 状态返回",
      actions: [
        { label: "查看 Matter", type: "open_matter", kind: "primary" },
        {
          label: "进入 Matter",
          type: "open_matter_workspace",
          kind: "secondary",
        },
      ],
    };

    expect(
      getBusinessCardActions(card).filter(
        (action) => action.type === "open_matter_workspace"
      )
    ).toHaveLength(1);
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
        {
          label: "打开链接",
          type: "open_url",
          kind: "primary",
          url: "https://www.deepseek.com/",
        },
      ],
      extra: {
        domain: "deepseek.com",
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(BusinessCardView, { card })
    );

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
        {
          label: "打开链接",
          type: "open_url",
          kind: "primary",
          url: "https://www.deepseek.com/",
        },
      ],
      extra: {
        domain: "www.deepseek.com",
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(BusinessCardView, { card })
    );

    expect(html).toContain("https://www.deepseek.com/");
    expect(html).toContain("DeepSeek | 深度求索");
    expect(html).toContain("深度求索，专注于研究世界领先的通用人工智能。");
    expect(html).not.toContain("外部链接预览卡片");
  });

  it("renders pending summary cards as standalone cards without revision stack or version labels", () => {
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
        {
          label: "进入群总结",
          type: "open_summary_workspace",
          kind: "primary",
        },
        { label: "认可", type: "summary_accept", kind: "secondary" },
        { label: "继续优化", type: "summary_reject", kind: "secondary" },
      ],
      extra: {
        sourceName: "Richard 验收群",
        summaryTitle: "合同验收风险与行动项摘要",
        versionLabel: "v2 已修订",
        conclusion:
          "客户合同 v3 已具备验收条件，风险集中在付款节点、违约责任和上线前交付范围。",
        actionItems: [
          "销售补充客户侧承诺口径",
          "法务确认红线条款",
          "PM 在群里同步最终验收结论",
        ],
        riskItems: ["上线前交付范围仍需客户书面确认"],
        statusHistory: [
          {
            id: "summary-1",
            statusText: "v1",
            title: "生成初稿：提炼行动项、风险点和待确认事项。",
          },
          {
            id: "summary-2",
            statusText: "v2",
            title: "补充接口联调风险，合并重复风险点，并补充负责人。",
            time: "09:12",
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(BusinessCardView, { card })
    );

    expect(html).toContain("wk-business-card--summary_feedback");
    expect(html).toContain("Richard 验收群");
    expect(html).toContain("合同验收风险与行动项摘要");
    expect(html).toContain("LLM真实群总结 0623-085407");
    expect(html).toContain("客户合同已进入 v3 版本");
    expect(html).toContain("7 条消息");
    expect(html).toContain("行动项 3");
    expect(html).toContain("风险点 1");
    expect(html).toContain("待确认");
    expect(html).toContain("进入群总结");
    expect(html).not.toContain("认可");
    expect(html).not.toContain("继续优化");
    expect(html).toContain("预览");
    expect(html).not.toContain("wk-business-card--stacked");
    expect(html).not.toContain("wk-business-card-stack-layers");
    expect(html).not.toContain("2 次修订");
    expect(html).not.toContain("v2 已修订");
    expect(html).not.toContain("修订记录");
    expect(html).not.toContain("v1");
    expect(html).not.toContain('aria-expanded="false"');
    expect(html).not.toContain("展开群总结修订记录");
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
        {
          label: "进入群总结",
          type: "open_summary_workspace",
          kind: "primary",
        },
        { label: "认可", type: "summary_accept", kind: "secondary" },
        { label: "需要调整", type: "summary_reject", kind: "secondary" },
        { label: "预览", type: "open_summary", kind: "ghost" },
      ],
    };

    const actions = getBusinessCardActions(card);
    const html = renderToStaticMarkup(
      React.createElement(BusinessCardView, { card })
    );

    expect(actions.map((action) => action.type)).toEqual([
      "open_summary_workspace",
      "open_summary",
    ]);
    expect(html).toContain("已确认");
    expect(html).toContain("wk-business-card--tone-summary-confirmed");
    expect(html).not.toContain("认可");
    expect(html).not.toContain("需要调整");
    expect(html).toContain("进入群总结");
    expect(html).toContain("预览");
    expect(html).not.toContain("wk-business-card--stacked");
  });

  it("renders legacy revised and failed summary statuses without revision UI", () => {
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

    const revisedHtml = renderToStaticMarkup(
      React.createElement(BusinessCardView, { card: revisedCard })
    );
    const failedHtml = renderToStaticMarkup(
      React.createElement(BusinessCardView, { card: failedCard })
    );

    expect(revisedHtml).toContain("待确认");
    expect(revisedHtml).not.toContain("已修订");
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
          {
            id: "history-1",
            statusText: "法务同学正在处理",
            title: "合同进入法务复核",
            actor: "Brooks",
            time: "10:12",
            sourceText: "客户要求补充风险条款",
          },
          {
            id: "history-2",
            statusText: "东西回来了，等你确认",
            title: "风险说明已回传",
            actor: "Brooks",
            time: "10:30",
            sourceText: "法务提交风险说明",
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(BusinessCardView, { card })
    );

    expect(html).toContain("wk-business-card--tone-review");
    expect(html).toContain("wk-business-card-matter-summary");
    expect(html).toContain("等你看");
    expect(html).toContain("东西回来了，等你确认");
    expect(html).toContain("Brooks");
    expect(html).toContain("wk-business-card--stacked");
    expect(html).toContain("wk-business-card-stack-layers");
    expect(html).toContain("wk-business-card-stack-layer--back");
    expect(html).toContain("2 次状态更新已合并");
    expect(html).toContain("进入 Matter");
    expect(html).not.toContain("行");
    expect(html).toContain("预览");
    expect(html).toContain("wk-business-card-history");
    expect(html).toContain("合同进入法务复核");
    expect(html).toContain("风险说明已回传");
    expect(html).toContain("来源：客户要求补充风险条款");
    expect(html).toContain("来源：法务提交风险说明");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("展开 Matter 状态更新");
  });

  it("renders every Matter progress state with one consistent primary entry action", () => {
    const states = [
      ["backlog", "暂存", "neutral"],
      ["open", "待处理", "info"],
      ["in_progress", "进行中", "info"],
      ["review", "等你看", "review"],
      ["blocked", "受阻", "warn"],
      ["done", "已完成", "success"],
      ["cancelled", "已取消", "neutral"],
      ["archived", "已归档", "neutral"],
    ];

    states.forEach(([status, label, tone]) => {
      const card: BusinessCardPayload = {
        id: `matter-${status}`,
        cardType: "matter_status",
        title: `${label} Matter`,
        body: `${label} 状态下的处理说明。`,
        status,
        metrics: [
          { label: "现在该谁处理", value: label },
          { label: "截止", value: "2026/06/25 12:26" },
          { label: "进度", value: "2 / 4" },
        ],
        actions: [
          { label: "旧动作", type: "complete_matter", kind: "secondary" },
        ],
        extra: {
          statusText: `${label}，进入 Matter 查看`,
          agentName: "Brooks",
          updateCount: 2,
          statusHistory: [
            {
              id: `${status}-1`,
              statusText: "创建 Matter",
              title: "从群消息创建 Matter",
            },
            { id: `${status}-2`, statusText: label, title: `${label} 更新` },
          ],
        },
      };
      const html = renderToStaticMarkup(
        React.createElement(BusinessCardView, { card })
      );

      expect(html).toContain(`wk-business-card--tone-${tone}`);
      expect(html).toContain(label);
      expect(html).toContain("wk-business-card-matter-summary");
      expect(html).toContain("进入 Matter");
      expect(html).toContain("预览");
      expect(html).not.toContain("旧动作");
      expect(html).not.toContain("disabled");
    });
  });

  it("expands stacked Matter cards from the merged status row and removes the folded stack", () => {
    const card: BusinessCardPayload = {
      id: "matter-stack-click",
      cardType: "matter_status",
      title: "完成客户合同 v3 评审",
      body: "客户合同已进入 v3 版本，销售、法务和 PM 已完成风险条款确认。",
      status: "done",
      priority: "P1",
      metrics: [
        { label: "截止", value: "2026/06/25 12:26" },
        { label: "进度", value: "4 / 4" },
      ],
      actions: [
        {
          label: "进入 Matter",
          type: "open_matter_workspace",
          kind: "primary",
        },
      ],
      extra: {
        statusText: "已验收完成，结果可回看",
        agentName: "Brooks",
        agentRole: "带队",
        participantText: "3 个参与者",
        updateCount: 2,
        statusHistory: [
          {
            id: "history-1",
            statusText: "法务确认风险条款",
            title: "合同进入法务复核",
            actor: "Brooks",
            time: "11:48",
          },
          {
            id: "history-2",
            statusText: "销售补充客户口径",
            title: "风险说明已回传",
            actor: "Brooks",
            time: "12:26",
          },
        ],
      },
    };
    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      act(() => {
        ReactDOM.render(
          React.createElement(BusinessCardView, { card }),
          container
        );
      });

      const article = container.querySelector(".wk-business-card");
      const stackToggle = container.querySelector<HTMLButtonElement>(
        ".wk-business-card-stack-note"
      );

      expect(article?.className).toContain("wk-business-card--stacked");
      expect(stackToggle?.tagName).toBe("BUTTON");
      expect(stackToggle?.getAttribute("aria-expanded")).toBe("false");
      expect(stackToggle?.textContent).toContain("2 次状态更新已合并");
      expect(container.textContent).toContain("截止 2026/06/25 12:26");
      expect(container.textContent).toContain("进度 4 / 4");
      expect(
        container.querySelector(".wk-business-card-matter-summary")
      ).not.toBeNull();

      act(() => {
        stackToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(article?.className).toContain("wk-business-card--expanded");
      expect(article?.className).not.toContain("wk-business-card--stacked");
      expect(
        container.querySelector(".wk-business-card-stack-note")
      ).toBeNull();
      expect(
        container.querySelector(".wk-business-card-matter-detail")
      ).not.toBeNull();
      expect(
        container.querySelector(".wk-business-card-history-section-head")
          ?.textContent
      ).toContain("状态合并详情");
      expect(
        container
          .querySelector(".wk-business-card-history")
          ?.getAttribute("aria-hidden")
      ).toBe("false");
    } finally {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    }
  });
});
