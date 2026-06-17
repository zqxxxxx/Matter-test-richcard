/**
 * 消息搜索结果条目的发送者「@SpaceName」后缀视觉 story。
 *
 * 覆盖四种场景：
 *   - 外部群消息（跨 Space 发送者）：发送者名字后渲染 @{sourceSpaceName}
 *   - 内部群消息（同 Space / 或 1v1）：不渲染后缀
 *   - 无发送者（1v1 直接渲染摘要）：对照组
 *   - 外部消息 + 摘要高亮：<mark> 高亮 + 后缀共存
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import ItemMessage from './item-message'

const meta: Meta<typeof ItemMessage> = {
  title: 'Base/GlobalSearch/ItemMessage',
  component: ItemMessage,
  parameters: {
    docs: {
      description: {
        component:
          '搜索结果消息条目，跨 Space 外部消息在发送者名字后展示来源 Space。',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof ItemMessage>

const AVATAR =
  'https://ui-avatars.com/api/?name=GR&background=45AAF2&color=fff&size=80'

export const ExternalGroupMessage: Story = {
  args: {
    name: '项目沟通群',
    avatar: AVATAR,
    sender: 'Alice',
    senderSourceSpaceName: 'ExampleCorp',
    digest: '明天的 review 会议挪到 10:00',
  },
}

export const InternalGroupMessage: Story = {
  args: {
    name: '内部讨论群',
    avatar: AVATAR,
    sender: 'Bob',
    senderSourceSpaceName: '',
    digest: '补了一版预算表，请帮忙看下',
  },
}

export const DirectMessageNoSender: Story = {
  args: {
    name: 'Alice',
    avatar: AVATAR,
    digest: '周五的合同文件我发你',
  },
}

export const ExternalMessageWithHighlight: Story = {
  args: {
    name: '跨公司协作群',
    avatar: AVATAR,
    sender: 'Carol',
    senderSourceSpaceName: 'PartnerCo',
    // tab-all 传入的 digest 可能已带关键字 <mark> 标记；sanitizeHighlight 放行。
    digest: '请确认<mark>合同</mark>编号 HT-2024-0519',
  },
}
