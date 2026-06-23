SET NAMES utf8mb4;

SET @space_id := COALESCE(NULLIF(@demo_space_id, ''), 'rc_demo_space');
SET @group_no := COALESCE(NULLIF(@demo_group_no, ''), 'rc_demo_group_contract');
SET @project_id := COALESCE(NULLIF(@demo_project_id, ''), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SET @matter_open := COALESCE(NULLIF(@demo_matter_open_id, ''), '11111111-1111-4111-8111-111111111111');
SET @matter_review := COALESCE(NULLIF(@demo_matter_review_id, ''), '44444444-4444-4444-8444-444444444444');
SET @matter_done := COALESCE(NULLIF(@demo_matter_done_id, ''), '22222222-2222-4222-8222-222222222222');
SET @matter_blocked := COALESCE(NULLIF(@demo_matter_blocked_id, ''), '33333333-3333-4333-8333-333333333333');

INSERT INTO matter_projects
  (id, space_id, name, description, scope, source_channel_id, source_name, default_leader_uid, creator_id, archived, created_at, updated_at)
VALUES
  (@project_id, @space_id, '合同上线项目', '富格式卡片验收用 Matter 项目', 'space', @group_no, 'Richcard 验收群', 'rc_demo_pm', 'rc_demo_pm', 0, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  source_channel_id = VALUES(source_channel_id),
  default_leader_uid = VALUES(default_leader_uid),
  archived = 0,
  updated_at = NOW(3);

INSERT INTO matters
  (id, seq_no, space_id, parent_matter_id, title, description, creator_id, leader_uid, status, mode, project_id,
   assignment_epoch, version, events_seq, processed_seq, inflight, expected_duration_minutes,
   last_activity_at, last_transition_at, block_reason_kind, block_reason_text,
   deadline, step_order, source_channel_id, source_channel_type, source_name, source_msg_ids,
   created_at, updated_at, deleted_at)
VALUES
  (@matter_open, 9001, @space_id, NULL, '完成客户合同 v3 评审',
   '客户合同已进入 v3 版本，需要销售、法务和 PM 一起确认风险条款，完成后在群里回传状态。',
   'rc_demo_pm', 'rc_demo_legal', 'in_progress', 'roundtable', @project_id,
   1, 1, 0, 0, 0, 240, NOW(3), NOW(3), NULL, NULL,
   DATE_ADD(NOW(3), INTERVAL 2 DAY), 100, @group_no, 2, 'Richcard 验收群', JSON_ARRAY(),
   NOW(3), NOW(3), NULL),
  (@matter_review, 9002, @space_id, NULL, '风险说明已回传，等待 PM 确认',
   '法务已给出红线条款说明，销售补充了客户侧承诺口径，Team Leader 已汇总成品，等待创建人盖章或圈点反馈。',
   'rc_demo_pm', 'rc_demo_pm', 'review', 'roundtable', @project_id,
   1, 1, 0, 0, 0, 180, NOW(3), NOW(3), NULL, NULL,
   DATE_ADD(NOW(3), INTERVAL 1 DAY), 150, @group_no, 2, 'Richcard 验收群', JSON_ARRAY(),
   NOW(3), NOW(3), NULL),
  (@matter_done, 9003, @space_id, NULL, '输出上线风险说明',
   '上线风险说明已整理完成，用于验证已完成 Matter 卡片可以打开详情。',
   'rc_demo_pm', 'rc_demo_sales', 'done', 'solo', @project_id,
   1, 1, 0, 0, 0, 120, NOW(3), NOW(3), NULL, NULL,
   DATE_ADD(NOW(3), INTERVAL 1 DAY), 200, @group_no, 2, 'Richcard 验收群', JSON_ARRAY(),
   NOW(3), NOW(3), NULL),
  (@matter_blocked, 9004, @space_id, NULL, '确认外部系统 API 联调窗口',
   '外部系统 API 联调窗口未确认，Matter 处于 blocked 状态，用于验证异常状态卡片。',
   'rc_demo_pm', 'rc_demo_bot', 'blocked', 'solo', @project_id,
   1, 1, 0, 0, 0, 180, NOW(3), NOW(3), 'system', '等待外部系统确认联调时间',
   DATE_ADD(NOW(3), INTERVAL 3 DAY), 300, @group_no, 2, 'Richcard 验收群', JSON_ARRAY(),
   NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  leader_uid = VALUES(leader_uid),
  status = VALUES(status),
  mode = VALUES(mode),
  project_id = VALUES(project_id),
  last_activity_at = VALUES(last_activity_at),
  last_transition_at = VALUES(last_transition_at),
  block_reason_kind = VALUES(block_reason_kind),
  block_reason_text = VALUES(block_reason_text),
  deadline = VALUES(deadline),
  step_order = VALUES(step_order),
  source_channel_id = VALUES(source_channel_id),
  source_channel_type = VALUES(source_channel_type),
  source_name = VALUES(source_name),
  updated_at = NOW(3),
  deleted_at = NULL;

INSERT IGNORE INTO matter_assignees (id, matter_id, user_id, created_at) VALUES
  ('a1111111-1111-4111-8111-111111111111', @matter_open, 'rc_demo_legal', NOW(3)),
  ('a1111111-1111-4111-8111-111111111112', @matter_open, 'rc_demo_sales', NOW(3)),
  ('a4444444-4444-4444-8444-444444444441', @matter_review, 'rc_demo_pm', NOW(3)),
  ('a4444444-4444-4444-8444-444444444442', @matter_review, 'rc_demo_legal', NOW(3)),
  ('a4444444-4444-4444-8444-444444444443', @matter_review, 'rc_demo_sales', NOW(3)),
  ('a2222222-2222-4222-8222-222222222222', @matter_done, 'rc_demo_sales', NOW(3)),
  ('a3333333-3333-4333-8333-333333333333', @matter_blocked, 'rc_demo_bot', NOW(3));

INSERT IGNORE INTO matter_participants (id, matter_id, user_id, created_at) VALUES
  ('p1111111-1111-4111-8111-111111111111', @matter_open, 'rc_demo_pm', NOW(3)),
  ('p1111111-1111-4111-8111-111111111112', @matter_open, 'rc_demo_legal', NOW(3)),
  ('p1111111-1111-4111-8111-111111111113', @matter_open, 'rc_demo_sales', NOW(3)),
  ('p4444444-4444-4444-8444-444444444441', @matter_review, 'rc_demo_pm', NOW(3)),
  ('p4444444-4444-4444-8444-444444444442', @matter_review, 'rc_demo_legal', NOW(3)),
  ('p4444444-4444-4444-8444-444444444443', @matter_review, 'rc_demo_sales', NOW(3)),
  ('p4444444-4444-4444-8444-444444444444', @matter_review, 'rc_demo_bot', NOW(3)),
  ('p2222222-2222-4222-8222-222222222222', @matter_done, 'rc_demo_pm', NOW(3)),
  ('p2222222-2222-4222-8222-222222222223', @matter_done, 'rc_demo_sales', NOW(3)),
  ('p3333333-3333-4333-8333-333333333333', @matter_blocked, 'rc_demo_pm', NOW(3)),
  ('p3333333-3333-4333-8333-333333333334', @matter_blocked, 'rc_demo_bot', NOW(3));

INSERT INTO matter_channels
  (id, matter_id, channel_id, channel_type, channel_name, linked_by, created_at)
VALUES
  ('c1111111-1111-4111-8111-111111111111', @matter_open, @group_no, 2, 'Richcard 验收群', 'rc_demo_pm', NOW(3)),
  ('c4444444-4444-4444-8444-444444444444', @matter_review, @group_no, 2, 'Richcard 验收群', 'rc_demo_pm', NOW(3)),
  ('c2222222-2222-4222-8222-222222222222', @matter_done, @group_no, 2, 'Richcard 验收群', 'rc_demo_pm', NOW(3)),
  ('c3333333-3333-4333-8333-333333333333', @matter_blocked, @group_no, 2, 'Richcard 验收群', 'rc_demo_pm', NOW(3))
ON DUPLICATE KEY UPDATE
  channel_type = VALUES(channel_type),
  channel_name = VALUES(channel_name),
  linked_by = VALUES(linked_by);

INSERT IGNORE INTO matter_timelines
  (id, matter_id, user_id, on_behalf_of, content, channel_id, channel_type, source_channel_id, source_msgs, related_uids, created_at)
VALUES
  ('t1111111-1111-4111-8111-111111111111', @matter_open, 'rc_demo_pm', NULL, '从客户群消息创建事项：请确认合同 v3 的付款和违约条款。', 'c1111111-1111-4111-8111-111111111111', 2, @group_no, JSON_ARRAY(), JSON_ARRAY('rc_demo_legal','rc_demo_sales'), NOW(3)),
  ('t1111111-1111-4111-8111-111111111112', @matter_open, 'rc_demo_legal', NULL, '法务已开始评审，预计今天给出风险意见。', 'c1111111-1111-4111-8111-111111111111', 2, @group_no, JSON_ARRAY(), JSON_ARRAY('rc_demo_pm'), NOW(3)),
  ('t4444444-4444-4444-8444-444444444441', @matter_review, 'rc_demo_legal', NULL, '已提交红线条款说明：付款节点可接受，违约上限建议不超过合同总额 20%。', 'c4444444-4444-4444-8444-444444444444', 2, @group_no, JSON_ARRAY(), JSON_ARRAY('rc_demo_pm','rc_demo_sales'), NOW(3)),
  ('t4444444-4444-4444-8444-444444444442', @matter_review, 'rc_demo_sales', NULL, '已补充客户承诺口径，等待 PM 确认后可发给客户。', 'c4444444-4444-4444-8444-444444444444', 2, @group_no, JSON_ARRAY(), JSON_ARRAY('rc_demo_pm'), NOW(3)),
  ('t2222222-2222-4222-8222-222222222222', @matter_done, 'rc_demo_sales', NULL, '上线风险说明已完成，结论：可按计划推进。', 'c2222222-2222-4222-8222-222222222222', 2, @group_no, JSON_ARRAY(), JSON_ARRAY('rc_demo_pm'), NOW(3)),
  ('t3333333-3333-4333-8333-333333333333', @matter_blocked, 'rc_demo_bot', NULL, '联调窗口未确认，系统自动标记为 blocked。', 'c3333333-3333-4333-8333-333333333333', 2, @group_no, JSON_ARRAY(), JSON_ARRAY('rc_demo_pm'), NOW(3));

INSERT IGNORE INTO matter_activities
  (id, matter_id, actor_id, action, detail, created_at)
VALUES
  ('e1111111-1111-4111-8111-111111111111', @matter_open, 'rc_demo_pm', 'demo_seeded', JSON_OBJECT('summary', '创建进行中事项验收数据'), NOW(3)),
  ('e4444444-4444-4444-8444-444444444444', @matter_review, 'rc_demo_bot', 'demo_seeded', JSON_OBJECT('summary', '创建审核中事项验收数据'), NOW(3)),
  ('e2222222-2222-4222-8222-222222222222', @matter_done, 'rc_demo_sales', 'demo_seeded', JSON_OBJECT('summary', '创建已完成事项验收数据'), NOW(3)),
  ('e3333333-3333-4333-8333-333333333333', @matter_blocked, 'rc_demo_bot', 'demo_seeded', JSON_OBJECT('summary', '创建受阻事项验收数据'), NOW(3));
