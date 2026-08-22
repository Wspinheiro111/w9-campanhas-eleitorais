CREATE TABLE `campaign_member_availabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`memberId` int NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`member_availability_status` enum('available','preferred','unavailable') NOT NULL DEFAULT 'available',
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_member_availabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`targetMemberId` int,
	`type` varchar(64) NOT NULL DEFAULT 'operational',
	`campaign_notification_severity` enum('info','attention','urgent') NOT NULL DEFAULT 'info',
	`title` varchar(220) NOT NULL,
	`message` text NOT NULL,
	`actionPath` varchar(320),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_report_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`reportType` varchar(80) NOT NULL DEFAULT 'operational',
	`subtitle` varchar(220),
	`coverNotes` text,
	`sections` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_report_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_team_shift_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`shiftId` int NOT NULL,
	`memberId` int NOT NULL,
	`team_shift_assignment_status` enum('assigned','confirmed','declined') NOT NULL DEFAULT 'assigned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_team_shift_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_shift_member_idx` UNIQUE(`shiftId`,`memberId`)
);
--> statement-breakpoint
CREATE TABLE `campaign_team_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`territory` varchar(180),
	`responsibility` varchar(220),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`team_shift_status` enum('draft','scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_team_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_member_availabilities` ADD CONSTRAINT `cma_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_member_availabilities` ADD CONSTRAINT `cma_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_member_availabilities` ADD CONSTRAINT `cma_member_fk` FOREIGN KEY (`memberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_notifications` ADD CONSTRAINT `cn_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_notifications` ADD CONSTRAINT `cn_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_notifications` ADD CONSTRAINT `cn_member_fk` FOREIGN KEY (`targetMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_report_templates` ADD CONSTRAINT `crt_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_report_templates` ADD CONSTRAINT `crt_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_report_templates` ADD CONSTRAINT `crt_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_team_shift_assignments` ADD CONSTRAINT `ctsa_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_team_shift_assignments` ADD CONSTRAINT `ctsa_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_team_shift_assignments` ADD CONSTRAINT `ctsa_shift_fk` FOREIGN KEY (`shiftId`) REFERENCES `campaign_team_shifts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_team_shift_assignments` ADD CONSTRAINT `ctsa_member_fk` FOREIGN KEY (`memberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_team_shifts` ADD CONSTRAINT `cts_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_team_shifts` ADD CONSTRAINT `cts_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_team_shifts` ADD CONSTRAINT `cts_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `member_availability_campaign_time_idx` ON `campaign_member_availabilities` (`campaignId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `member_availability_member_time_idx` ON `campaign_member_availabilities` (`memberId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `member_availability_organization_idx` ON `campaign_member_availabilities` (`organizationId`);--> statement-breakpoint
CREATE INDEX `campaign_notification_campaign_read_idx` ON `campaign_notifications` (`campaignId`,`readAt`);--> statement-breakpoint
CREATE INDEX `campaign_notification_member_read_idx` ON `campaign_notifications` (`targetMemberId`,`readAt`);--> statement-breakpoint
CREATE INDEX `campaign_notification_organization_idx` ON `campaign_notifications` (`organizationId`);--> statement-breakpoint
CREATE INDEX `report_template_campaign_idx` ON `campaign_report_templates` (`campaignId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `report_template_organization_idx` ON `campaign_report_templates` (`organizationId`);--> statement-breakpoint
CREATE INDEX `team_shift_assignment_member_idx` ON `campaign_team_shift_assignments` (`memberId`);--> statement-breakpoint
CREATE INDEX `team_shift_assignment_campaign_idx` ON `campaign_team_shift_assignments` (`campaignId`);--> statement-breakpoint
CREATE INDEX `team_shift_assignment_organization_idx` ON `campaign_team_shift_assignments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `team_shift_campaign_time_idx` ON `campaign_team_shifts` (`campaignId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `team_shift_organization_idx` ON `campaign_team_shifts` (`organizationId`);
