import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockWKApp } = vi.hoisted(() => ({
  mockWKApp: {
    shared: {
      openChannel: undefined as undefined | { channelID?: string; channelType?: number },
    },
    menus: { register: vi.fn(), refresh: vi.fn() },
    mittBus: { on: vi.fn() },
    endpointManager: { setMethod: vi.fn() },
    routeLeft: { popToRoot: vi.fn() },
    routeRight: { replaceToRoot: vi.fn() },
    route: { get: vi.fn() },
    loginInfo: { isLogined: () => false },
  },
}));

vi.mock("@octo/base", () => ({
  ChatPage: () => null,
  EndpointCategory: {},
  WKApp: mockWKApp,
  Menus: class {
    onPress?: () => void;
    badge?: number;
    constructor(
      public id: string,
      public path: string,
      public title: string,
    ) {}
  },
  shouldSkipChannelForSpace: () => false,
  shouldSkipPersonConversationForSpace: () => false,
  t: (key: string) => key,
}));

vi.mock("@octo/contacts", () => ({
  ContactsList: () => null,
}));

vi.mock("wukongimjssdk", () => ({
  WKSDK: { shared: () => ({ conversationManager: { addConversationListener: vi.fn(), conversations: [] } }) },
  ChannelTypePerson: 1,
}));

vi.mock("@douyinfe/semi-ui", () => ({
  Toast: { success: vi.fn() },
}));

vi.mock("../Components/Icons/ChatIcon", () => ({ ChatIcon: () => null }));
vi.mock("../Components/Icons/ContactsIcon", () => ({ ContactsIcon: () => null }));
vi.mock("../Components/Icons/SummaryIcon", () => ({ SummaryIcon: () => null }));
vi.mock("../utils/faviconBadge", () => ({
  setFaviconBadge: vi.fn(),
  clearFaviconBadge: vi.fn(),
}));
vi.mock("../Layout", () => ({ default: () => null }));
vi.mock("../App/index.css", () => ({}));

import { getSummaryCreateRouteParam } from "../App";

describe("summary menu create route params", () => {
  beforeEach(() => {
    mockWKApp.shared.openChannel = undefined;
  });

  it("passes current open channel to summary create route", () => {
    mockWKApp.shared.openChannel = { channelID: "group-1", channelType: 2 };

    expect(getSummaryCreateRouteParam()).toEqual({
      channelId: "group-1",
      channelType: 2,
    });
  });

  it("omits route params when there is no active channel", () => {
    expect(getSummaryCreateRouteParam()).toBeUndefined();
  });
});
