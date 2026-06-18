import { describe, expect, it } from "vitest";
import { MessageContentTypeConst } from "../../../Service/Const";
import { BusinessCardContent } from "../BusinessCardContent";

describe("BusinessCardContent", () => {
  it("encodes a matter status card using the backend payload contract", () => {
    const content = new BusinessCardContent({
      id: "matter-card-1",
      cardType: "matter_status",
      title: "完成合同评审",
      status: "done",
      entityId: "matter-1",
      entityType: "matter",
      sourceChannelId: "group-1",
      sourceChannelType: 2,
      metrics: [
        { label: "负责人", value: "张三" },
        { label: "截止时间", value: "今天 18:00" },
      ],
      actions: [
        { label: "查看事项", type: "open_matter", kind: "primary" },
      ],
    });

    expect(content.contentType).toBe(MessageContentTypeConst.businessCard);
    expect(content.encodeJSON()).toMatchObject({
      type: MessageContentTypeConst.businessCard,
      card_id: "matter-card-1",
      card_type: "matter_status",
      title: "完成合同评审",
      status: "done",
      entity_id: "matter-1",
      entity_type: "matter",
      source_channel_id: "group-1",
      source_channel_type: 2,
    });
  });

  it("decodes summary cards and converts numeric metric values to display text", () => {
    const content = new BusinessCardContent();

    content.decodeJSON({
      card_id: "summary-card-1",
      card_type: "summary_feedback",
      title: "本周客户沟通总结",
      entity_id: 12001,
      source_channel_type: 2,
      metrics: [
        { label: "消息数", value: 128 },
        { label: "参与人", value: "8" },
      ],
      actions: [
        { label: "认可", type: "summary_accept", kind: "primary" },
        { label: "需要调整", type: "summary_reject" },
      ],
    });

    expect(content.toPayload()).toMatchObject({
      id: "summary-card-1",
      cardType: "summary_feedback",
      title: "本周客户沟通总结",
      entityId: "12001",
      sourceChannelType: 2,
      metrics: [
        { label: "消息数", value: "128" },
        { label: "参与人", value: "8" },
      ],
    });
    expect(content.actions).toHaveLength(2);
  });

  it("preserves extra payload for future card extensions", () => {
    const content = new BusinessCardContent({
      id: "link-card-1",
      cardType: "external_link",
      title: "客户需求文档",
      extra: {
        favicon: "https://example.com/favicon.ico",
        domain: "example.com",
      },
    });

    expect(content.encodeJSON().extra).toEqual({
      favicon: "https://example.com/favicon.ico",
      domain: "example.com",
    });

    const decoded = new BusinessCardContent();
    decoded.decodeJSON({
      card_id: "link-card-1",
      card_type: "external_link",
      title: "客户需求文档",
      extra: {
        favicon: "https://example.com/favicon.ico",
        domain: "example.com",
      },
    });

    expect(decoded.toPayload().extra).toEqual({
      favicon: "https://example.com/favicon.ico",
      domain: "example.com",
    });
  });
});
