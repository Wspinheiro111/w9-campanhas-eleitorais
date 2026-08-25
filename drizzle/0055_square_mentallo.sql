ALTER TABLE `campaign_team_shifts` ADD `conflictOverrideReason` text;--> statement-breakpoint
ALTER TABLE `campaign_team_shifts` ADD `conflictOverriddenByUserId` int;--> statement-breakpoint
ALTER TABLE `campaign_team_shifts` ADD `conflictOverriddenAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_team_shifts` ADD CONSTRAINT `campaign_team_shifts_conflictOverriddenByUserId_users_id_fk` FOREIGN KEY (`conflictOverriddenByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;