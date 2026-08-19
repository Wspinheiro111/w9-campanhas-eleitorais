CREATE TABLE `volunteer_training_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`volunteerId` int NOT NULL,
	`certificateCode` varchar(50) NOT NULL,
	`completedMaterials` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `volunteer_training_certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `volunteer_training_certificates_certificateCode_unique` UNIQUE(`certificateCode`),
	CONSTRAINT `training_certificate_volunteer_campaign_idx` UNIQUE(`volunteerId`,`campaignId`)
);
--> statement-breakpoint
ALTER TABLE `volunteer_training_certificates` ADD CONSTRAINT `vtcert_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_certificates` ADD CONSTRAINT `vtcert_camp_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_certificates` ADD CONSTRAINT `vtcert_volunteer_fk` FOREIGN KEY (`volunteerId`) REFERENCES `volunteers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `training_certificate_campaign_idx` ON `volunteer_training_certificates` (`campaignId`);--> statement-breakpoint
CREATE INDEX `training_certificate_organization_idx` ON `volunteer_training_certificates` (`organizationId`);
