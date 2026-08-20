CREATE TABLE `volunteer_training_team_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`coordinatorMemberId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`targetCompletions` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `volunteer_training_team_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `training_team_goal_month_idx` UNIQUE(`campaignId`,`coordinatorMemberId`,`month`)
);
--> statement-breakpoint
ALTER TABLE `volunteer_training_team_goals` ADD CONSTRAINT `vtg_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_team_goals` ADD CONSTRAINT `vtg_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_team_goals` ADD CONSTRAINT `vtg_member_fk` FOREIGN KEY (`coordinatorMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `training_team_goal_organization_idx` ON `volunteer_training_team_goals` (`organizationId`);--> statement-breakpoint
CREATE INDEX `training_team_goal_campaign_month_idx` ON `volunteer_training_team_goals` (`campaignId`,`month`);
