SET NAMES utf8mb4;

SET @space_id := COALESCE(NULLIF(@demo_space_id, ''), 'rc_demo_space');
SET @group_no := COALESCE(NULLIF(@demo_group_no, ''), 'rc_demo_group_contract');
SET @password := COALESCE(NULLIF(@demo_password, ''), 'Octo@123456');
SET @password_hash := MD5(MD5(@password));

INSERT INTO `user`
  (uid, name, short_no, username, password, role, phone, zone, search_by_phone, search_by_short,
   new_msg_notice, voice_on, shock_on, msg_show_detail, status, is_upload_avatar, category, robot)
VALUES
  ('rc_demo_pm', '赵倩笑 PM', 'rc1001', 'rc_demo_pm', @password_hash, '', '13900001001', '0086', 1, 1, 1, 1, 1, 1, 1, 0, '', 0),
  ('rc_demo_sales', '销售同学', 'rc1002', 'rc_demo_sales', @password_hash, '', '13900001002', '0086', 1, 1, 1, 1, 1, 1, 1, 0, '', 0),
  ('rc_demo_legal', '法务同学', 'rc1003', 'rc_demo_legal', @password_hash, '', '13900001003', '0086', 1, 1, 1, 1, 1, 1, 1, 0, '', 0),
  ('rc_demo_bot', 'Matter 助手', 'rc1004', 'rc_demo_bot', @password_hash, '', '13900001004', '0086', 0, 0, 1, 0, 0, 1, 1, 0, 'service', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  username = VALUES(username),
  password = VALUES(password),
  status = 1,
  robot = VALUES(robot),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO `space`
  (space_id, name, description, logo, creator, status)
VALUES
  (@space_id, 'Richcard 验收空间', '用于富格式消息卡片真实数据闭环验收', '', 'rc_demo_pm', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  creator = VALUES(creator),
  status = 1,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO `space_member`
  (space_id, uid, role, status)
VALUES
  (@space_id, 'rc_demo_pm', 2, 1),
  (@space_id, 'rc_demo_sales', 0, 1),
  (@space_id, 'rc_demo_legal', 0, 1),
  (@space_id, 'rc_demo_bot', 0, 1),
  (@space_id, 'botfather', 0, 1)
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  status = 1,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO `group`
  (group_no, name, creator, status, forbidden, invite, allow_view_history_msg, space_id)
VALUES
  (@group_no, 'Richcard 验收群', 'rc_demo_pm', 1, 0, 1, 1, @space_id)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  creator = VALUES(creator),
  status = 1,
  space_id = VALUES(space_id),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO `group_member`
  (group_no, uid, remark, role, is_deleted, status, robot, invite_uid)
VALUES
  (@group_no, 'rc_demo_pm', '', 1, 0, 1, 0, ''),
  (@group_no, 'rc_demo_sales', '', 0, 0, 1, 0, 'rc_demo_pm'),
  (@group_no, 'rc_demo_legal', '', 0, 0, 1, 0, 'rc_demo_pm'),
  (@group_no, 'rc_demo_bot', '', 0, 0, 1, 1, 'rc_demo_pm'),
  (@group_no, 'botfather', '', 0, 0, 1, 1, 'rc_demo_pm')
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  is_deleted = 0,
  status = 1,
  robot = VALUES(robot),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO `group_setting`
  (uid, group_no, remark, mute, top, show_nick, save, chat_pwd_on, revoke_remind, join_group_remind, screenshot, receipt)
VALUES
  ('rc_demo_pm', @group_no, '', 0, 1, 1, 1, 0, 1, 0, 0, 1),
  ('rc_demo_sales', @group_no, '', 0, 0, 1, 1, 0, 1, 0, 0, 1),
  ('rc_demo_legal', @group_no, '', 0, 0, 1, 1, 0, 1, 0, 0, 1),
  ('rc_demo_bot', @group_no, '', 0, 0, 1, 1, 0, 1, 0, 0, 1)
ON DUPLICATE KEY UPDATE
  show_nick = VALUES(show_nick),
  save = VALUES(save),
  updated_at = CURRENT_TIMESTAMP;

