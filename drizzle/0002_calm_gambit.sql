CREATE TABLE `audio_crm_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`memberId` int,
	`audioUrl` text NOT NULL,
	`transcription` text,
	`extractedData` json,
	`voterId` int,
	`processed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audio_crm_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audio_crm_logs` ADD CONSTRAINT `audio_crm_logs_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audio_crm_logs` ADD CONSTRAINT `audio_crm_logs_memberId_campaign_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audio_crm_logs` ADD CONSTRAINT `audio_crm_logs_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audio_campaign_idx` ON `audio_crm_logs` (`campaignId`);--> statement-breakpoint
CREATE INDEX `audio_member_idx` ON `audio_crm_logs` (`memberId`);