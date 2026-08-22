CREATE TABLE `platform_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`contactName` varchar(180) NOT NULL,
	`contactPhone` varchar(32) NOT NULL,
	`platform_customer_status` enum('pending','access_released','active','suspended') NOT NULL DEFAULT 'pending',
	`lastInvitationId` int,
	`accessReleasedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_customer_organization_unique_idx` UNIQUE(`organizationId`)
);
--> statement-breakpoint
ALTER TABLE `platform_customers` ADD CONSTRAINT `platform_customers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_customers` ADD CONSTRAINT `platform_customers_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `platform_customer_status_idx` ON `platform_customers` (`platform_customer_status`,`updatedAt`);
