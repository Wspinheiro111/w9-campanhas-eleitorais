CREATE TABLE `volunteer_training_certificate_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`volunteerId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`certificateCode` varchar(50) NOT NULL,
	`completedMaterials` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `volunteer_training_certificate_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `volunteer_training_certificate_versions_certificateCode_unique` UNIQUE(`certificateCode`),
	CONSTRAINT `training_certificate_version_idx` UNIQUE(`volunteerId`,`campaignId`,`versionNumber`)
);
--> statement-breakpoint
ALTER TABLE `volunteer_training_certificate_versions` ADD CONSTRAINT `vtcv_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_certificate_versions` ADD CONSTRAINT `vtcv_camp_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `volunteer_training_certificate_versions` ADD CONSTRAINT `vtcv_volunteer_fk` FOREIGN KEY (`volunteerId`) REFERENCES `volunteers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `training_certificate_version_volunteer_idx` ON `volunteer_training_certificate_versions` (`volunteerId`,`issuedAt`);--> statement-breakpoint
CREATE INDEX `training_certificate_version_campaign_idx` ON `volunteer_training_certificate_versions` (`campaignId`);
