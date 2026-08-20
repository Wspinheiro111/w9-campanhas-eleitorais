CREATE TABLE `field_playbook_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`playbookId` int NOT NULL,
	`playbookVersion` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(1000) NOT NULL,
	`url` varchar(1200) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `field_playbook_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `field_playbook_materials` ADD CONSTRAINT `fpm_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_playbook_materials` ADD CONSTRAINT `fpm_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_playbook_materials` ADD CONSTRAINT `fpm_playbook_fk` FOREIGN KEY (`playbookId`) REFERENCES `field_playbooks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_playbook_materials` ADD CONSTRAINT `fpm_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `playbook_material_playbook_idx` ON `field_playbook_materials` (`playbookId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `playbook_material_campaign_idx` ON `field_playbook_materials` (`campaignId`);--> statement-breakpoint
CREATE INDEX `playbook_material_organization_idx` ON `field_playbook_materials` (`organizationId`);
