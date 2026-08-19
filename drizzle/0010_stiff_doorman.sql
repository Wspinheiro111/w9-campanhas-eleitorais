CREATE TABLE `route_performance_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`route` varchar(240) NOT NULL,
	`method` varchar(12) NOT NULL,
	`statusCode` int NOT NULL,
	`durationMs` int NOT NULL,
	`hasError` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `route_performance_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `route_performance_events` ADD CONSTRAINT `route_performance_events_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `performance_route_created_idx` ON `route_performance_events` (`route`,`createdAt`);--> statement-breakpoint
CREATE INDEX `performance_organization_created_idx` ON `route_performance_events` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `performance_error_created_idx` ON `route_performance_events` (`hasError`,`createdAt`);