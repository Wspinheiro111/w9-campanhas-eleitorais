CREATE TABLE `field_playbooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`objective` varchar(400),
	`territory` varchar(160),
	`version` int NOT NULL DEFAULT 1,
	`openingScript` text,
	`talkingPoints` json NOT NULL,
	`checklist` json NOT NULL,
	`field_playbook_status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_playbooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `field_visits` ADD `playbookId` int;--> statement-breakpoint
ALTER TABLE `field_visits` ADD `playbookVersion` int;--> statement-breakpoint
ALTER TABLE `field_playbooks` ADD CONSTRAINT `fp_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_playbooks` ADD CONSTRAINT `fp_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_playbooks` ADD CONSTRAINT `fp_actor_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `field_playbook_campaign_idx` ON `field_playbooks` (`campaignId`,`field_playbook_status`);--> statement-breakpoint
CREATE INDEX `field_playbook_organization_idx` ON `field_playbooks` (`organizationId`);--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `fv_playbook_fk` FOREIGN KEY (`playbookId`) REFERENCES `field_playbooks`(`id`) ON DELETE no action ON UPDATE no action;
