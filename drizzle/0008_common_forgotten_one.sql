DROP INDEX `org_member_unique_idx` ON `organization_members`;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `org_member_unique_idx` UNIQUE(`organizationId`,`userId`);