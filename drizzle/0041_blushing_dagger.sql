ALTER TABLE `volunteers` DROP INDEX `volunteers_accessTokenHash_unique`;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `volunteers` ADD CONSTRAINT `volunteer_campaign_access_token_idx` UNIQUE(`campaignId`,`accessTokenHash`);