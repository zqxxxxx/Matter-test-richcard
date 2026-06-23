import { describe, expect, it } from "vitest";
import { getTextMessageLinkPreview } from "../linkPreview";

describe("getTextMessageLinkPreview", () => {
  it("returns parsed preview only when the text contains the preview URL", () => {
    const preview = getTextMessageLinkPreview({
      text: "https://www.deepseek.com/",
      link_preview: {
        url: "https://www.deepseek.com/",
        title: "DeepSeek | 深度求索",
        description: "深度求索，专注于研究世界领先的通用人工智能。",
        image: "https://www.deepseek.com/logo.png",
      },
    });

    expect(preview).toEqual({
      url: "https://www.deepseek.com/",
      title: "DeepSeek | 深度求索",
      description: "深度求索，专注于研究世界领先的通用人工智能。",
      image: "https://www.deepseek.com/logo.png",
      domain: "deepseek.com",
    });
  });

  it("does not render an external-link business card payload as a text link preview", () => {
    expect(
      getTextMessageLinkPreview({
        text: "",
        card_type: "external_link",
        title: "外部链接预览卡片",
        actions: [{ type: "open_url", url: "https://www.deepseek.com/" }],
      })
    ).toBeUndefined();
  });

  it("rejects unsafe or unrelated preview URLs", () => {
    expect(
      getTextMessageLinkPreview({
        text: "https://www.deepseek.com/",
        link_preview: {
          url: "javascript:alert(1)",
          title: "bad",
        },
      })
    ).toBeUndefined();

    expect(
      getTextMessageLinkPreview({
        text: "https://www.deepseek.com/",
        linkPreview: {
          url: "https://example.com/",
          title: "Example",
        },
      })
    ).toBeUndefined();
  });

  it("reads preview metadata from decoded SDK contentObj", () => {
    const preview = getTextMessageLinkPreview({
      text: "https://www.deepseek.com/",
      contentObj: {
        type: 1,
        content: "https://www.deepseek.com/",
        link_preview: {
          url: "https://www.deepseek.com/",
          title: "DeepSeek | 深度求索",
        },
      },
    });

    expect(preview?.title).toBe("DeepSeek | 深度求索");
    expect(preview?.domain).toBe("deepseek.com");
  });

  it("falls back to a detected safe URL when no parsed metadata exists", () => {
    const preview = getTextMessageLinkPreview({
      content: "这是一个链接 https://www.deepseek.com/ 可以打开",
    });

    expect(preview).toEqual({
      url: "https://www.deepseek.com/",
      title: "deepseek.com",
      description: "https://www.deepseek.com/",
      domain: "deepseek.com",
    });
  });

  it("does not fallback-preview non-http URLs", () => {
    expect(
      getTextMessageLinkPreview({
        content: "javascript:alert(1)",
      })
    ).toBeUndefined();
  });
});
