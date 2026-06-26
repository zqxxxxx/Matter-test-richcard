import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import type { IModule } from "@octo/base";
import { BusinessCardContent, buildSourceConversationRef, i18n, I18nProvider, WKApp, t, registerBusinessCardActionHandler, type SourceConversationRef } from "@octo/base";
import { Modal, TextArea, Toast } from "@douyinfe/semi-ui";
import SummaryListPage from "./pages/SummaryListPage";
import SummaryCreatePage from "./pages/SummaryCreatePage";
import SummaryDetailPage from "./pages/SummaryDetailPage";
import SummaryConfirmPage from "./pages/SummaryConfirmPage";
import ScheduleListPage from "./pages/ScheduleListPage";
import { batchStatus, getChatCandidates, getSummaryDetail, regenerateSummary, respondToTask } from "./api/summaryApi";
import { notifyChatSummaryCreated } from "./utils/chatSummaryActions";
import { isSupportedChannelType } from "./utils/channelType";
import { openSummaryWorkspace } from "./utils/summaryWorkspaceNavigation";
import { buildSummaryFeedbackCard, buildSummaryStartedCard } from "./utils/businessCard";
import { SummaryMode, TaskStatus, TriggerType, type SummaryDetail } from "./types/summary";
import ChatSummaryStarButton from "./components/ChatSummaryStarButton";
import ChatSummaryPanel from "./components/ChatSummaryPanel";
import ChatSummaryNewModal, { type ChatSummaryCreatedMeta } from "./components/ChatSummaryNewModal";
import enUS from "./i18n/en-US.json";
import zhCN from "./i18n/zh-CN.json";
import "./index.css";

let _spaceChangedHandler: (() => void) | null = null;
let _businessCardActionDisposer: (() => void) | null = null;

export class SummaryModule implements IModule {
    id(): string {
        return "SummaryModule";
    }

    init(): void {
        i18n.registerNamespace("summary", {
            "zh-CN": zhCN,
            "en-US": enUS,
        });

        WKApp.openSummaryDetail = (taskId: number, source?: SourceConversationRef) => {
            WKApp.switchToMenuById?.("summary");
            WKApp.mittBus.emit("wk:nav-menu-activated", { menuId: "summary" });
            WKApp.routeLeft.popToRoot();
            WKApp.routeRight.replaceToRoot(
                <SummaryDetailPage taskId={taskId} returnToConversation={source} />
            );
        };

        WKApp.route.register("/summary", () => {
            return <SummaryListPage />;
        });

        WKApp.route.register("/summary/create", () => {
            return <SummaryCreatePage />;
        });

        WKApp.route.register("/summary/detail", (param: any) => {
            return <SummaryDetailPage taskId={param?.taskId} />;
        });

        WKApp.route.register("/summary/confirm", (param: any) => {
            return <SummaryConfirmPage taskId={param?.taskId} />;
        });

        WKApp.route.register("/summary/schedules", () => {
            return <ScheduleListPage />;
        });

        _spaceChangedHandler = () => {
            WKApp.mittBus.emit('summary-space-changed');
        };
        WKApp.mittBus.on('space-changed', _spaceChangedHandler);

        WKApp.searchChatCandidates = async (params) => {
            return getChatCandidates(params);
        };

        mountGlobalSummaryModal();
        this.registerBusinessCardActions();

        // ═══ Chat window integration ═══

        WKApp.endpoints.registerChannelHeaderRightItem(
            "channelheader.summary",
            ({ channel }) => {
                if (!isSupportedChannelType(channel)) return undefined;
                return <ChatSummaryStarButton channel={channel} />;
            },
            5100,
        );

        WKApp.endpoints.registerChatSummaryPanel(
            "chatsummarypanel",
            ({ channel, onClose, activeTaskId, openRequestKey }) => (
                <ChatSummaryPanel
                    visible={true}
                    channel={channel}
                    initialTaskId={activeTaskId}
                    openRequestKey={openRequestKey}
                    onClose={onClose}
                />
            ),
        );
    }

