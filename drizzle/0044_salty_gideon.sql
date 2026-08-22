CREATE TABLE `reseller_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resellerUserId` int NOT NULL,
	`organizationId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reseller_clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `reseller_client_unique_idx` UNIQUE(`resellerUserId`,`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `reseller_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resellerUserId` int NOT NULL,
	`organizationId` int,
	`title` varchar(180) NOT NULL,
	`contactName` varchar(180),
	`contactPhone` varchar(32),
	`reseller_proposal_status` enum('draft','sent','negotiation','accepted','lost','archived') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reseller_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reseller_clients` ADD CONSTRAINT `reseller_clients_resellerUserId_users_id_fk` FOREIGN KEY (`resellerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reseller_clients` ADD CONSTRAINT `reseller_clients_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reseller_proposals` ADD CONSTRAINT `reseller_proposals_resellerUserId_users_id_fk` FOREIGN KEY (`resellerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reseller_proposals` ADD CONSTRAINT `reseller_proposals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reseller_client_user_idx` ON `reseller_clients` (`resellerUserId`,`active`);--> statement-breakpoint
CREATE INDEX `reseller_proposal_user_status_idx` ON `reseller_proposals` (`resellerUserId`,`reseller_proposal_status`);--> statement-breakpoint
CREATE INDEX `reseller_proposal_org_idx` ON `reseller_proposals` (`organizationId`);