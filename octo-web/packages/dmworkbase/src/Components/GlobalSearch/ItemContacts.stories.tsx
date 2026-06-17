/**
 * 联系人搜索结果条目的「@SpaceName」后缀视觉 story。
 *
 * 覆盖四种场景：
 *   - 跨 Space 外部成员：姓名后渲染 @{sourceSpaceName}
 *   - 同 Space 成员：不渲染后缀
 *   - 外部 Bot：后缀 + AI badge 同行可见
 *   - 关键字高亮 + 后缀共存：<mark> 不影响后缀布局
 *
 * 组件纯展示，不依赖 WKSDK/网络。
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import ItemContacts from './item-contacts'

const meta: Meta<typeof ItemContacts> = {
  title: 'Base/GlobalSearch/ItemContacts',
  component: ItemContacts,
  parameters: {
    docs: {
      description: {
        component:
          '搜索结果联系人条目，跨 Space 时在姓名后展示来源 Space，避免误选外部成员。',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof ItemContacts>

const AVATAR =
  'https://ui-avatars.com/api/?name=AA&background=7C5CFC&color=fff&size=80'

export const CrossSpaceExternal: Story = {
  args: {
    name: 'Alice',
    avatar: AVATAR,
    sourceSpaceName: 'ExampleCorp',
  },
}

export const SameSpaceNoSuffix: Story = {
  args: {
    name: 'Bob',
    avatar: AVATAR,
    sourceSpaceName: '',
  },
}

export const CrossSpaceBot: Story = {
  args: {
    name: 'Helper Bot',
    avatar: AVATAR,
    isBot: true,
    sourceSpaceName: 'PartnerCo',
  },
}

export const KeywordHighlightWithSuffix: Story = {
  args: {
    // tab-contacts 会把匹配到的关键字包进 <mark>；sanitizeHighlight 放行 <mark>。
    name: 'Al<mark>ice</mark>',
    avatar: AVATAR,
    sourceSpaceName: 'ExampleCorp',
  },
}
