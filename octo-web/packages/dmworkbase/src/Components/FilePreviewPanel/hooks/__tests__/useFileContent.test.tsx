// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useFileContent } from "../useFileContent";

vi.mock("../../../i18n/instance", () => ({
  t: (key: string) => key,
}));

function Probe({ url }: { url: string }) {
  useFileContent({ url });
  return null;
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, _init?: RequestInit) => new Promise<Response>(() => {}))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("does not abort an in-flight preview fetch when the preview rerenders", async () => {
  const root = document.createElement("div");
  document.body.appendChild(root);

  await act(async () => {
    ReactDOM.render(<Probe url="/first.txt" />, root);
  });
  await act(async () => {
    ReactDOM.render(<Probe url="/second.txt" />, root);
  });

  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
  const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  if (firstRequest?.signal) {
    expect((firstRequest.signal as AbortSignal).aborted).toBe(false);
  } else {
    expect(firstRequest?.signal).toBeUndefined();
  }

  ReactDOM.unmountComponentAtNode(root);
  root.remove();
});
