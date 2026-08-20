CREATE TABLE `campaign_communication_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int NOT NULL,
	`templateId` int,
	`communication_channel` enum('email','whatsapp','phone') NOT NULL,
	`action` varchar(40) NOT NULL DEFAULT 'manual_contact_logged',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_communication_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_communication_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`communication_channel` enum('email','whatsapp','phone') NOT NULL,
	`subject` varchar(220),
	`body` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_communication_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voter_communication_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int NOT NULL,
	`emailAllowed` boolean NOT NULL DEFAULT false,
	`whatsappAllowed` boolean NOT NULL DEFAULT false,
	`phoneAllowed` boolean NOT NULL DEFAULT false,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voter_communication_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `voter_comm_pref_voter_idx` UNIQUE(`voterId`)
);
--> statement-breakpoint
ALTER TABLE `campaign_communication_logs` ADD CONSTRAINT `ccl_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_communication_logs` ADD CONSTRAINT `ccl_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_communication_logs` ADD CONSTRAINT `ccl_voter_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_communication_logs` ADD CONSTRAINT `ccl_template_fk` FOREIGN KEY (`templateId`) REFERENCES `campaign_communication_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_communication_logs` ADD CONSTRAINT `ccl_actor_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_communication_templates` ADD CONSTRAINT `cct_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_communication_templates` ADD CONSTRAINT `cct_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_communication_templates` ADD CONSTRAINT `cct_actor_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_communication_preferences` ADD CONSTRAINT `vcp_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_communication_preferences` ADD CONSTRAINT `vcp_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_communication_preferences` ADD CONSTRAINT `vcp_voter_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_communication_preferences` ADD CONSTRAINT `vcp_actor_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `communication_log_campaign_idx` ON `campaign_communication_logs` (`campaignId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `communication_log_voter_idx` ON `campaign_communication_logs` (`voterId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `communication_log_organization_idx` ON `campaign_communication_logs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `communication_template_campaign_idx` ON `campaign_communication_templates` (`campaignId`,`communication_channel`,`active`);--> statement-breakpoint
CREATE INDEX `communication_template_organization_idx` ON `campaign_communication_templates` (`organizationId`);--> statement-breakpoint
CREATE INDEX `voter_comm_pref_campaign_idx` ON `voter_communication_preferences` (`campaignId`);--> statement-breakpoint
CREATE INDEX `voter_comm_pref_organization_idx` ON `voter_communication_preferences` (`organizationId`);
