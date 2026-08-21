CREATE TABLE `campaign_compliance_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`blockBusinessDonation` boolean NOT NULL DEFAULT false,
	`requireExpenseDocument` boolean NOT NULL DEFAULT false,
	`reviewDeadlineHours` int NOT NULL DEFAULT 72,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_compliance_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `compliance_rule_campaign_unique` UNIQUE(`campaignId`)
);
--> statement-breakpoint
CREATE TABLE `campaign_legal_processes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`documentId` int,
	`ownerUserId` int,
	`title` varchar(255) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'open',
	`deadlineAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_legal_processes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD CONSTRAINT `ccr_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD CONSTRAINT `ccr_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_processes` ADD CONSTRAINT `clp_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_processes` ADD CONSTRAINT `clp_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_processes` ADD CONSTRAINT `clp_document_fk` FOREIGN KEY (`documentId`) REFERENCES `campaign_legal_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_processes` ADD CONSTRAINT `clp_owner_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `legal_process_campaign_status_idx` ON `campaign_legal_processes` (`campaignId`,`status`);
