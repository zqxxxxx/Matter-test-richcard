import React from 'react';
import { useI18n } from '@octo/base';
import type { MatterStatus } from '../../bridge/types';
import { getMatterStatusMeta } from '../../utils/matterStatus';
import './index.css';

export interface MatterStatusBadgeProps {
  status: MatterStatus;
  className?: string;
}

export default function MatterStatusBadge({ status, className }: MatterStatusBadgeProps) {
  const { t } = useI18n();
  const meta = getMatterStatusMeta(status);
  return (
    <span
      className={`wk-matter-status-badge wk-matter-status-badge--${meta.tone}${className ? ` ${className}` : ''}`}
    >
      {t(meta.labelKey)}
    </span>
  );
}

export { MatterStatusBadge };
