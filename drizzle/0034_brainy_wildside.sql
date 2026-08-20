CREATE TABLE `campaign_export_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`createdByUserId` int,
	`exportType` varchar(48) NOT NULL,
	`title` varchar(255) NOT NULL,
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`sections` json NOT NULL,
	`strategicNotes` text,
	`snapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_export_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_export_versions` ADD CONSTRAINT `cev_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_export_versions` ADD CONSTRAINT `cev_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_export_versions` ADD CONSTRAINT `cev_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `export_version_campaign_created_idx` ON `campaign_export_versions` (`campaignId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `export_version_organization_idx` ON `campaign_export_versions` (`organizationId`);
