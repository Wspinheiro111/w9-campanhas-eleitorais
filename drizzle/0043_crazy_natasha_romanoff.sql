CREATE TABLE `client_interface_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int,
	`route` varchar(240) NOT NULL,
	`source` varchar(40) NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`message` varchar(280) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_interface_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_interface_errors` ADD CONSTRAINT `client_interface_errors_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_interface_errors` ADD CONSTRAINT `client_interface_errors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `client_error_organization_created_idx` ON `client_interface_errors` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `client_error_fingerprint_created_idx` ON `client_interface_errors` (`fingerprint`,`createdAt`);