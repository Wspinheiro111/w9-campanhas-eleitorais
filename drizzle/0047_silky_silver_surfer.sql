CREATE TABLE `platform_customer_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`kind` varchar(48) NOT NULL,
	`description` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_customer_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `platform_customer_interactions` ADD CONSTRAINT `pc_interaction_customer_fk` FOREIGN KEY (`customerId`) REFERENCES `platform_customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_customer_interactions` ADD CONSTRAINT `pc_interaction_actor_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `platform_customer_interaction_customer_idx` ON `platform_customer_interactions` (`customerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platform_customer_interaction_actor_idx` ON `platform_customer_interactions` (`createdByUserId`,`createdAt`);
