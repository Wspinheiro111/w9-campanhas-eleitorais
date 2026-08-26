ALTER TABLE `platform_customers` ADD `masterUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_customers` ADD CONSTRAINT `platform_customer_master_user_unique_idx` UNIQUE(`masterUserId`);--> statement-breakpoint
ALTER TABLE `platform_customers` ADD CONSTRAINT `platform_customers_masterUserId_users_id_fk` FOREIGN KEY (`masterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;