import { describe, expect, it, vi } from "vitest";
import { Channel, ChannelTypeGroup, Message } from "wukongimjssdk";
import { autoArchiveSentGroupFileMessage } from "./autoArchive";

vi.mock("./service", () => ({
  documentRepository: {
    autoArchiveMessageFile: vi.fn(),
  },
}));

vi.mock("../../App", () => ({
  default: {
    loginInfo: {
      name: "陈一",
      uid: "pm_chen01",
    },
  },
}));

function makeMessage(clientMsgNo: string) {
  const message = new Message();
  message.clientMsgNo = clientMsgNo;
  message.messageID = 0;
  message.fromUID = "pm_chen01";
  message.channel = new Channel("grp_product_docs", ChannelTypeGroup);
  return message;
}

function makeDeps() {
  const autoArchiveMessageFile = vi.fn().mockResolvedValue({ files: [] });
  return {
    repository: { autoArchiveMessageFile },
    sdk: {
      shared: () => ({
        channelManager: {
          getChannelInfo: (channel: Channel) => ({
            title:
              channel.channelType === ChannelTypeGroup
                ? "产品方案讨论群"
                : "陈一",
          }),
        },
      }),
    },
    app: {
      loginInfo: {
        name: "陈一",
        uid: "pm_chen01",
      },
    },
    autoArchiveMessageFile,
  };
}

describe("autoArchiveSentGroupFileMessage", () => {
  it("archives a successfully uploaded group file to the bound document space", async () => {
    const deps = makeDeps();
    await autoArchiveSentGroupFileMessage(
      makeMessage("client-auto-archive-1"),
      {
        name: "客户会议纪要.md",
        extension: "md",
        size: 128,
        url: "chat/2/grp_product_docs/client-auto-archive-1.md",
      },
      deps
    );

    expect(deps.autoArchiveMessageFile).toHaveBeenCalledWith(
      {
        id: "client-auto-archive-1",
        name: "客户会议纪要.md",
        extension: "md",
        size: 128,
        storagePath: "chat/2/grp_product_docs/client-auto-archive-1.md",
        sourceName: "产品方案讨论群",
        sourceChannelId: "grp_product_docs",
        sourceChannelType: ChannelTypeGroup,
        sourceMessageId: "client-auto-archive-1",
        sourceType: "群聊",
        uploader: "陈一",
      },
      "陈一"
    );
  });

  it("does not archive before the upload has a storage path", async () => {
    const deps = makeDeps();
    await autoArchiveSentGroupFileMessage(
      makeMessage("client-auto-archive-empty-path"),
      {
        name: "上传中.md",
        extension: "md",
        size: 128,
        url: "",
      },
      deps
    );

    expect(deps.autoArchiveMessageFile).not.toHaveBeenCalled();
  });
});
