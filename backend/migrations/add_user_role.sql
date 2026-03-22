-- 添加用户角色列，支持 RBAC 权限控制
-- 执行方式：mysql -u root -p booksocial < backend/migrations/add_user_role.sql

USE booksocial;

ALTER TABLE `users`
  ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '角色：user-普通用户，admin-管理员'
  AFTER `status`;

SELECT 'users.role column added' AS status;
