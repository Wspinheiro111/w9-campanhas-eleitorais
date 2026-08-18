ALTER TABLE `campaign_contents` ADD `assetUrl` varchar(1200);--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `version` int DEFAULT 1 NOT NULL;