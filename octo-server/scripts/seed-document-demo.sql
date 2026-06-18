-- Dev-only seed for Octo document center verification.
-- Run after migrations, against the target Octo MySQL database:
-- mysql -uroot -p --default-character-set=utf8mb4 < octo-server/scripts/seed-document-demo.sql

SET NAMES utf8mb4;
SET collation_connection = 'utf8mb4_general_ci';

SET @tenant_space_id = 'space-demo-octo';
SET @product_group = 'grp_product_docs';
SET @delivery_group = 'grp_delivery_docs';
SET @policy_group = 'grp_policy_docs';
SET @pm_default_category = 'catdemopmchendefault000000001';

DELETE FROM document_asset_event
WHERE tenant_space_id = @tenant_space_id
   OR event_id IN (
    'EVT-DEMO-UPLOAD-001',
    'EVT-DEMO-SEND-001',
    'EVT-DEMO-ARCHIVE-001',
    'EVT-DEMO-PREVIEW-001',
    'EVT-DEMO-DOWNLOAD-001',
    'EVT-DEMO-TRASH-001',
    'EVT-DEMO-RESTORE-001',
    'EVT-DEMO-BIND-001',
    'EVT-DEMO-BIND-002',
    'EVT-DEMO-BIND-003'
   );

DELETE FROM document_asset WHERE tenant_space_id = @tenant_space_id;
DELETE FROM document_space_binding WHERE tenant_space_id = @tenant_space_id;
DELETE FROM document_space WHERE tenant_space_id = @tenant_space_id;

DELETE FROM group_member WHERE group_no IN (@product_group, @delivery_group, @policy_group);
DELETE FROM group_setting WHERE group_no IN (@product_group, @delivery_group, @policy_group);
DELETE FROM group_category WHERE space_id = @tenant_space_id AND uid IN ('pm_chen', 'delivery_liu', 'hr_zhao', 'admin_zhou');
DELETE FROM `group` WHERE group_no IN (@product_group, @delivery_group, @policy_group);
DELETE FROM space_member WHERE space_id = @tenant_space_id;
DELETE FROM `space` WHERE space_id = @tenant_space_id;
DELETE FROM `user`
WHERE uid IN ('pm_chen', 'delivery_liu', 'hr_zhao', 'admin_zhou', 'u_10000', 'fileHelper');

INSERT INTO `user`
  (uid, name, short_no, username, phone, zone, vercode, status, is_upload_avatar, category, created_at, updated_at)
