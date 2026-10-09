CREATE TABLE `campaign_command_idempotency` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`operation` varchar(80) NOT NULL,
	`commandKey` varchar(128) NOT NULL,
	`result` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_command_idempotency_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaign_command_idempotency_unique` UNIQUE(`campaignId`,`operation`,`commandKey`)
);
--> statement-breakpoint
ALTER TABLE `storage_objects` MODIFY COLUMN `storageKey` varchar(700) NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_command_idempotency` ADD CONSTRAINT `campaign_command_idempotency_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_command_idempotency` ADD CONSTRAINT `campaign_command_idempotency_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `campaign_command_idempotency_org_idx` ON `campaign_command_idempotency` (`organizationId`,`createdAt`);