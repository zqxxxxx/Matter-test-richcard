import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import type { IModule } from "@octo/base";
import { BusinessCardContent, buildSourceConversationRef, i18n, I18nProvider, WKApp, t, registerBusinessCardActionHandler, type SourceConversationRef } from "@octo/base";
import { Modal, TextArea, Toast } from "@douyinfe/semi-ui";
import WKSDK, { Channel } from "wukongimjssdk";
import SummaryListPage from "./pages/SummaryListPage";
import SummaryCreatePage from "./pages/SummaryCreatePage";
import SummaryDetailPage from "./pages/SummaryDetailPage";
import SummaryConfirmPage from "./pages/SummaryConfirmPage";
import ScheduleListPage from "./pages/ScheduleListPage";
import { batchStatus, getChatCandidates, getSummaryDetail, regenerateSummary, respondToTask } from "./api/summaryApi";
import { notifyChatSummaryCreated } from "./utils/chatSummaryActions";
import { isSupportedChannelType } from "./utils/channelType";
import { openSummaryWorkspace } from "./utils/summaryWorkspaceNavigation";
import { buildSummaryFeedbackCard } from "./utils/businessCard";
import { TaskStatus } from "./types/summary";
import ChatSummaryStarButton from "./components/ChatSummaryStarButton";
import ChatSummaryPanel from "./components/ChatSummaryPanel";
import ChatSummaryNewModal from "./components/ChatSummaryNewModal";
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
            ({ channel, onClose, activeTaskId }) => (
                <ChatSummaryPanel
                    visible={true}
                    channel={channel}
                    initialTaskId={activeTaskId}
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
                WKApp.openSummaryDetail?.(taskId, buildSourceConversationRef(data));
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
                });
                return true;
            }

            if (action.type === "summary_accept") {
                try {
                    await respondToTask(taskId, "accept");
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

async function sendSummaryCardToSource(taskId: number, source?: SourceConversationRef, feedback?: string) {
    const original = await getSummaryDetail(taskId);
    const next = await regenerateSummary(taskId, {
        topic: buildRegenerateTopic(original.title, feedback || ""),
    });
    const nextDetail = await waitForCompletedSummary(next.task_id);
    const channelId = source?.channelId || nextDetail.origin_channel_id || original.origin_channel_id;
    const channelType = source?.channelType || nextDetail.origin_channel_type || original.origin_channel_type;
    if (!channelId || channelType == null) return nextDetail;

    await WKSDK.shared().chatManager.send(
        new BusinessCardContent(buildSummaryFeedbackCard(nextDetail, {
            sourceChannelId: channelId,
            sourceChannelType: channelType,
            time: new Date().toLocaleString(),
        })),
        new Channel(channelId, channelType),
    );
    return nextDetail;
}

function openSummaryFeedbackModal(params: { taskId: number; source?: SourceConversationRef }) {
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
                await sendSummaryCardToSource(params.taskId, params.source, feedback);
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
        />
    );
}