VALUES
  ('pm_chen', '陈一', '860101', 'pm_chen', '13900000101', '0086', 'seed-doc-pm', 1, 0, '', NOW(), NOW()),
  ('delivery_liu', '刘青', '860102', 'delivery_liu', '13900000102', '0086', 'seed-doc-delivery', 1, 0, '', NOW(), NOW()),
  ('hr_zhao', '赵宁', '860103', 'hr_zhao', '13900000103', '0086', 'seed-doc-hr', 1, 0, '', NOW(), NOW()),
  ('admin_zhou', '周岚', '860104', 'admin_zhou', '13900000104', '0086', 'seed-doc-admin', 1, 0, '', NOW(), NOW()),
  ('u_10000', '系统通知', '860901', 'u_10000', '', '0086', 'seed-doc-system', 1, 1, 'system', NOW(), NOW()),
  ('fileHelper', '文件传输助手', '860902', 'fileHelper', '', '0086', 'seed-doc-file-helper', 1, 1, 'system', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  username = VALUES(username),
  phone = VALUES(phone),
  is_upload_avatar = VALUES(is_upload_avatar),
  category = VALUES(category),
  status = 1,
  updated_at = NOW();

INSERT INTO `space`
  (space_id, name, description, logo, creator, status, version, created_at, updated_at)
VALUES
  (@tenant_space_id, 'Octo 文档验收空间', '用于文档中心真实数据闭环验收', '', 'admin_zhou', 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  status = 1,
  updated_at = NOW();

INSERT INTO space_member
  (space_id, uid, role, status, version, created_at, updated_at)
VALUES
  (@tenant_space_id, 'admin_zhou', 2, 1, 1, NOW(), NOW()),
  (@tenant_space_id, 'pm_chen', 1, 1, 1, NOW(), NOW()),
  (@tenant_space_id, 'delivery_liu', 0, 1, 1, NOW(), NOW()),
  (@tenant_space_id, 'hr_zhao', 0, 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  status = 1,
  updated_at = NOW();

INSERT INTO `group`
  (group_no, name, creator, status, forbidden, invite, version, space_id, notice, created_at, updated_at)
VALUES
  (@product_group, '产品方案讨论群', 'pm_chen', 1, 0, 1, 1, @tenant_space_id, '产品需求、竞品资料和评审结论沉淀在产品部公共空间', NOW(), NOW()),
  (@delivery_group, '华东项目交付群', 'delivery_liu', 1, 0, 1, 1, @tenant_space_id, '客户交付材料和现场实施计划沉淀在华东交付空间', NOW(), NOW()),
  (@policy_group, '行政制度发布群', 'admin_zhou', 1, 0, 1, 1, @tenant_space_id, '公司级正式制度和公告沉淀在公司制度空间', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  creator = VALUES(creator),
  status = 1,
  space_id = VALUES(space_id),
  notice = VALUES(notice),
  updated_at = NOW();

INSERT INTO group_member
  (group_no, uid, remark, role, version, is_deleted, status, robot, invite_uid, created_at, updated_at)
VALUES
  (@product_group, 'pm_chen', '', 1, 1, 0, 1, 0, 'admin_zhou', NOW(), NOW()),
  (@product_group, 'delivery_liu', '', 0, 1, 0, 1, 0, 'pm_chen', NOW(), NOW()),
  (@product_group, 'admin_zhou', '', 2, 1, 0, 1, 0, 'pm_chen', NOW(), NOW()),
  (@delivery_group, 'delivery_liu', '', 1, 1, 0, 1, 0, 'admin_zhou', NOW(), NOW()),
  (@delivery_group, 'pm_chen', '', 0, 1, 0, 1, 0, 'delivery_liu', NOW(), NOW()),
  (@delivery_group, 'admin_zhou', '', 2, 1, 0, 1, 0, 'delivery_liu', NOW(), NOW()),
  (@policy_group, 'admin_zhou', '', 1, 1, 0, 1, 0, 'admin_zhou', NOW(), NOW()),
  (@policy_group, 'hr_zhao', '', 2, 1, 0, 1, 0, 'admin_zhou', NOW(), NOW()),
  (@policy_group, 'pm_chen', '', 0, 1, 0, 1, 0, 'admin_zhou', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  is_deleted = 0,
  status = 1,
  updated_at = NOW();

INSERT INTO group_category
  (category_id, space_id, uid, name, sort, status, is_default, created_at, updated_at)
VALUES
  (@pm_default_category, @tenant_space_id, 'pm_chen', '__default__', 0, 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  space_id = VALUES(space_id),
  uid = VALUES(uid),
  name = VALUES(name),
  sort = VALUES(sort),
  status = 1,
  is_default = 1,
  updated_at = NOW();

INSERT INTO group_setting
  (uid, group_no, remark, mute, top, show_nick, save, chat_pwd_on, revoke_remind, join_group_remind, screenshot, receipt, version, category_id, category_sort, created_at, updated_at)
VALUES
  ('pm_chen', @product_group, '', 0, 0, 0, 0, 0, 1, 0, 1, 1, UNIX_TIMESTAMP(NOW(6)) * 1000000, @pm_default_category, 1, NOW(), NOW()),
  ('pm_chen', @delivery_group, '', 0, 0, 0, 0, 0, 1, 0, 1, 1, UNIX_TIMESTAMP(NOW(6)) * 1000000, @pm_default_category, 2, NOW(), NOW()),
  ('pm_chen', @policy_group, '', 0, 0, 0, 0, 0, 1, 0, 1, 1, UNIX_TIMESTAMP(NOW(6)) * 1000000, @pm_default_category, 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  category_sort = VALUES(category_sort),
  version = VALUES(version),
  updated_at = NOW();

INSERT INTO document_space
  (space_id, name, description, owner_uid, tenant_space_id, status, created_at, updated_at)
VALUES
  ('doc-space-product', '产品部公共空间', '管理需求清单、竞品资料和评审结论', 'pm_chen', @tenant_space_id, 1, NOW(), NOW()),
  ('doc-space-delivery', '华东交付空间', '沉淀客户交付材料、项目计划和现场实施记录', 'delivery_liu', @tenant_space_id, 1, NOW(), NOW()),
  ('doc-space-policy', '公司制度空间', '公司级正式制度、公告和版本记录', 'admin_zhou', @tenant_space_id, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  owner_uid = VALUES(owner_uid),
  tenant_space_id = VALUES(tenant_space_id),
  status = 1,
  updated_at = NOW();

INSERT INTO document_space_binding
  (binding_id, document_space_id, source_channel_id, source_channel_type, source_name, created_by, tenant_space_id, status, created_at, updated_at)
VALUES
  ('BIND-DEMO-PRODUCT', 'doc-space-product', @product_group, 2, '产品方案讨论群', 'pm_chen', @tenant_space_id, 1, NOW(), NOW()),
  ('BIND-DEMO-DELIVERY', 'doc-space-delivery', @delivery_group, 2, '华东项目交付群', 'delivery_liu', @tenant_space_id, 1, NOW(), NOW()),
  ('BIND-DEMO-POLICY', 'doc-space-policy', @policy_group, 2, '行政制度发布群', 'admin_zhou', @tenant_space_id, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  source_name = VALUES(source_name),
  created_by = VALUES(created_by),
  status = 1,
  updated_at = NOW();

INSERT INTO document_asset
  (asset_id, name, kind, extension, size, storage_path, source_type, source_channel_id, source_channel_type, source_message_id, source_name, uploader_uid, uploader_name, owner_uid, owner_name, tenant_space_id, document_space_id, original_space_id, visibility, status, downloads, previewable, last_access_at, created_at, updated_at)
VALUES
  ('DOC-DEMO-001', 'Q3 客户现场实施计划.pdf', 'pdf', '.pdf', 18400000, 'common/documents/demo/q3-delivery-plan.pdf', '群聊', @delivery_group, 2, 'msg-demo-1001', '华东项目交付群', 'delivery_liu', '刘青', 'delivery_liu', '刘青', @tenant_space_id, 'doc-space-delivery', 'doc-space-delivery', 'space', 'archived', 12, 1, '2026-06-17 09:30:00', '2026-06-16 17:20:00', NOW()),
  ('DOC-DEMO-002', 'Octo 文件空间需求清单.xlsx', 'sheet', '.xlsx', 2100000, 'common/documents/demo/octo-file-requirements.xlsx', '群聊', @product_group, 2, 'msg-demo-1002', '产品方案讨论群', 'pm_chen', '陈一', 'pm_chen', '陈一', @tenant_space_id, 'doc-space-product', 'doc-space-product', 'space', 'archived', 8, 1, '2026-06-17 10:05:00', '2026-06-17 09:40:00', NOW()),
  ('DOC-DEMO-003', '制度更新说明.docx', 'doc', '.docx', 1600000, 'common/documents/demo/policy-update.docx', '群聊', @policy_group, 2, 'msg-demo-1003', '行政制度发布群', 'admin_zhou', '周岚', 'admin_zhou', '周岚', @tenant_space_id, 'doc-space-policy', 'doc-space-policy', 'space', 'archived', 3, 1, '2026-06-17 10:10:00', '2026-06-17 09:50:00', NOW()),
  ('DOC-DEMO-004', '客户账号权限确认截图.png', 'image', '.png', 820000, 'common/documents/demo/account-confirm.png', '群聊', @delivery_group, 2, 'msg-demo-1004', '华东项目交付群', 'delivery_liu', '刘青', 'delivery_liu', '刘青', @tenant_space_id, '', '', 'conversation', 'conversation', 1, 1, '2026-06-17 10:15:00', '2026-06-17 10:15:00', NOW()),
  ('DOC-DEMO-005', '离职交接资料包.zip', 'zip', '.zip', 76900000, 'common/documents/demo/offboarding.zip', '群聊', @policy_group, 2, 'msg-demo-1005', '行政制度发布群', 'hr_zhao', '赵宁', 'hr_zhao', '赵宁', @tenant_space_id, '', '', 'conversation', 'conversation', 0, 0, '2026-06-17 10:18:00', '2026-06-17 10:18:00', NOW()),
  ('DOC-DEMO-006', '客户现场会议纪要.docx', 'doc', '.docx', 950000, 'common/documents/demo/customer-meeting.docx', '应用', '', 0, '', '直接上传', 'pm_chen', '陈一', 'pm_chen', '陈一', @tenant_space_id, 'doc-space-product', 'doc-space-product', 'space', 'archived', 0, 1, '2026-06-17 10:22:00', '2026-06-17 10:22:00', NOW()),
  ('DOC-DEMO-007', '旧版制度说明.docx', 'doc', '.docx', 1300000, 'common/documents/demo/old-policy.docx', '群聊', @policy_group, 2, 'msg-demo-1007', '行政制度发布群', 'admin_zhou', '周岚', 'admin_zhou', '周岚', @tenant_space_id, 'doc-space-policy', 'doc-space-policy', 'space', 'deleted', 5, 1, '2026-06-17 10:25:00', '2026-06-16 16:30:00', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  kind = VALUES(kind),
  extension = VALUES(extension),
  size = VALUES(size),
  storage_path = VALUES(storage_path),
  source_type = VALUES(source_type),
  source_channel_id = VALUES(source_channel_id),
  source_channel_type = VALUES(source_channel_type),
  source_message_id = VALUES(source_message_id),
  source_name = VALUES(source_name),
  uploader_uid = VALUES(uploader_uid),
  uploader_name = VALUES(uploader_name),
  owner_uid = VALUES(owner_uid),
  owner_name = VALUES(owner_name),
  tenant_space_id = VALUES(tenant_space_id),
  document_space_id = VALUES(document_space_id),
  original_space_id = VALUES(original_space_id),
  visibility = VALUES(visibility),
  status = VALUES(status),
  downloads = VALUES(downloads),
  previewable = VALUES(previewable),
  last_access_at = VALUES(last_access_at),
  updated_at = NOW();

INSERT INTO document_asset_event
  (event_id, asset_id, actor_uid, action, detail, tenant_space_id, created_at, updated_at)
VALUES
  ('EVT-DEMO-BIND-001', 'doc-space-product', 'pm_chen', '绑定群聊', '产品方案讨论群 设为产品部公共空间默认归档空间', @tenant_space_id, '2026-06-17 09:00:00', NOW()),
  ('EVT-DEMO-BIND-002', 'doc-space-delivery', 'delivery_liu', '绑定群聊', '华东项目交付群 设为华东交付空间默认归档空间', @tenant_space_id, '2026-06-17 09:01:00', NOW()),
  ('EVT-DEMO-UPLOAD-001', 'DOC-DEMO-006', 'pm_chen', '上传', '上传到产品部公共空间', @tenant_space_id, '2026-06-17 10:22:00', NOW()),
  ('EVT-DEMO-SEND-001', 'DOC-DEMO-004', 'delivery_liu', '群聊发送', '在华东项目交付群发送文件，进入会话文件', @tenant_space_id, '2026-06-17 10:15:00', NOW()),
  ('EVT-DEMO-ARCHIVE-001', 'DOC-DEMO-002', 'pm_chen', '归档', '从产品方案讨论群归档到产品部公共空间', @tenant_space_id, '2026-06-17 10:02:00', NOW()),
  ('EVT-DEMO-PREVIEW-001', 'DOC-DEMO-002', 'pm_chen', '预览', '在线预览', @tenant_space_id, '2026-06-17 10:05:00', NOW()),
  ('EVT-DEMO-DOWNLOAD-001', 'DOC-DEMO-001', 'delivery_liu', '下载', '下载文件', @tenant_space_id, '2026-06-17 10:08:00', NOW()),
  ('EVT-DEMO-TRASH-001', 'DOC-DEMO-007', 'admin_zhou', '删除', '移动到回收站', @tenant_space_id, '2026-06-17 10:25:00', NOW()),
  ('EVT-DEMO-RESTORE-001', 'DOC-DEMO-003', 'admin_zhou', '恢复', '从回收站恢复', @tenant_space_id, '2026-06-17 10:30:00', NOW())
ON DUPLICATE KEY UPDATE
  actor_uid = VALUES(actor_uid),
  action = VALUES(action),
  detail = VALUES(detail),
  tenant_space_id = VALUES(tenant_space_id),
  updated_at = NOW();

SELECT
  'document demo seed ready' AS result,
  @tenant_space_id AS tenant_space_id,
  (SELECT COUNT(*) FROM document_space WHERE tenant_space_id = @tenant_space_id) AS document_spaces,
  (SELECT COUNT(*) FROM document_asset WHERE tenant_space_id = @tenant_space_id) AS document_assets,
  (SELECT COUNT(*) FROM document_asset_event WHERE tenant_space_id = @tenant_space_id) AS document_events,
  (SELECT COUNT(*) FROM group_setting WHERE uid = 'pm_chen' AND group_no IN (@product_group, @delivery_group, @policy_group) AND category_id = @pm_default_category) AS followed_groups;
