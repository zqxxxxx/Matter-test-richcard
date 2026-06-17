import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

/** 新标签打开图标 */
export const IconLaunch: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="1 1.5 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.332 2.00004L9.33221 2.00004L9.33221 3.33337L12.0554 3.33337L6.46786 8.92123L7.41069 9.86401L12.9986 4.2758L12.9985 7.00002L14.3319 7.00006L14.332 2.00004ZM7.3319 3.33333L2.99857 3.33333L2.99857 13.3333L12.9986 13.3333L12.9986 9L14.3319 9L14.3319 13.6667C14.3319 14.219 13.8842 14.6667 13.3319 14.6667L2.66524 14.6667C2.11295 14.6667 1.66524 14.219 1.66524 13.6667L1.66524 3C1.66524 2.44772 2.11295 2 2.66524 2L7.3319 2L7.3319 3.33333Z"
      fill="currentColor"
    />
  </svg>
);

/** 回复消息图标 */
export const IconMessage: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="1.5 1 13.5 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 7.99996C2 4.50216 4.83553 1.66663 8.33333 1.66663C11.8311 1.66663 14.6667 4.50216 14.6667 7.99996V8.20984C14.6667 11.5917 11.9251 14.3333 8.54321 14.3333H2V7.99996ZM8.33333 2.99996C5.57191 2.99996 3.33333 5.23854 3.33333 7.99996V13H8.54321C11.1887 13 13.3333 10.8553 13.3333 8.20984V7.99996C13.3333 5.23854 11.0948 2.99996 8.33333 2.99996ZM11.3333 5.99996V7.33329H5.33333V5.99996H11.3333ZM8.33333 10.3333H5.33333V8.99996H8.33333V10.3333Z"
      fill="currentColor"
    />
  </svg>
);

/** 下载图标 */
export const IconDownload: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="1.5 1 13 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.33333 8.77084V1.66663H8.66667V8.77155L10.5526 6.88558L11.4955 7.82839L8.00036 11.3235L4.50526 7.82839L5.44807 6.88558L7.33333 8.77084ZM3.33333 13V11.6666H2V14.3333H14V11.6666H12.6667V13H3.33333Z"
      fill="currentColor"
    />
  </svg>
);

/** 关闭图标 */
export const IconClose: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="2 2 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M11.773 13.1854C12.1635 13.5759 12.7967 13.5759 13.1872 13.1854C13.5778 12.7949 13.5778 12.1617 13.1872 11.7712L9.41599 7.99995L13.1872 4.22871C13.5778 3.83819 13.5778 3.20502 13.1872 2.8145C12.7967 2.42398 12.1635 2.42398 11.773 2.8145L8.00178 6.58574L4.23054 2.8145C3.84002 2.42398 3.20686 2.42398 2.81633 2.8145C2.42581 3.20502 2.42581 3.83819 2.81633 4.22871L6.58757 7.99995L2.81633 11.7712C2.42581 12.1617 2.42581 12.7949 2.81633 13.1854C3.20686 13.5759 3.84002 13.5759 4.23054 13.1854L8.00178 9.41416L11.773 13.1854Z"
      fill="currentColor"
    />
  </svg>
);

/** 下拉箭头图标 */
export const IconDropdown: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4.63468 5.14844H11.389C11.6552 5.14844 11.814 5.44515 11.6663 5.66667L8.28919 10.7324C8.15724 10.9303 7.86643 10.9303 7.73449 10.7324L4.35733 5.66667C4.20965 5.44515 4.36844 5.14844 4.63468 5.14844Z"
      fill="currentColor"
    />
  </svg>
);

/** 菜单折叠图标 */
export const IconMenuFold: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="2 4 20 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21 6.5H3V4.5H21V6.5ZM21 13L11 13V11L21 11V13ZM3 19.5L21 19.5V17.5L3 17.5V19.5ZM7.058 8.99925C7.39068 8.78398 7.82963 9.02278 7.82963 9.41903V14.3751C7.82963 14.7714 7.39068 15.0102 7.058 14.7949L3.22837 12.3169C2.92388 12.1198 2.92388 11.6743 3.22837 11.4773L7.058 8.99925Z"
      fill="currentColor"
    />
  </svg>
);

/** 减号图标 */
export const IconMinus: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.5 8.33333H3V7H12.5V8.33333Z"
      fill="currentColor"
    />
  </svg>
);

/** 加号图标 */
export const IconPlus: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.25 7.25V3H8.25V7.25H12.5V8.25H8.25V12.5H7.25V8.25H3V7.25H7.25Z"
      fill="currentColor"
    />
  </svg>
);
