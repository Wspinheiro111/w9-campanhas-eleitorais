CREATE TABLE `pipeline_followups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int NOT NULL,
	`assignedToId` int,
	`pipeline_stage` enum('identified','approached','engaged','mobilized') NOT NULL DEFAULT 'identified',
	`title` varchar(220) NOT NULL,
	`dueAt` timestamp NOT NULL,
	`followup_status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_followups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `assetKey` varchar(500);--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `assetName` varchar(260);--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `assetMime` varchar(120);--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `assetSize` int;--> statement-breakpoint
ALTER TABLE `pipeline_followups` ADD CONSTRAINT `pipeline_followups_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_followups` ADD CONSTRAINT `pipeline_followups_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_followups` ADD CONSTRAINT `pipeline_followups_assignedToId_campaign_members_id_fk` FOREIGN KEY (`assignedToId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `followup_campaign_due_idx` ON `pipeline_followups` (`campaignId`,`followup_status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `followup_voter_idx` ON `pipeline_followups` (`voterId`);--> statement-breakpoint
CREATE INDEX `followup_assignee_idx` ON `pipeline_followups` (`assignedToId`);