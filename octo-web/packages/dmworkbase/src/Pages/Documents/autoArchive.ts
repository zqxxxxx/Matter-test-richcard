import {
  Channel,
  ChannelTypeGroup,
  ChannelTypePerson,
  Message,
  WKSDK,
} from "wukongimjssdk";
import WKApp from "../../App";
import { documentRepository } from "./service";

type FileMessageContentLike = {
  name?: string;
  extension?: string;
  size?: number;
  storagePath?: string;
  key?: string;
  url?: string;
  remoteUrl?: string;
};

type AutoArchiveDeps = {
  repository?: Pick<typeof documentRepository, "autoArchiveMessageFile">;
  sdk?: Pick<typeof WKSDK, "shared">;
  app?: Pick<typeof WKApp, "loginInfo">;
};

const autoArchivedGroupFileKeys = new Set<string>();

function ensureSdkChannel(channel: Channel): Channel {
  if (channel && typeof (channel as any).getChannelKey === "function") {
    return channel;
  }
  return new Channel(channel.channelID, channel.channelType);
}

function getExtension(name?: string, extension?: string): string {
  const normalized = (extension || "").replace(/^\./, "");
  if (normalized) {
    return normalized;
  }
  const fileName = name || "";
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > -1 ? fileName.slice(dotIndex + 1) : "";
}

export async function autoArchiveSentGroupFileMessage(
  message: Message | undefined,
  content: FileMessageContentLike | undefined,
  deps: AutoArchiveDeps = {}
) {
  if (!message?.channel || message.channel.channelType !== ChannelTypeGroup) {
    return null;
  }
  if (!content?.name) {
    return null;
  }
  const storagePath =
    content.storagePath || content.key || content.url || content.remoteUrl || "";
  if (!storagePath) {
    return null;
  }

  const sourceChannel = ensureSdkChannel(message.channel);
  const messageKey = String(
    message.clientMsgNo ||
      message.messageID ||
      `${sourceChannel.channelID}:${content.name}`
  );
  const archiveKey = `${sourceChannel.channelID}:${sourceChannel.channelType}:${messageKey}`;
  if (autoArchivedGroupFileKeys.has(archiveKey)) {
    return null;
  }
  autoArchivedGroupFileKeys.add(archiveKey);

  const sdk = deps.sdk || WKSDK;
  const app = deps.app || WKApp;
  const repository = deps.repository || documentRepository;
  const channelInfo = sdk.shared().channelManager.getChannelInfo(sourceChannel);
  const senderChannel = message.fromUID
    ? sdk
        .shared()
        .channelManager.getChannelInfo(new Channel(message.fromUID, ChannelTypePerson))
    : undefined;
  const uploader =
    senderChannel?.title ||
    message.fromUID ||
    app.loginInfo.name ||
    app.loginInfo.uid ||
    "";

  try {
    return await repository.autoArchiveMessageFile(
      {
        id: messageKey,
        name: content.name,
        extension: getExtension(content.name, content.extension),
        size: content.size || 0,
        storagePath,
        sourceName: channelInfo?.title || sourceChannel.channelID,
        sourceChannelId: sourceChannel.channelID,
        sourceChannelType: sourceChannel.channelType,
        sourceMessageId: messageKey,
        sourceType: "群聊",
        uploader,
      },
      uploader
    );
  } catch (error) {
    autoArchivedGroupFileKeys.delete(archiveKey);
    throw error;
  }
}
