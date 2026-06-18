import React from "react";
import { act } from "react-dom/test-utils";
import ReactDOM from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { OutputsPanel } from "./index";
import type { MatterOutput } from "../../bridge/types";

const output: MatterOutput = {
  id: "output-1",
  matter_id: "matter-1",
  message_id: "message-1",
  channel_id: "channel-1",
  channel_type: 2,
  file_name: "Octo 文件空间需求清单.xlsx",
  file_size: 2048,
  file_url: "http://localhost/files/octo.xlsx",
  mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  description: "产品方案讨论群内沉淀的文档中心需求清单。",
  sender_uid: "pm_chen",
  sender_uname: "陈一",
  source_channel_id: "group-product",
  source_channel_name: "产品方案讨论群",
  sent_at: "2026-06-17T10:23:00Z",
  created_at: "2026-06-17T10:23:00Z",
};

function renderPanel(props: Partial<React.ComponentProps<typeof OutputsPanel>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    ReactDOM.render(
      <OutputsPanel outputs={[output]} {...props} />,
      container,
    );
  });
  return {
    container,
    cleanup: () => {
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });
      container.remove();
    },
  };
}

describe("OutputsPanel", () => {
  it("fires preview and download actions from the output file row", () => {
    const onPreview = vi.fn();
    const onDownload = vi.fn();
    const { container, cleanup } = renderPanel({
      onPreview,
      canPreview: () => true,
      onDownload,
    });

    try {
      const preview = container.querySelector<HTMLButtonElement>(
        'button[aria-label="预览"]',
      );
      const download = container.querySelector<HTMLButtonElement>(
        'button[aria-label="下载"]',
      );

      expect(preview).not.toBeNull();
      expect(download).not.toBeNull();

      act(() => {
        preview?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      act(() => {
        download?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(onPreview).toHaveBeenCalledWith(output);
      expect(onDownload).toHaveBeenCalledWith(output);
    } finally {
      cleanup();
    }
  });
});
