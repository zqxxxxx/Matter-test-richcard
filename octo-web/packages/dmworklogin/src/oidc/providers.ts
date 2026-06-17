import { WKApp } from '@octo/base'
import type { SSOProvider } from './types'

// SSO provider 列表来自后端 /v1/common/appconfig 的 oidc_providers 数组,
// 由 WKRemoteConfig 在启动时拉取并持有。本期长度 ≤ 1, 多 provider 接入无需前端改动。
//
// 每次调用都现读 WKApp.remoteConfig, 避免在 module load 期把空数组冻结住——
// providers.ts 在 remoteConfig 拉取完成前就会被 import 链路加载, 早绑定会拿到空。
export function getSSOProviders(): SSOProvider[] {
  return WKApp.remoteConfig.oidcProviders ?? []
}

export function getProviderById(id: string): SSOProvider | undefined {
  return getSSOProviders().find((p) => p.id === id)
}
