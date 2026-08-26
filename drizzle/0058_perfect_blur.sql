DROP INDEX `organization_fiscal_idx` ON `organizations`;--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organization_fiscal_unique_idx` UNIQUE(`fiscalId`);