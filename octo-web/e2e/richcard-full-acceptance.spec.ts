import { expect, test, type APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.RICHCARD_BASE_URL || "http://10.172.49.131:443";
const GROUP_ID = process.env.RICHCARD_GROUP_ID || "908c31bf1bce41118fcf43b0497b3fc9";
const GROUP_NAME = process.env.RICHCARD_GROUP_NAME || "Matter 助手、法务同学、赵倩笑 P";
const SPACE_ID = process.env.RICHCARD_SPACE_ID || "rc_demo_space";
const USERNAME = process.env.RICHCARD_USERNAME || "rc_demo_pm";
const PASSWORD = process.env.RICHCARD_PASSWORD || "Octo@123456";
const SUMMARY_CREATOR_USERNAME = process.env.RICHCARD_SUMMARY_CREATOR_USERNAME || "rc_demo_legal";
const SUMMARY_CREATOR_PASSWORD = process.env.RICHCARD_SUMMARY_CREATOR_PASSWORD || PASSWORD;
const CHROME_EXECUTABLE_PATH = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test.use({
  baseURL: BASE_URL,
  launchOptions: { executablePath: CHROME_EXECUTABLE_PATH },
});

type LoginResp = {
  uid: string;
  token: string;
  app_id?: string;
  short_no?: string;
  name?: string;
  role?: string;
  sex?: number;
};

async function loginByApi(request: APIRequestContext, username = USERNAME, password = PASSWORD) {
  const resp = await request.post(`${BASE_URL}/v1/user/login`, {
    data: {
      username,
      password,
      flag: 1,
      device: { device_id: `richcard-e2e-${Date.now()}`, device_name: "Playwright" },
    },
  });
  expect(resp.ok()).toBeTruthy();
  const json = await resp.json() as LoginResp;
  expect(json.token).toBeTruthy();
  expect(json.uid).toBeTruthy();
  return json;
}

async function sendMessage(request: APIRequestContext, token: string, payload: Record<string, unknown>) {
  const resp = await request.post(`${BASE_URL}/v1/message/send`, {
    headers: {
      token,
      "X-Space-Id": SPACE_ID,
    },
    data: {
      token,
      receive_channel_id: GROUP_ID,
      receive_channel_type: 2,
      payload,
      is_verify: 1,
    },
  });
  expect(resp.ok(), await resp.text()).toBeTruthy();
}

async function createSummaryTask(request: APIRequestContext, token: string, title: string) {
  const resp = await request.post(`${BASE_URL}/summary/api/v1/summaries`, {
    headers: {
      token,
      "X-Space-Id": SPACE_ID,
    },
    data: {
      topic: title,
      title,
      summary_mode: 1,
      origin_channel_id: GROUP_ID,
      origin_channel_type: 2,
      sources: [{ source_type: 1, source_id: GROUP_ID, source_name: GROUP_NAME }],
      participants: [{ user_id: "rc_demo_pm" }, { user_id: "rc_demo_sales" }, { user_id: "rc_demo_legal" }],
      time_range: { start: "2026-06-22T09:00:00+08:00", end: "2026-06-22T18:00:00+08:00" },
      confirm_timeout_hours: 24,
    },
  });
  expect(resp.ok(), await resp.text()).toBeTruthy();
  const json = await resp.json();
  const taskId = json.data?.task_id || json.task_id;
  expect(taskId).toBeTruthy();
  return String(taskId);
}

function matterCard(runId: string, overrides: Record<string, unknown>) {
  return {
    type: 17,
    card_type: "matter_status",
    source: "Matter",
    actor: "Brooks",
    time: `完整验收 ${runId}`,
    entity_type: "matter",
    source_channel_id: GROUP_ID,
    source_channel_type: 2,
    ...overrides,
  };
}

test("richcard P0 business loop passes completely", async ({ page, request }) => {
  test.setTimeout(180_000);

  const runId = `full-${Date.now()}`;
  const login = await loginByApi(request);
  const summaryCreatorLogin = await loginByApi(request, SUMMARY_CREATOR_USERNAME, SUMMARY_CREATOR_PASSWORD);
  const token = login.token;
  const acceptTaskId = await createSummaryTask(request, summaryCreatorLogin.token, `Richcard 完整验收认可 ${runId}`);
  const rejectTaskId = await createSummaryTask(request, summaryCreatorLogin.token, `Richcard 完整验收调整 ${runId}`);

  await sendMessage(request, token, matterCard(runId, {
    card_id: `full-open-${runId}`,
    title: "客户合同审批进入法务复核",
    subtitle: "Matter · 进行中",
    body: "合同 v3 已提交法务复核，需要确认付款和违约条款。",
    status: "in_progress",
    priority: "P0",
    entity_id: "11111111-1111-4111-8111-111111111111",
    metrics: [{ label: "现在该谁处理", value: "法务同学" }, { label: "截止", value: "今天 18:00" }, { label: "进度", value: "2 / 4" }],
    actions: [{ label: "进入 Matter", type: "open_matter_workspace", kind: "primary" }, { label: "标记完成", type: "complete_matter", kind: "secondary" }],
    extra: { matterNo: "MAT-RC-001", statusText: "法务同学正在处理", sourceName: GROUP_NAME, agentName: "Brooks", agentRole: "带队" },
  }));
  await sendMessage(request, token, matterCard(runId, {
    card_id: `full-review-${runId}`,
    title: "风险说明已回传，等待 PM 确认",
    subtitle: "Matter · 等你看",
    body: "法务已给出红线条款说明，销售补充了客户侧承诺口径。",
    status: "review",
    priority: "P0",
    entity_id: "44444444-4444-4444-8444-444444444444",
    metrics: [{ label: "现在该谁处理", value: "赵倩笑 PM" }, { label: "需要你确认", value: "风险口径" }, { label: "进度", value: "3 / 4" }],
    actions: [{ label: "进入 Matter", type: "open_matter_workspace", kind: "primary" }, { label: "认可结果", type: "complete_matter", kind: "secondary" }],
    extra: { matterNo: "MAT-RC-004", statusText: "东西回来了，等你确认", sourceName: GROUP_NAME, agentName: "Brooks", agentRole: "已汇总" },
  }));
  await sendMessage(request, token, matterCard(runId, {
    card_id: `full-done-${runId}`,
    title: "客户合同审批已完成",
    subtitle: "Matter · 已完成",
    body: "上线风险说明已整理完成，用于验证已完成 Matter 卡片可以打开详情。",
    status: "done",
    priority: "P1",
    entity_id: "22222222-2222-4222-8222-222222222222",
    metrics: [{ label: "完成人", value: "销售同学" }, { label: "最终输出", value: "风险说明" }, { label: "进度", value: "4 / 4" }],
    actions: [{ label: "进入 Matter", type: "open_matter_workspace", kind: "primary" }],
    extra: { matterNo: "MAT-RC-002", statusText: "已验收完成，结果可回看", sourceName: GROUP_NAME, agentName: "Brooks", agentRole: "已归档" },
  }));
  await sendMessage(request, token, matterCard(runId, {
    card_id: `full-blocked-${runId}`,
    title: "外部系统回调未确认",
    subtitle: "Matter · 受阻",
    body: "客户审批系统 API 回调尚未返回，Matter 已暂停自动推进。",
    status: "blocked",
    priority: "P0",
    entity_id: "33333333-3333-4333-8333-333333333333",
    metrics: [{ label: "阻塞原因", value: "等待外部系统确认" }, { label: "建议动作", value: "@系统同学 排查" }, { label: "进度", value: "2 / 4" }],
    actions: [{ label: "进入 Matter", type: "open_matter_workspace", kind: "primary" }],
    extra: { matterNo: "MAT-RC-003", statusText: "卡住了：等待外部系统确认", sourceName: GROUP_NAME, agentName: "Matter 助手", agentRole: "检测到异常" },
  }));
  await sendMessage(request, token, {
    type: 17,
    card_id: `full-summary-accept-${runId}`,
    card_type: "summary_feedback",
    title: "完整验收总结认可",
    subtitle: "群总结反馈 · 待确认",
    body: "用于验收群总结认可分支。",
    status: "in_progress",
    source: "智能总结",
    actor: "智能总结",
    time: `完整验收 ${runId}`,
    entity_id: acceptTaskId,
    entity_type: "summary",
    source_channel_id: GROUP_ID,
    source_channel_type: 2,
    metrics: [{ label: "状态", value: "待确认" }],
    actions: [{ label: "认可", type: "summary_accept", kind: "secondary" }],
  });
  await sendMessage(request, token, {
    type: 17,
    card_id: `full-summary-reject-${runId}`,
    card_type: "summary_feedback",
    title: "完整验收总结调整",
    subtitle: "群总结反馈 · 待调整",
    body: "用于验收群总结需要调整分支。",
    status: "in_progress",
    source: "智能总结",
    actor: "智能总结",
    time: `完整验收 ${runId}`,
    entity_id: rejectTaskId,
    entity_type: "summary",
    source_channel_id: GROUP_ID,
    source_channel_type: 2,
    metrics: [{ label: "状态", value: "待调整确认" }],
    actions: [{ label: "需要调整", type: "summary_reject", kind: "secondary" }],
  });
  await sendMessage(request, token, {
    type: 1,
    content: `这是外部链接完整验收消息 ${runId}：https://www.deepseek.com/`,
    link_preview: {
      url: "https://www.deepseek.com/",
      title: "DeepSeek | 深度求索",
      description: "深度求索，专注于研究世界领先的通用人工智能。",
      domain: "deepseek.com",
    },
  });

  const hits: Array<{ url: string; status: number }> = [];
  page.on("response", response => {
    const url = response.url();
    if (url.includes("/summary/api/v1/summaries/") || url.includes("/matter/api/v1/matters/")) {
      hits.push({ url, status: response.status() });
    }
  });

  await page.addInitScript(({ loginInfo, spaceId }) => {
    const items: Record<string, string> = {
      app_id: loginInfo.app_id || "",
      short_no: loginInfo.short_no || "",
      uid: loginInfo.uid,
      token: loginInfo.token,
      name: loginInfo.name || "",
      role: loginInfo.role || "",
      is_work: "0",
      sex: loginInfo.sex === 1 ? "1" : "0",
      login_provider: "local",
      currentSpaceId: spaceId,
      i18n_lang: "zh-CN",
    };
    Object.entries(items).forEach(([key, value]) => {
      window.sessionStorage.setItem(key, value);
      window.localStorage.setItem(key, value);
    });
  }, { loginInfo: login, spaceId: SPACE_ID });
  await page.goto(`${BASE_URL}/?acceptance=${runId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/关注|Follow/i).first()).toBeVisible({ timeout: 30000 });
  await page.getByText(/最近|Recent/i).first().click();
  await page.getByText(GROUP_NAME).first().click();
  await page.waitForTimeout(2000);

  await expect(page.getByText(`完整验收 ${runId}`).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("MAT-RC-001").last()).toBeVisible();
  await expect(page.getByText("MAT-RC-004").last()).toBeVisible();
  await expect(page.getByText("MAT-RC-002").last()).toBeVisible();
  await expect(page.getByText("MAT-RC-003").last()).toBeVisible();

  const currentBatchX = await page.locator(".wk-business-card, .wk-link-preview-card").evaluateAll((nodes, marker) =>
    nodes
      .filter(node => node.textContent?.includes(marker as string))
      .map(node => Math.round(node.getBoundingClientRect().x)),
    `完整验收 ${runId}`,
  );
  expect(new Set(currentBatchX).size).toBe(1);

  const reviewCard = page.locator(".wk-business-card").filter({ hasText: `完整验收 ${runId}` }).filter({ hasText: "MAT-RC-004" }).last();
  await reviewCard.scrollIntoViewIfNeeded();
  await reviewCard.getByRole("button", { name: "进入 Matter" }).click();
  await expect(page.getByRole("button", { name: /返回/ })).toBeVisible({ timeout: 15000 });
  await expect.poll(() => hits.some(hit => hit.url.includes("/matter/api/v1/matters/44444444-4444-4444-8444-444444444444") && hit.status === 200)).toBe(true);
  await page.getByRole("button", { name: /返回/ }).click();
  await page.waitForTimeout(1000);
  const matterIframe = page.locator('iframe[title="事项"]');
  const iframeVisibleAfterReturn = await matterIframe.count() > 0
    ? await matterIframe.first().evaluate(el => getComputedStyle(el).display !== "none")
    : false;
  expect(iframeVisibleAfterReturn).toBe(false);

  await reviewCard.scrollIntoViewIfNeeded();
  await reviewCard.getByRole("button", { name: "认可结果" }).click();
  await expect.poll(() => hits.some(hit => hit.url.includes("/matter/api/v1/matters/44444444-4444-4444-8444-444444444444/status") && hit.status === 200)).toBe(true);

  const acceptCard = page.locator(".wk-business-card").filter({ hasText: `完整验收 ${runId}` }).filter({ hasText: "完整验收总结认可" }).last();
  await acceptCard.scrollIntoViewIfNeeded();
  await acceptCard.getByRole("button", { name: "认可" }).click();
  await expect.poll(() => hits.some(hit => hit.url.includes(`/summary/api/v1/summaries/${acceptTaskId}/respond`) && hit.status === 200), {
    timeout: 15_000,
    message: "summary accept should respond with 200",
  }).toBe(true);

  const rejectCard = page.locator(".wk-business-card").filter({ hasText: `完整验收 ${runId}` }).filter({ hasText: "完整验收总结调整" }).last();
  await rejectCard.scrollIntoViewIfNeeded();
  await rejectCard.getByRole("button", { name: "需要调整" }).click();
  await expect.poll(() => hits.some(hit => hit.url.includes(`/summary/api/v1/summaries/${rejectTaskId}/respond`) && hit.status === 200), {
    timeout: 15_000,
    message: "summary reject should respond with 200",
  }).toBe(true);

  const linkPreview = page.locator(".wk-msg-link-preview").filter({ hasText: "DeepSeek | 深度求索" }).last();
  await linkPreview.scrollIntoViewIfNeeded();
  await expect(page.getByText(`这是外部链接完整验收消息 ${runId}`).last()).toBeVisible();
  const linkStyle = await linkPreview.evaluate(el => {
    return {
      rootBg: getComputedStyle(el).backgroundColor,
    };
  });
  expect(linkStyle.rootBg).toBe("rgb(255, 255, 255)");
});
