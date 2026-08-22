CREATE TABLE `platform_demo_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`organizationName` varchar(180) NOT NULL,
	`role` varchar(80) NOT NULL,
	`city` varchar(120),
	`state` varchar(2),
	`message` text,
	`consent` boolean NOT NULL,
	`platform_demo_request_status` enum('new','contacted','qualified','converted','archived') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_demo_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `platform_demo_request_status_created_idx` ON `platform_demo_requests` (`platform_demo_request_status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platform_demo_request_email_idx` ON `platform_demo_requests` (`email`);--> statement-breakpoint
CREATE INDEX `platform_demo_request_phone_idx` ON `platform_demo_requests` (`phone`);