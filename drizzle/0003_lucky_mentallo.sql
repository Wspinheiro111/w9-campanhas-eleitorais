CREATE TABLE `campaign_contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`content_channel` enum('social','whatsapp','print','speech','video','other') NOT NULL DEFAULT 'social',
	`content_status` enum('draft','review','approved','archived') NOT NULL DEFAULT 'draft',
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `voters` ADD `pipeline_stage` enum('identified','approached','engaged','mobilized') DEFAULT 'identified' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD CONSTRAINT `campaign_contents_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD CONSTRAINT `campaign_contents_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `content_campaign_status_idx` ON `campaign_contents` (`campaignId`,`content_status`);--> statement-breakpoint
CREATE INDEX `voter_pipeline_idx` ON `voters` (`campaignId`,`pipeline_stage`);