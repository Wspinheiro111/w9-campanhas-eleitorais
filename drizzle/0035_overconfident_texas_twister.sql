CREATE TABLE `campaign_financial_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`bankName` varchar(140) NOT NULL,
	`agency` varchar(40),
	`accountNumber` varchar(60) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_financial_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_financial_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`accountId` int,
	`createdByUserId` int,
	`reviewedByUserId` int,
	`financial_entry_type` enum('income','expense') NOT NULL,
	`category` varchar(120) NOT NULL,
	`counterpartyName` varchar(220) NOT NULL,
	`counterpartyDocument` varchar(24),
	`amountCents` int NOT NULL,
	`paymentMethod` varchar(80),
	`receiptNumber` varchar(100),
	`documentNumber` varchar(100),
	`dueDate` timestamp,
	`paidAt` timestamp,
	`financial_entry_status` enum('draft','pending','under_review','approved','rejected','paid','cancelled') NOT NULL DEFAULT 'draft',
	`notes` text,
	`reviewNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_financial_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_legal_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`financialEntryId` int,
	`createdByUserId` int,
	`reviewedByUserId` int,
	`documentType` varchar(80) NOT NULL,
	`title` varchar(255) NOT NULL,
	`counterpartyName` varchar(220),
	`counterpartyDocument` varchar(24),
	`fileName` varchar(255),
	`storageKey` varchar(1000),
	`url` varchar(1200),
	`legal_document_status` enum('pending','under_review','approved','rejected','archived') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp,
	`reviewNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_legal_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaign_financial_accounts` ADD CONSTRAINT `cfa_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_financial_accounts` ADD CONSTRAINT `cfa_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD CONSTRAINT `cfe_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD CONSTRAINT `cfe_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD CONSTRAINT `cfe_account_fk` FOREIGN KEY (`accountId`) REFERENCES `campaign_financial_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD CONSTRAINT `cfe_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD CONSTRAINT `cfe_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_documents` ADD CONSTRAINT `cld_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_documents` ADD CONSTRAINT `cld_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_documents` ADD CONSTRAINT `cld_entry_fk` FOREIGN KEY (`financialEntryId`) REFERENCES `campaign_financial_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_documents` ADD CONSTRAINT `cld_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_legal_documents` ADD CONSTRAINT `cld_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `financial_account_campaign_idx` ON `campaign_financial_accounts` (`campaignId`);--> statement-breakpoint
CREATE INDEX `financial_account_org_idx` ON `campaign_financial_accounts` (`organizationId`);--> statement-breakpoint
CREATE INDEX `financial_entry_campaign_status_idx` ON `campaign_financial_entries` (`campaignId`,`financial_entry_status`);--> statement-breakpoint
CREATE INDEX `financial_entry_campaign_type_idx` ON `campaign_financial_entries` (`campaignId`,`financial_entry_type`);--> statement-breakpoint
CREATE INDEX `financial_entry_org_idx` ON `campaign_financial_entries` (`organizationId`);--> statement-breakpoint
CREATE INDEX `legal_document_campaign_status_idx` ON `campaign_legal_documents` (`campaignId`,`legal_document_status`);--> statement-breakpoint
CREATE INDEX `legal_document_entry_idx` ON `campaign_legal_documents` (`financialEntryId`);--> statement-breakpoint
CREATE INDEX `legal_document_org_idx` ON `campaign_legal_documents` (`organizationId`);
