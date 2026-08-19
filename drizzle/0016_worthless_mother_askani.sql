CREATE TABLE `volunteer_training_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`materialId` int NOT NULL,
	`volunteerId` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `volunteer_training_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `training_completion_material_volunteer_idx` UNIQUE(`materialId`,`volunteerId`)
);
--> statement-breakpoint
CREATE TABLE `volunteer_training_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`materialType` enum('guide','video','checklist','link') NOT NULL DEFAULT 'guide',
	`resourceUrl` varchar(2000),
	`content` text,
	`durationMinutes` int NOT NULL DEFAULT 10,
	`position` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `volunteer_training_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `volunteer_training_completions` ADD CONSTRAINT `vtc_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_completions` ADD CONSTRAINT `vtc_camp_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_completions` ADD CONSTRAINT `vtc_material_fk` FOREIGN KEY (`materialId`) REFERENCES `volunteer_training_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_completions` ADD CONSTRAINT `vtc_volunteer_fk` FOREIGN KEY (`volunteerId`) REFERENCES `volunteers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_materials` ADD CONSTRAINT `vtm_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_materials` ADD CONSTRAINT `vtm_camp_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_materials` ADD CONSTRAINT `vtm_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `training_completion_volunteer_idx` ON `volunteer_training_completions` (`volunteerId`);--> statement-breakpoint
CREATE INDEX `training_completion_campaign_idx` ON `volunteer_training_completions` (`campaignId`);--> statement-breakpoint
CREATE INDEX `training_material_campaign_idx` ON `volunteer_training_materials` (`campaignId`,`active`,`position`);--> statement-breakpoint
CREATE INDEX `training_material_organization_idx` ON `volunteer_training_materials` (`organizationId`);
