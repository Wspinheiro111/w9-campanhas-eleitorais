CREATE TABLE `auth_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purpose` varchar(32) NOT NULL,
	`challenge` varchar(512) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_mfa_factors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secretCiphertext` varchar(512) NOT NULL,
	`enabledAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	CONSTRAINT `auth_mfa_factors_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_mfa_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `auth_passkeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credentialId` varchar(512) NOT NULL,
	`publicKey` text NOT NULL,
	`counter` int NOT NULL DEFAULT 0,
	`transports` json,
	`label` varchar(120) NOT NULL DEFAULT 'Passkey',
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_passkeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_passkey_credential_unique` UNIQUE(`credentialId`)
);
--> statement-breakpoint
CREATE TABLE `authentication_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`emailHash` varchar(128) NOT NULL,
	`action` varchar(80) NOT NULL,
	`success` boolean NOT NULL,
	`ipHash` varchar(128),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authentication_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_security_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailHash` varchar(128) NOT NULL,
	`failedAttempts` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`lastFailedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `login_security_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_security_email_unique` UNIQUE(`emailHash`)
);
--> statement-breakpoint
ALTER TABLE `auth_challenges` ADD CONSTRAINT `auth_challenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_mfa_factors` ADD CONSTRAINT `auth_mfa_factors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_passkeys` ADD CONSTRAINT `auth_passkeys_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authentication_audit_logs` ADD CONSTRAINT `authentication_audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auth_challenge_user_purpose_idx` ON `auth_challenges` (`userId`,`purpose`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `auth_passkey_user_idx` ON `auth_passkeys` (`userId`);--> statement-breakpoint
CREATE INDEX `auth_audit_email_created_idx` ON `authentication_audit_logs` (`emailHash`,`createdAt`);--> statement-breakpoint
CREATE INDEX `auth_audit_user_created_idx` ON `authentication_audit_logs` (`userId`,`createdAt`);