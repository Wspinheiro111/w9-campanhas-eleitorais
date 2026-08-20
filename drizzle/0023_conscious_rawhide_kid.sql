CREATE TABLE `campaign_training_recognition_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`achievedThreshold` int NOT NULL DEFAULT 100,
	`standoutThreshold` int NOT NULL DEFAULT 125,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_training_recognition_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `training_recognition_rules_campaign_idx` UNIQUE(`campaignId`)
);
--> statement-breakpoint
CREATE TABLE `volunteer_training_team_recognition_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`coordinatorMemberId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`rankPosition` int NOT NULL,
	`completedTrainings` int NOT NULL,
	`targetCompletions` int NOT NULL,
	`goalProgress` int NOT NULL,
	`medal` varchar(32) NOT NULL DEFAULT 'none',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `volunteer_training_team_recognition_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `training_recognition_history_month_idx` UNIQUE(`campaignId`,`coordinatorMemberId`,`month`)
);
--> statement-breakpoint
ALTER TABLE `campaign_training_recognition_rules` ADD CONSTRAINT `ctrr_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_training_recognition_rules` ADD CONSTRAINT `ctrr_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_training_recognition_rules` ADD CONSTRAINT `ctrr_user_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_team_recognition_history` ADD CONSTRAINT `vttrh_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_team_recognition_history` ADD CONSTRAINT `vttrh_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_team_recognition_history` ADD CONSTRAINT `vttrh_member_fk` FOREIGN KEY (`coordinatorMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `training_recognition_rules_organization_idx` ON `campaign_training_recognition_rules` (`organizationId`);--> statement-breakpoint
CREATE INDEX `training_recognition_history_campaign_idx` ON `volunteer_training_team_recognition_history` (`campaignId`,`month`);--> statement-breakpoint
CREATE INDEX `training_recognition_history_organization_idx` ON `volunteer_training_team_recognition_history` (`organizationId`);
