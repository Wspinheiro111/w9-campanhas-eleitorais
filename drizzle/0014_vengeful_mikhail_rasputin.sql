CREATE TABLE `volunteer_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`volunteerId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`territory` varchar(180),
	`scheduledAt` timestamp,
	`volunteer_assignment_status` enum('assigned','accepted','completed','cancelled') NOT NULL DEFAULT 'assigned',
	`completedAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `volunteer_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `volunteers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`neighborhood` varchar(120),
	`region` varchar(120),
	`availability` text,
	`skills` text,
	`volunteer_training_status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`volunteer_status` enum('pending','active','inactive') NOT NULL DEFAULT 'pending',
	`consent` boolean NOT NULL,
	`consentedAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `volunteers_id` PRIMARY KEY(`id`),
	CONSTRAINT `volunteer_campaign_email_idx` UNIQUE(`campaignId`,`email`)
);
--> statement-breakpoint
ALTER TABLE `volunteer_assignments` ADD CONSTRAINT `volunteer_assignments_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_assignments` ADD CONSTRAINT `volunteer_assignments_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_assignments` ADD CONSTRAINT `volunteer_assignments_volunteerId_volunteers_id_fk` FOREIGN KEY (`volunteerId`) REFERENCES `volunteers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_assignments` ADD CONSTRAINT `volunteer_assignments_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteers` ADD CONSTRAINT `volunteers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteers` ADD CONSTRAINT `volunteers_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `volunteer_assignment_campaign_status_idx` ON `volunteer_assignments` (`campaignId`,`volunteer_assignment_status`);--> statement-breakpoint
CREATE INDEX `volunteer_assignment_volunteer_idx` ON `volunteer_assignments` (`volunteerId`);--> statement-breakpoint
CREATE INDEX `volunteer_assignment_organization_idx` ON `volunteer_assignments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `volunteer_campaign_status_idx` ON `volunteers` (`campaignId`,`volunteer_status`);--> statement-breakpoint
CREATE INDEX `volunteer_organization_idx` ON `volunteers` (`organizationId`);