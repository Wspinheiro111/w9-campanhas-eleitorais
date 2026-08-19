CREATE TABLE `campaign_certificate_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`primaryColor` varchar(7) NOT NULL DEFAULT '#103527',
	`accentColor` varchar(7) NOT NULL DEFAULT '#c9a85b',
	`logoUrl` varchar(2000),
	`signatureName` varchar(180),
	`signatureRole` varchar(180),
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_certificate_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_settings_campaign_idx` UNIQUE(`campaignId`)
);
--> statement-breakpoint
ALTER TABLE `campaign_certificate_settings` ADD CONSTRAINT `ccs_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_certificate_settings` ADD CONSTRAINT `ccs_camp_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_certificate_settings` ADD CONSTRAINT `ccs_user_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `certificate_settings_organization_idx` ON `campaign_certificate_settings` (`organizationId`);
