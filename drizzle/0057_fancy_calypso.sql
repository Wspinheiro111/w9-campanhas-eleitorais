CREATE TABLE `google_auth_handoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secretHash` varchar(128) NOT NULL,
	`returnOrigin` varchar(500) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `google_auth_handoffs_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_handoff_secret_unique` UNIQUE(`secretHash`)
);
--> statement-breakpoint
ALTER TABLE `google_auth_handoffs` ADD CONSTRAINT `google_auth_handoffs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `google_handoff_expiry_idx` ON `google_auth_handoffs` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `google_handoff_user_idx` ON `google_auth_handoffs` (`userId`);