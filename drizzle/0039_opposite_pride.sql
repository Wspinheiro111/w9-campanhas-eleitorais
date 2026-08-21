ALTER TABLE `campaign_members` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `campaign_members` ADD `phone` varchar(32) DEFAULT '' NOT NULL;