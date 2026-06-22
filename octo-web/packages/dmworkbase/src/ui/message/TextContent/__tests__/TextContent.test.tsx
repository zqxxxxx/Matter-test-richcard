import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TextContent from "../index";

vi.mock("../../../../App", () => ({
  default: {
    dataSource: {
      commonDataSource: {
        getImageURL: (src: string) => src,
      },
    },
  },
}));

vi.mock("../../../../Messages/Text/MarkdownContent", () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

describe("TextContent", () => {
  it("renders link preview below the text message content", () => {
    const html = renderToStaticMarkup(
      <TextContent
        content="https://www.deepseek.com/"
        linkPreview={{
          url: "https://www.deepseek.com/",
          title: "DeepSeek | 深度求索",
          description: "深度求索，专注于研究世界领先的通用人工智能。",
          domain: "deepseek.com",
        }}
      />
    );

    expect(html).toContain("https://www.deepseek.com/");
    expect(html).toContain("wk-msg-link-preview");
    expect(html).toContain("DeepSeek | 深度求索");
    expect(html).not.toContain("wk-link-preview-card");
  });
});
