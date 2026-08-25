CREATE TABLE `platform_contact_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`message` text NOT NULL,
	`consent` boolean NOT NULL,
	`platform_contact_request_status` enum('new','contacted','archived') NOT NULL DEFAULT 'new',
	`viewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_contact_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `platform_contact_request_status_created_idx` ON `platform_contact_requests` (`platform_contact_request_status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platform_contact_request_email_idx` ON `platform_contact_requests` (`email`);--> statement-breakpoint
CREATE INDEX `platform_contact_request_phone_idx` ON `platform_contact_requests` (`phone`);