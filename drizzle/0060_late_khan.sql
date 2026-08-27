CREATE TABLE `campaign_material_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`materialId` int NOT NULL,
	`material_movement_type` enum('stock_in','distribution','return','adjustment_in','adjustment_out') NOT NULL,
	`quantity` int NOT NULL,
	`eventId` int,
	`streetActionId` int,
	`recipientMemberId` int,
	`territory` varchar(180),
	`notes` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_material_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` varchar(100) NOT NULL,
	`unit` varchar(40) NOT NULL DEFAULT 'unidade',
	`stockQuantity` int NOT NULL DEFAULT 0,
	`minimumQuantity` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_demand_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`demandId` int NOT NULL,
	`authorMemberId` int,
	`kind` varchar(40) NOT NULL DEFAULT 'update',
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_demand_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_demands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`sourceVoterId` int,
	`protocol` varchar(40) NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(120) NOT NULL,
	`neighborhood` varchar(120),
	`region` varchar(120),
	`community_demand_status` enum('received','triaged','in_progress','waiting_response','returned','closed') NOT NULL DEFAULT 'received',
	`assignedToMemberId` int,
	`dueAt` timestamp,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_demands_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_demands_protocol_unique` UNIQUE(`protocol`)
);
--> statement-breakpoint
CREATE TABLE `street_action_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`streetActionId` int NOT NULL,
	`memberId` int NOT NULL,
	`street_attendance_status` enum('present','absent') NOT NULL DEFAULT 'present',
	`checkedInAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `street_action_checkins_id` PRIMARY KEY(`id`),
	CONSTRAINT `street_action_checkin_member_unique` UNIQUE(`streetActionId`,`memberId`)
);
--> statement-breakpoint
CREATE TABLE `street_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`eventId` int,
	`title` varchar(220) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`territory` varchar(180),
	`neighborhood` varchar(120),
	`region` varchar(120),
	`responsibleMemberId` int,
	`street_action_status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `street_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_material_movements` ADD CONSTRAINT `cmm_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_material_movements` ADD CONSTRAINT `cmm_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_material_movements` ADD CONSTRAINT `cmm_material_fk` FOREIGN KEY (`materialId`) REFERENCES `campaign_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_material_movements` ADD CONSTRAINT `cmm_event_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_material_movements` ADD CONSTRAINT `cmm_street_action_fk` FOREIGN KEY (`streetActionId`) REFERENCES `street_actions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_material_movements` ADD CONSTRAINT `cmm_recipient_member_fk` FOREIGN KEY (`recipientMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_material_movements` ADD CONSTRAINT `cmm_creator_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_materials` ADD CONSTRAINT `cm_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_materials` ADD CONSTRAINT `cm_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_materials` ADD CONSTRAINT `cm_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demand_updates` ADD CONSTRAINT `cdu_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demand_updates` ADD CONSTRAINT `cdu_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demand_updates` ADD CONSTRAINT `cdu_demand_fk` FOREIGN KEY (`demandId`) REFERENCES `community_demands`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demand_updates` ADD CONSTRAINT `cdu_author_member_fk` FOREIGN KEY (`authorMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demands` ADD CONSTRAINT `cd_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demands` ADD CONSTRAINT `cd_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demands` ADD CONSTRAINT `cd_voter_fk` FOREIGN KEY (`sourceVoterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demands` ADD CONSTRAINT `cd_assignee_member_fk` FOREIGN KEY (`assignedToMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_demands` ADD CONSTRAINT `cd_creator_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_action_checkins` ADD CONSTRAINT `sac_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_action_checkins` ADD CONSTRAINT `sac_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_action_checkins` ADD CONSTRAINT `sac_action_fk` FOREIGN KEY (`streetActionId`) REFERENCES `street_actions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_action_checkins` ADD CONSTRAINT `sac_member_fk` FOREIGN KEY (`memberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_actions` ADD CONSTRAINT `sa_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_actions` ADD CONSTRAINT `sa_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_actions` ADD CONSTRAINT `sa_event_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_actions` ADD CONSTRAINT `sa_responsible_member_fk` FOREIGN KEY (`responsibleMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `street_actions` ADD CONSTRAINT `sa_creator_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `material_movement_campaign_occurred_idx` ON `campaign_material_movements` (`campaignId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `material_movement_material_idx` ON `campaign_material_movements` (`materialId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `material_movement_organization_idx` ON `campaign_material_movements` (`organizationId`);--> statement-breakpoint
CREATE INDEX `campaign_material_campaign_active_idx` ON `campaign_materials` (`campaignId`,`active`);--> statement-breakpoint
CREATE INDEX `campaign_material_organization_idx` ON `campaign_materials` (`organizationId`);--> statement-breakpoint
CREATE INDEX `community_demand_update_demand_idx` ON `community_demand_updates` (`demandId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_demand_update_campaign_idx` ON `community_demand_updates` (`campaignId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_demand_update_organization_idx` ON `community_demand_updates` (`organizationId`);--> statement-breakpoint
CREATE INDEX `community_demand_campaign_status_idx` ON `community_demands` (`campaignId`,`community_demand_status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `community_demand_assignee_idx` ON `community_demands` (`assignedToMemberId`);--> statement-breakpoint
CREATE INDEX `community_demand_organization_idx` ON `community_demands` (`organizationId`);--> statement-breakpoint
CREATE INDEX `street_action_checkin_campaign_idx` ON `street_action_checkins` (`campaignId`,`checkedInAt`);--> statement-breakpoint
CREATE INDEX `street_action_checkin_organization_idx` ON `street_action_checkins` (`organizationId`);--> statement-breakpoint
CREATE INDEX `street_action_campaign_start_idx` ON `street_actions` (`campaignId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `street_action_event_idx` ON `street_actions` (`eventId`);--> statement-breakpoint
CREATE INDEX `street_action_organization_idx` ON `street_actions` (`organizationId`);
