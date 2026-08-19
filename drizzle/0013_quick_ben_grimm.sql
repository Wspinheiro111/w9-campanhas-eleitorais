ALTER TABLE `campaign_contents` ADD `objective` varchar(220);--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `scheduledAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `ownerMemberId` int;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD CONSTRAINT `campaign_contents_ownerMemberId_campaign_members_id_fk` FOREIGN KEY (`ownerMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `content_calendar_idx` ON `campaign_contents` (`campaignId`,`scheduledAt`);