    private registerBusinessCardActions(): void {
        _businessCardActionDisposer?.();

        _businessCardActionDisposer = registerBusinessCardActionHandler(async (data) => {
            const card = data?.card;
            const action = data?.action;
            if (!card || !action || card.cardType !== "summary_feedback") return false;

            const taskId = Number(card.entityId);
            if (!Number.isFinite(taskId) || taskId <= 0) {
                Toast.error(t("summary.common.operationFailed"));
                return true;
            }

            if (action.type === "open_summary") {
                const source = buildSourceConversationRef(data);
                const currentChannel = WKApp.shared.openChannel;
                const channelId = card.sourceChannelId || data?.message?.channelId || source?.channelId || currentChannel?.channelID;
                const channelType = card.sourceChannelType ?? data?.message?.channelType ?? source?.channelType ?? currentChannel?.channelType;
                if (!channelId || channelType == null) {
                    Toast.error(t("summary.common.operationFailed"));
                    return true;
                }
                WKApp.mittBus.emit("wk:toggle-summary-panel", {
                    channelId,
                    channelType,
                    summaryPanelView: "detail",
                    taskId,
                    forceOpen: true,
                });
                return true;
            }

            if (action.type === "open_summary_workspace") {
                openSummaryWorkspace(taskId, buildSourceConversationRef(data));
                return true;
            }

            if (action.type === "summary_reject") {
                openSummaryFeedbackModal({
                    taskId,
                    source: buildSourceConversationRef(data),
                    card,
                });
                return true;
            }

            if (action.type === "summary_accept") {
                try {
                    await respondToTask(taskId, "accept");
                    await sendConfirmedSummaryCardToSource(taskId, buildSourceConversationRef(data), card);
                    Toast.success(t("summary.action.accepted"));
                } catch (err: any) {
                    Toast.error(err?.message || t("summary.common.operationFailed"));
                }
                return true;
            }
            return false;
        });
    }
}

function buildRegenerateTopic(baseTitle: string, feedback: string) {
    const title = baseTitle.trim() || "群聊总结";
    const note = feedback.trim();
    return note ? `${title}\n\n调整要求：${note}` : title;
}

function getSummaryRootTaskId(card?: any, taskId?: number) {
    return String(card?.extra?.summaryRootTaskId || card?.extra?.rootTaskId || card?.entityId || taskId || "");
}

function getSummaryVersion(card?: any) {
    const rawVersion = card?.extra?.version;
    if (typeof rawVersion === "number" && Number.isFinite(rawVersion) && rawVersion > 0) return rawVersion;
    const match = String(card?.extra?.versionLabel || "").match(/v(\d+)/i);
    return match ? Number(match[1]) : 1;
}

function sourceItemToConversationRef(source?: { source_type?: number; source_id?: string }): SourceConversationRef | undefined {
    if (!source?.source_id) return undefined;
    if (source.source_type === 1) return { channelId: source.source_id, channelType: 2 };
    if (source.source_type === 2) return { channelId: source.source_id, channelType: 5 };
    if (source.source_type === 3) return { channelId: source.source_id, channelType: 1 };
    return undefined;
}

function resolveSummaryTarget(detail?: SummaryDetail, fallback?: SourceConversationRef): SourceConversationRef | undefined {
    if (detail?.origin_channel_id && detail.origin_channel_type != null && detail.origin_channel_type > 0) {
        return { channelId: detail.origin_channel_id, channelType: detail.origin_channel_type };
    }
    return sourceItemToConversationRef(detail?.sources?.[0]) || fallback;
}

function resolveSummaryTargetFromMeta(meta: ChatSummaryCreatedMeta, fallback?: SourceConversationRef): SourceConversationRef | undefined {
    return sourceItemToConversationRef(meta.sources?.[0]) || fallback;
}

async function sendBusinessCardToConversation(card: any, target?: SourceConversationRef) {
    if (!target?.channelId || target.channelType == null) return;
    const token = WKApp.loginInfo.token;
    if (!token) throw new Error(t("summary.common.operationFailed"));
    await axios.post("/v1/message/send", {
        token,
        receive_channel_id: target.channelId,
        receive_channel_type: target.channelType,
        payload: new BusinessCardContent(card).encodeJSON(),
        is_verify: 1,
    }, {
        headers: {
            token,
            ...(WKApp.shared.currentSpaceId ? { "X-Space-Id": WKApp.shared.currentSpaceId } : {}),
        },
    });
}

