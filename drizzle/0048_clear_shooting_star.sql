ALTER TABLE `platform_customers` ADD `nextContactAt` timestamp;--> statement-breakpoint
ALTER TABLE `platform_customers` ADD `nextContactNote` varchar(500);--> statement-breakpoint
CREATE INDEX `platform_customer_next_contact_idx` ON `platform_customers` (`platform_customer_status`,`nextContactAt`);