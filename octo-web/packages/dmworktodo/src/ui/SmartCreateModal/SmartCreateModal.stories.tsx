import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import SmartCreateModal from './index'

const meta: Meta<typeof SmartCreateModal> = {
  title: 'Matter/SmartCreateModal',
  component: SmartCreateModal,
  tags: ['autodocs'],
  argTypes: {
    visible: { control: 'boolean' },
    blank: { control: 'boolean' },
    loading: { control: 'boolean' },
    count: { control: 'number' },
  },
}

export default meta
type Story = StoryObj<typeof SmartCreateModal>

/**
 * 空白新建 — 手动填写模式
 */
export const BlankCreate: Story = {
  args: {
    visible: true,
    blank: true,
    onClose: () => {},
    onConfirm: async (req) => {
      console.log('创建事项:', req)
    },
  },
}

/**
 * 智能创建 — AI 预填模式
 */
export const SmartCreate: Story = {
  args: {
    visible: true,
    blank: false,
    count: 5,
    loading: false,
    initialValues: {
      title: 'Octo 产品策略 PPT 打磨',
      description: '完成 Octo 产品策略 PPT 的最终版本，包含市场分析和竞品对比',
      deadline: '2026-05-20',
    },
    onClose: () => {},
    onConfirm: async (req) => {
      console.log('创建事项:', req)
    },
  },
}

/**
 * AI 提取中 — loading 状态
 */
export const Loading: Story = {
  args: {
    visible: true,
    blank: false,
    count: 3,
    loading: true,
    onClose: () => {},
    onConfirm: async () => {},
  },
}

/**
 * 带频道信息 — 显示来源群
 */
export const WithChannel: Story = {
  args: {
    visible: true,
    blank: false,
    count: 8,
    loading: false,
    initialValues: {
      title: '确认 AI Native 成员身份',
      description: '向群内成员确认是否属于 AI Native 团队',
      deadline: '2026-05-25',
    },
    channel: {
      channelId: '111bcaea9ad145ca9b8fafdad50b2196',
      channelType: 2,
      name: '产品负责人群',
    },
    onClose: () => {},
    onConfirm: async (req) => {
      console.log('创建事项:', req)
    },
  },
}