async function waitForCompletedSummary(taskId: number, timeoutMs = 90000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const statuses = await batchStatus([taskId]);
        const status = statuses.find((item) => item.id === taskId)?.status;
        if (status === TaskStatus.COMPLETED) {
            return getSummaryDetail(taskId);
        }
        if (status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) {
            throw new Error(t("summary.common.operationFailed"));
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("新版总结仍在生成中，请稍后回到群聊查看");
}

async function sendSummaryCardToSource(taskId: number, source?: SourceConversationRef, feedback?: string, card?: any) {
    const original = await getSummaryDetail(taskId);
    const next = await regenerateSummary(taskId, {
        topic: buildRegenerateTopic(original.title, feedback || ""),
    });
    const nextDetail = await waitForCompletedSummary(next.task_id);
    const target = resolveSummaryTarget(nextDetail, source) || resolveSummaryTarget(original);
    await sendBusinessCardToConversation(
        buildSummaryFeedbackCard(nextDetail, {
            sourceChannelId: target?.channelId,
            sourceChannelType: target?.channelType,
            rootTaskId: getSummaryRootTaskId(card, taskId),
            version: getSummaryVersion(card) + 1,
            feedback,
            time: new Date().toLocaleString(),
        }),
        target,
    );
    return nextDetail;
}

async function sendConfirmedSummaryCardToSource(taskId: number, source?: SourceConversationRef, card?: any) {
    const detail = await waitForCompletedSummary(taskId);
    const target = resolveSummaryTarget(detail, source);
    await sendBusinessCardToConversation(
        buildSummaryFeedbackCard(detail, {
            sourceChannelId: target?.channelId,
            sourceChannelType: target?.channelType,
            rootTaskId: getSummaryRootTaskId(card, taskId),
            version: getSummaryVersion(card),
            status: "confirmed",
            confirmedAt: new Date().toLocaleString(),
            time: new Date().toLocaleString(),
        }),
        target,
    );
    return detail;
}

async function sendCompletedSummaryCardToSource(taskId: number, source: SourceConversationRef) {
    const onceKey = `completed:${taskId}:${source.channelId}:${source.channelType}`;
    if (!markSummaryCardSending(onceKey)) return null;
    const detail = await waitForCompletedSummary(taskId);
    const target = resolveSummaryTarget(detail, source);
    await sendBusinessCardToConversation(
        buildSummaryFeedbackCard(detail, {
            sourceChannelId: target?.channelId,
            sourceChannelType: target?.channelType,
            time: new Date().toLocaleString(),
        }),
        target,
    );
    return detail;
}

async function sendStartedSummaryCardToSource(taskId: number, source: SourceConversationRef, meta: ChatSummaryCreatedMeta) {
    const target = resolveSummaryTargetFromMeta(meta, source);
    if (!target) return null;
    const onceKey = `started:${taskId}:${target.channelId}:${target.channelType}`;
    if (!markSummaryCardSending(onceKey)) return null;
    const sourceName = meta.sources?.[0]?.source_name || meta.sources?.[0]?.source_id || "当前会话";
    const now = new Date().toISOString();
    const detail: SummaryDetail = {
        task_id: taskId,
        task_no: `SUM-${taskId}`,
        title: meta.topic,
        summary_mode: SummaryMode.BY_GROUP,
        status: TaskStatus.PROCESSING,
        trigger_type: TriggerType.MANUAL,
        time_range_start: now,
        time_range_end: now,
        sources: meta.sources?.length
            ? meta.sources
            : [{ source_type: 1, source_id: source.channelId, source_name: sourceName }],
        participants: [],
        result: null,
        error_message: null,
        origin_channel_id: target.channelId || meta.originChannelId,
        origin_channel_type: target.channelType ?? meta.originChannelType,
        created_at: now,
        updated_at: now,
    };

    await sendBusinessCardToConversation(
        buildSummaryStartedCard(detail, {
            sourceChannelId: target.channelId,
            sourceChannelType: target.channelType,
            time: new Date().toLocaleString(),
        }),
        target,
    );
    return detail;
}

function markSummaryCardSending(key: string) {
    if (typeof window === "undefined") return true;
    const storageKey = `summary-card-sync:${key}`;
    if (window.sessionStorage.getItem(storageKey)) return false;
    window.sessionStorage.setItem(storageKey, "1");
    return true;
}

function openSummaryFeedbackModal(params: { taskId: number; source?: SourceConversationRef; card?: any }) {
    let feedback = "";
    Modal.confirm({
        title: "需要调整群总结",
        content: (
            <div className="summary-card-feedback-modal">
                <div className="summary-card-feedback-modal__hint">
                    写下需要补充或修正的点，Octo 会重新生成一版总结并回发到原群聊。
                </div>
                <TextArea
                    autosize={{ minRows: 4, maxRows: 6 }}
                    maxCount={500}
                    showClear
                    placeholder="例如：补充法务风险结论，把客户下一步动作列成清单。"
                    onChange={(value) => {
                        feedback = value;
                    }}
                />
            </div>
        ),
        okText: "提交并重新生成",
        cancelText: "取消",
        onOk: async () => {
            try {
                await sendSummaryCardToSource(params.taskId, params.source, feedback, params.card);
                Toast.success("新版总结已生成并回发群聊");
            } catch (err: any) {
                Toast.error(err?.message || t("summary.common.operationFailed"));
            }
        },
    });
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (_spaceChangedHandler) {
            WKApp.mittBus.off('space-changed', _spaceChangedHandler);
            _spaceChangedHandler = null;
        }
        _businessCardActionDisposer?.();
        _businessCardActionDisposer = null;
        _globalSummaryModalRoot?.unmount();
        _globalSummaryModalRoot = null;
        const el = document.getElementById("summary-global-modal-root");
        if (el) el.remove();
        _globalSummaryModalMounted = false;
    });
}

