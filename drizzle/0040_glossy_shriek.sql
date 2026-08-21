ALTER TABLE `organization_invitations` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `organization_invitations` ADD `phone` varchar(32) DEFAULT '' NOT NULL;