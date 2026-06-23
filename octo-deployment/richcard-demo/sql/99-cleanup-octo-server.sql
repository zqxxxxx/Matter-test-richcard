SET NAMES utf8mb4;

SET @space_id := COALESCE(NULLIF(@demo_space_id, ''), 'rc_demo_space');
SET @group_no := COALESCE(NULLIF(@demo_group_no, ''), 'rc_demo_group_contract');

DELETE FROM group_setting WHERE group_no = @group_no;
DELETE FROM group_member WHERE group_no = @group_no;
DELETE FROM `group` WHERE group_no = @group_no;
DELETE FROM space_member WHERE space_id = @space_id AND (uid LIKE 'rc_demo_%' OR uid = 'botfather');
DELETE FROM `space` WHERE space_id = @space_id;
DELETE FROM `user` WHERE uid LIKE 'rc_demo_%';

