import { describe, expect, it } from "vitest";
import {
  __resetBusinessCardActionHandlersForTest,
  dispatchBusinessCardAction,
  registerBusinessCardActionHandler,
} from "../actionHandlers";

describe("business card action handlers", () => {
  it("waits for async handlers before resolving", async () => {
    __resetBusinessCardActionHandlersForTest();

    let release!: () => void;
    let settled = false;

    registerBusinessCardActionHandler(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return true;
    });

    const pending = dispatchBusinessCardAction({
      card: {
        id: "matter-1",
        cardType: "matter_status",
        title: "完成合同评审",
      },
      action: {
        label: "标记完成",
        type: "complete_matter",
      },
    }).then((handled) => {
      settled = true;
      return handled;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    release();
    await expect(pending).resolves.toBe(true);
    expect(settled).toBe(true);

    __resetBusinessCardActionHandlersForTest();
  });
});
