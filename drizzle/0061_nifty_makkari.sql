CREATE TABLE `campaign_compliance_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`compliance_decision_status` enum('approved','blocked','needs_human_review','not_applicable') NOT NULL,
	`compliance_review_status` enum('not_required','pending','approved','blocked','cancelled') NOT NULL DEFAULT 'not_required',
	`reasons` json NOT NULL,
	`ruleVersion` varchar(32) NOT NULL,
	`requestedByUserId` int,
	`reviewedByUserId` int,
	`reviewNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_compliance_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_compliance_rule_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`code` varchar(80) NOT NULL,
	`title` varchar(220) NOT NULL,
	`category` varchar(80) NOT NULL,
	`sourceUrl` varchar(1200) NOT NULL,
	`sourceReference` varchar(255),
	`summary` text,
	`version` varchar(32) NOT NULL DEFAULT '2026.1',
	`effectiveFrom` timestamp,
	`effectiveTo` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_compliance_rule_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `compliance_source_campaign_code_version_idx` UNIQUE(`campaignId`,`code`,`version`)
);
--> statement-breakpoint
CREATE TABLE `campaign_consent_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int NOT NULL,
	`channel` varchar(40) NOT NULL DEFAULT 'none',
	`purpose` varchar(240) NOT NULL,
	`legalBasis` varchar(80) NOT NULL DEFAULT 'consent',
	`source` varchar(120) NOT NULL,
	`evidence` text,
	`noticeVersion` varchar(80),
	`consent_ledger_status` enum('granted','revoked','expired','imported_without_authorization') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`expiresAt` timestamp,
	`previousRecordHash` varchar(128),
	`recordHash` varchar(128) NOT NULL,
	`recordedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_consent_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `consent_ledger_record_hash_unique` UNIQUE(`recordHash`)
);
--> statement-breakpoint
CREATE TABLE `campaign_contact_suppressions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int NOT NULL,
	`channel` varchar(40) NOT NULL DEFAULT 'all',
	`reason` varchar(240) NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`active` boolean NOT NULL DEFAULT true,
	`resolvedAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_contact_suppressions_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_suppression_voter_channel_idx` UNIQUE(`voterId`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `campaign_data_subject_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`voterId` int,
	`requestType` varchar(60) NOT NULL,
	`requesterReferenceHash` varchar(128) NOT NULL,
	`data_subject_request_status` enum('received','identity_pending','in_progress','completed','rejected','cancelled') NOT NULL DEFAULT 'received',
	`identityVerifiedAt` timestamp,
	`dueAt` timestamp,
	`outcomeNote` text,
	`assignedToUserId` int,
	`createdByUserId` int,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_data_subject_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `ruleVersion` varchar(32) DEFAULT '2026.1' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `blockElectoralPhoneContact` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `requireConsentEvidence` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `requireHumanReviewForSyntheticContent` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `blockSyntheticPublicationWindow` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `requireResearchRegistrationForPublication` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `requireFinancialEvidence` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD `updatedByUserId` int;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `isSynthetic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `syntheticDisclosure` text;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `compliance_review_status` enum('not_required','pending','approved','blocked','cancelled') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `complianceReviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `complianceReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `complianceReviewNote` text;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `sourceType` varchar(80);--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `evidence_status` enum('not_required','pending','attached','reviewed','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `compliance_review_status` enum('not_required','pending','approved','blocked','cancelled') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `complianceReviewNote` text;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `complianceReviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `complianceReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `survey_classification` enum('internal','public_disclosure') DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `registrationCode` varchar(160);--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `methodologySummary` text;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `fieldStartAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `fieldEndAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `disclosureText` text;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `compliance_review_status` enum('not_required','pending','approved','blocked','cancelled') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `complianceReviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `complianceReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD `complianceReviewNote` text;--> statement-breakpoint
ALTER TABLE `voters` ADD `sensitiveDataFlag` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `voters` ADD `retentionReviewAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaign_compliance_decisions` ADD CONSTRAINT `campaign_compliance_decisions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_compliance_decisions` ADD CONSTRAINT `campaign_compliance_decisions_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_compliance_decisions` ADD CONSTRAINT `campaign_compliance_decisions_requestedByUserId_users_id_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_compliance_decisions` ADD CONSTRAINT `campaign_compliance_decisions_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rule_sources` ADD CONSTRAINT `campaign_compliance_rule_sources_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rule_sources` ADD CONSTRAINT `campaign_compliance_rule_sources_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_compliance_rule_sources` ADD CONSTRAINT `campaign_compliance_rule_sources_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_consent_ledger` ADD CONSTRAINT `campaign_consent_ledger_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_consent_ledger` ADD CONSTRAINT `campaign_consent_ledger_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_consent_ledger` ADD CONSTRAINT `campaign_consent_ledger_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_consent_ledger` ADD CONSTRAINT `campaign_consent_ledger_recordedByUserId_users_id_fk` FOREIGN KEY (`recordedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_contact_suppressions` ADD CONSTRAINT `campaign_contact_suppressions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_contact_suppressions` ADD CONSTRAINT `campaign_contact_suppressions_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_contact_suppressions` ADD CONSTRAINT `campaign_contact_suppressions_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_contact_suppressions` ADD CONSTRAINT `campaign_contact_suppressions_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_data_subject_requests` ADD CONSTRAINT `campaign_data_subject_requests_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_data_subject_requests` ADD CONSTRAINT `campaign_data_subject_requests_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_data_subject_requests` ADD CONSTRAINT `campaign_data_subject_requests_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_data_subject_requests` ADD CONSTRAINT `campaign_data_subject_requests_assignedToUserId_users_id_fk` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_data_subject_requests` ADD CONSTRAINT `campaign_data_subject_requests_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `compliance_decision_campaign_created_idx` ON `campaign_compliance_decisions` (`campaignId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `compliance_decision_campaign_review_idx` ON `campaign_compliance_decisions` (`campaignId`,`compliance_review_status`);--> statement-breakpoint
CREATE INDEX `compliance_decision_entity_idx` ON `campaign_compliance_decisions` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `compliance_decision_organization_idx` ON `campaign_compliance_decisions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `compliance_source_campaign_active_idx` ON `campaign_compliance_rule_sources` (`campaignId`,`active`);--> statement-breakpoint
CREATE INDEX `compliance_source_organization_idx` ON `campaign_compliance_rule_sources` (`organizationId`);--> statement-breakpoint
CREATE INDEX `consent_ledger_voter_channel_idx` ON `campaign_consent_ledger` (`voterId`,`channel`,`createdAt`);--> statement-breakpoint
CREATE INDEX `consent_ledger_campaign_status_idx` ON `campaign_consent_ledger` (`campaignId`,`consent_ledger_status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `consent_ledger_organization_idx` ON `campaign_consent_ledger` (`organizationId`);--> statement-breakpoint
CREATE INDEX `contact_suppression_campaign_active_idx` ON `campaign_contact_suppressions` (`campaignId`,`active`);--> statement-breakpoint
CREATE INDEX `contact_suppression_organization_idx` ON `campaign_contact_suppressions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `data_subject_request_campaign_status_idx` ON `campaign_data_subject_requests` (`campaignId`,`data_subject_request_status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `data_subject_request_voter_idx` ON `campaign_data_subject_requests` (`voterId`);--> statement-breakpoint
CREATE INDEX `data_subject_request_organization_idx` ON `campaign_data_subject_requests` (`organizationId`);--> statement-breakpoint
ALTER TABLE `campaign_compliance_rules` ADD CONSTRAINT `campaign_compliance_rules_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD CONSTRAINT `campaign_contents_complianceReviewedByUserId_users_id_fk` FOREIGN KEY (`complianceReviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD CONSTRAINT `campaign_financial_entries_complianceReviewedByUserId_users_id_fk` FOREIGN KEY (`complianceReviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_surveys` ADD CONSTRAINT `campaign_surveys_complianceReviewedByUserId_users_id_fk` FOREIGN KEY (`complianceReviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;