let _globalSummaryModalMounted = false;
let _globalSummaryModalRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;

function mountGlobalSummaryModal() {
    if (_globalSummaryModalMounted) return;
    _globalSummaryModalMounted = true;
    const container = document.createElement("div");
    container.id = "summary-global-modal-root";
    document.body.appendChild(container);
    _globalSummaryModalRoot = ReactDOM.createRoot(container);
    // 独立 root 不在主应用 <I18nProvider> 子树内，须自行包裹，
    // 否则全局弹窗运行时切语言不会刷新（拿到的是 I18nContext 默认值）。
    _globalSummaryModalRoot.render(
        <I18nProvider>
            <GlobalSummaryModal />
        </I18nProvider>,
    );
}

/**
 * 聊天上下文里创建总结成功后的收尾动作（实现见 utils/chatSummaryActions，
 * 拆分到独立文件以便单测不必经过引入 react-dom/client 的本模块）。
 */
function GlobalSummaryModal() {
    const [open, setOpen] = useState(false);
    const [channel, setChannel] = useState<{ channelID: string; channelType: number } | null>(null);

    useEffect(() => {
        const handler = (data: { channelId: string; channelType: number }) => {
            setChannel({ channelID: data.channelId, channelType: data.channelType });
            setOpen(true);
        };
        WKApp.mittBus.on("wk:open-summary-modal", handler);
        return () => {
            WKApp.mittBus.off("wk:open-summary-modal", handler);
        };
    }, []);

    if (!open || !channel) return null;

    return (
        <ChatSummaryNewModal
            visible={open}
            channel={channel}
            onClose={() => setOpen(false)}
            onSubmit={() => {
                setOpen(false);
                // 聊天上下文：不切换主 Tab（不调用 openSummaryDetail），
                // 改为在聊天侧栏内打开/刷新「智能总结」面板展示新建的总结。
                notifyChatSummaryCreated(channel);
            }}
            onSummaryCreated={(taskId: number, meta: ChatSummaryCreatedMeta) => {
                const source = resolveSummaryTargetFromMeta(meta, {
                    channelId: channel.channelID,
                    channelType: channel.channelType,
                });
                if (!source) {
                    Toast.error(t("summary.common.operationFailed"));
                    return;
                }
                void sendStartedSummaryCardToSource(taskId, source, meta).catch((err: any) => {
                    Toast.error(err?.message || t("summary.common.operationFailed"));
                });
                void sendCompletedSummaryCardToSource(taskId, source).then(() => {
                    Toast.success("群总结已完成并回发群聊");
                }).catch((err: any) => {
                    Toast.error(err?.message || t("summary.common.operationFailed"));
                });
            }}
        />
    );
}
