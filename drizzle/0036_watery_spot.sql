ALTER TABLE `campaign_financial_entries` ADD `eventId` int;--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `costCenter` varchar(120);--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD `supplierName` varchar(220);--> statement-breakpoint
ALTER TABLE `campaign_financial_entries` ADD CONSTRAINT `campaign_financial_entries_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;