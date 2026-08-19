ALTER TABLE `volunteer_training_materials` ADD `dueAt` timestamp;--> statement-breakpoint
ALTER TABLE `volunteers` ADD `coordinatorMemberId` int;--> statement-breakpoint
ALTER TABLE `volunteers` ADD CONSTRAINT `vol_coordinator_fk` FOREIGN KEY (`coordinatorMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `volunteer_campaign_coordinator_idx` ON `volunteers` (`campaignId`,`coordinatorMemberId`);
