// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import ChannelDocumentStorageSpace from "../index";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  getChannelStorageSpace: vi.fn(),
  bindConversationToSpace: vi.fn(),
  navigateWorkspace: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  loginInfo: { uid: "pm_chen", name: "陈一" },
}));

vi.mock("../../../App", () => ({
  default: {
    loginInfo: mocks.loginInfo,
  },
}));

vi.mock("../../../Pages/Documents/service", () => ({
  documentRepository: {
    load: mocks.load,
    getChannelStorageSpace: mocks.getChannelStorageSpace,
    bindConversationToSpace: mocks.bindConversationToSpace,
  },
}));

vi.mock("../../../Pages/Documents", () => ({
  navigateWorkspace: mocks.navigateWorkspace,
}));

vi.mock("@douyinfe/semi-ui", () => {
  const Select = Object.assign(
    ({ children, value, onChange, placeholder }: any) => (
      <select
        aria-label={placeholder}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" />
        {children}
      </select>
    ),
    {
      Option: ({ children, value, disabled }: any) => (
        <option value={value} disabled={disabled}>
          {children}
        </option>
      ),
    }
  );
  return {
    Button: ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
    ),
    Modal: ({
    children,
    visible,
    title,
    okText,
    cancelText,
    onOk,
    onCancel,
    okButtonProps,
    }: any) =>
      visible ? (
        <div role="dialog" aria-label={title}>
          <h2>{title}</h2>
          {children}
          <button onClick={onCancel}>{cancelText}</button>
          <button disabled={okButtonProps?.disabled} onClick={onOk}>
            {okText}
          </button>
        </div>
      ) : null,
    Select,
    Toast: {
      success: mocks.success,
      warning: mocks.warning,
      error: mocks.error,
    },
  };
});

vi.mock("@douyinfe/semi-icons", () => ({
  IconExternalOpen: () => <span />,
}));

let container: HTMLDivElement | null = null;

function renderComponent(props: Partial<React.ComponentProps<typeof ChannelDocumentStorageSpace>> = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  ReactDOM.render(
    <ChannelDocumentStorageSpace
      channel={{ channelID: "grp_product", channelType: 2 } as any}
      channelName="产品方案讨论群"
      canManageStorageSpace
      {...props}
    />,
    container
  );
  return container;
}

describe("ChannelDocumentStorageSpace", () => {
  beforeEach(() => {
    mocks.load.mockReset();
    mocks.getChannelStorageSpace.mockReset();
    mocks.bindConversationToSpace.mockReset();
    mocks.navigateWorkspace.mockReset();
    mocks.success.mockReset();
    mocks.warning.mockReset();
    mocks.error.mockReset();
    mocks.getChannelStorageSpace.mockResolvedValue({
      spaceId: "space-product",
      spaceName: "产品部公共空间",
    });
    mocks.load.mockResolvedValue({
      files: [],
      audits: [],
      spaces: [
        {
          id: "space-product",
          name: "产品部公共空间",
          owner: "pm_chen",
          members: [],
          boundConversations: [],
          pinnedFileIds: [],
          fileCount: 2,
          memberCount: 3,
          description: "",
        },
        {
          id: "space-delivery",
          name: "华东交付空间",
          owner: "delivery_liu",
          members: [{ uid: "pm_chen", name: "陈一", role: "admin", source: "手动添加", joinedAt: "" }],
          boundConversations: [],
          pinnedFileIds: [],
          fileCount: 1,
          memberCount: 2,
          description: "",
        },
      ],
    });
    mocks.bindConversationToSpace.mockResolvedValue({
      files: [],
      audits: [],
      spaces: [],
    });
  });

  afterEach(() => {
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
    }
    document.body.innerHTML = "";
    container = null;
  });

  it("lets a group manager choose a new storage space from group details", async () => {
    renderComponent();

    await screen.findByText("产品部公共空间");
    fireEvent.click(screen.getByText("群文档存储空间"));

    await screen.findByRole("dialog", { name: "设置群文档存储空间" });
    await screen.findByText("华东交付空间");
    fireEvent.change(screen.getByLabelText("选择群文档存储空间"), {
      target: { value: "space-delivery" },
    });
    const confirmButton = screen.getByRole("button", { name: "确认绑定" });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mocks.bindConversationToSpace).toHaveBeenCalledWith(
        "space-delivery",
        {
          channelId: "grp_product",
          channelType: 2,
          name: "产品方案讨论群",
        },
        "陈一"
      );
    });
    expect(await screen.findByText("华东交付空间")).toBeTruthy();
    expect(mocks.success).toHaveBeenCalledWith("已更新群文档存储空间");
  });

  it("opens the bound space directly for users without management permission", async () => {
    renderComponent({ canManageStorageSpace: false });

    await screen.findByText("产品部公共空间");
    fireEvent.click(screen.getByText("群文档存储空间"));

    expect(mocks.navigateWorkspace).toHaveBeenCalledWith({
      view: "space",
      spaceName: "产品部公共空间",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
