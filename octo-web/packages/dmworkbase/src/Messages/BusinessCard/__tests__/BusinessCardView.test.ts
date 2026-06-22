import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessCardView, getBusinessCardActions } from "../BusinessCardView";
import type { BusinessCardPayload } from "../BusinessCardContent";

describe("BusinessCardView actions", () => {
  it("adds the matter workspace jump action for legacy matter cards", () => {
    const card: BusinessCardPayload = {
      id: "matter-legacy",
      cardType: "matter_status",
      title: "Matter 状态返回",
      actions: [
        { label: "查看 Matter", type: "open_matter", kind: "primary" },
        { label: "标记完成", type: "complete_matter", kind: "secondary" },
      ],
    };

    expect(getBusinessCardActions(card).map((action) => action.type)).toEqual([
      "open_matter",
      "open_matter_workspace",
      "complete_matter",
    ]);
  });

  it("adds the summary workspace jump action for legacy summary cards", () => {
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

    expect(getBusinessCardActions(card).map((action) => action.type)).toEqual([
      "open_summary",
      "open_summary_workspace",
      "summary_accept",
      "summary_reject",
    ]);
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
});
