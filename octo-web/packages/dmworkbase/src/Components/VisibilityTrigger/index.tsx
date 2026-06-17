import React, { Component, ReactNode } from "react"

interface VisibilityTriggerProps {
    onVisible: () => void
    rootMargin?: string
    children: ReactNode
}

// 找到最近的可滚动祖先元素作为 IntersectionObserver root。
// 未找到时返回 null，IO 会 fallback 到 viewport。
// 注意：在弹窗等"内部滚动容器高度小于 viewport"的场景里，不绑 root 会把
// 所有 scroll 容器内的子元素都判为"viewport 可见"，导致懒加载失效。
function findScrollParent(node: HTMLElement | null): HTMLElement | null {
    let el: HTMLElement | null = node?.parentElement ?? null
    while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el)
        const overflowY = style.overflowY
        const overflowX = style.overflowX
        if (
            overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay" ||
            overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay"
        ) {
            return el
        }
        el = el.parentElement
    }
    return null
}

// 首次进入视口调用一次 onVisible 即 disconnect。用于列表懒加载，避免打开
// 弹窗时对全量数据一次性发请求（如 fetchChannelInfo 引发的 N+1 接口风暴）。
// 浏览器不支持 IntersectionObserver 时降级为同步触发。
export default class VisibilityTrigger extends Component<VisibilityTriggerProps> {
    private rootRef = React.createRef<HTMLDivElement>()
    private observer: IntersectionObserver | null = null
    private fired = false

    componentDidMount() {
        if (this.fired) return
        if (typeof IntersectionObserver === "undefined") {
            this.fire()
            return
        }
        const el = this.rootRef.current
        if (!el) return
        const root = findScrollParent(el)
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.fire()
                    break
                }
            }
        }, { root, threshold: 0, rootMargin: this.props.rootMargin ?? "100px 0px" })
        this.observer.observe(el)
    }

    componentWillUnmount() {
        this.disconnect()
    }

    private fire() {
        if (this.fired) return
        this.fired = true
        this.disconnect()
        try {
            this.props.onVisible()
        } catch (err) {
            console.error("[VisibilityTrigger] onVisible threw", err)
        }
    }

    private disconnect() {
        if (this.observer) {
            this.observer.disconnect()
            this.observer = null
        }
    }

    render() {
        return <div ref={this.rootRef}>{this.props.children}</div>
    }
}
