CREATE TABLE `consent_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int NOT NULL,
	`consent_status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`purpose` varchar(240) NOT NULL,
	`source` varchar(120) NOT NULL,
	`evidence` text,
	`consentedAt` timestamp NOT NULL,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consent_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crisis_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`crisis_severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`crisis_status` enum('open','assessing','responding','resolved','closed') NOT NULL DEFAULT 'open',
	`assignedToId` int,
	`dueAt` timestamp,
	`createdByUserId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crisis_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crisis_decision_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`crisisCaseId` int NOT NULL,
	`decision` text NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crisis_decision_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int,
	`memberId` int,
	`clientReference` varchar(96) NOT NULL,
	`field_visit_outcome` enum('contacted','absent','refused','follow_up','other') NOT NULL DEFAULT 'contacted',
	`notes` text,
	`occurredAt` timestamp NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `field_visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `field_visits_clientReference_unique` UNIQUE(`clientReference`)
);
--> statement-breakpoint
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crisis_cases` ADD CONSTRAINT `crisis_cases_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crisis_cases` ADD CONSTRAINT `crisis_cases_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crisis_cases` ADD CONSTRAINT `crisis_cases_assignedToId_campaign_members_id_fk` FOREIGN KEY (`assignedToId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crisis_cases` ADD CONSTRAINT `crisis_cases_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crisis_decision_logs` ADD CONSTRAINT `crisis_decision_logs_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crisis_decision_logs` ADD CONSTRAINT `crisis_decision_logs_crisisCaseId_crisis_cases_id_fk` FOREIGN KEY (`crisisCaseId`) REFERENCES `crisis_cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crisis_decision_logs` ADD CONSTRAINT `crisis_decision_logs_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_memberId_campaign_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `consent_voter_status_idx` ON `consent_records` (`voterId`,`consent_status`);--> statement-breakpoint
CREATE INDEX `consent_campaign_status_idx` ON `consent_records` (`campaignId`,`consent_status`);--> statement-breakpoint
CREATE INDEX `consent_organization_idx` ON `consent_records` (`organizationId`);--> statement-breakpoint
CREATE INDEX `crisis_campaign_status_idx` ON `crisis_cases` (`campaignId`,`crisis_status`);--> statement-breakpoint
CREATE INDEX `crisis_severity_idx` ON `crisis_cases` (`crisis_severity`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `crisis_organization_idx` ON `crisis_cases` (`organizationId`);--> statement-breakpoint
CREATE INDEX `crisis_decision_case_idx` ON `crisis_decision_logs` (`crisisCaseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crisis_decision_organization_idx` ON `crisis_decision_logs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `visit_campaign_occurred_idx` ON `field_visits` (`campaignId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `visit_voter_idx` ON `field_visits` (`voterId`);--> statement-breakpoint
CREATE INDEX `visit_organization_idx` ON `field_visits` (`organizationId`);