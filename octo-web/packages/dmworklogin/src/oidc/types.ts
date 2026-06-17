// SSOProvider 描述一个 OIDC IdP, 字段来自 /v1/common/appconfig 的 oidc_providers 数组。
// 不再硬编码具体厂商, 部署时由后端 env (DM_OIDC_PROVIDER_*) 决定下发什么。
export interface SSOProvider {
  id: string
  name: string
  authorizePath: string
  // OIDC 用户的账户中心首页, 用于 NavSettingsPanel 的「账户中心」入口跳转。
  accountUrl?: string
  // OIDC 修改/重置密码 URL, 用于登录页对 OIDC 用户的提示。
  resetPasswordUrl?: string
}

// 编译期断言: dmworkbase 的 OidcProviderConfig 与本包的 SSOProvider 结构必须一致。
// providers.ts 把前者直接当作后者返给调用方, 一旦其中一边新增字段而忘了同步,
// 这里会编译失败, 而不是在运行期静默通过更宽的类型。
import type { OidcProviderConfig } from '@octo/base'
type _AssertSSOProviderCompat = OidcProviderConfig extends SSOProvider
  ? SSOProvider extends OidcProviderConfig
    ? true
    : never
  : never
// 引用一次避免 noUnusedLocals 报警; 也让 IDE goto-def 能从这里跳到对端类型。
const _ssoProviderCompat: _AssertSSOProviderCompat = true
void _ssoProviderCompat

export interface PendingOidcLogin {
  providerId: string
  authcode: string
  savedAt: number
}

export const OIDC_AUTHCODE_TTL_MS = 5 * 60 * 1000

export const OIDC_AUTH_STATUS = {
  PENDING: 0,
  SUCCESS: 1,
  FAILED: 2,
} as const

export type OidcAuthStatus =
  (typeof OIDC_AUTH_STATUS)[keyof typeof OIDC_AUTH_STATUS]
