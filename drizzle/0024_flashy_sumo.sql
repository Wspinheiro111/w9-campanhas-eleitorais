CREATE TABLE `event_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int NOT NULL,
	`eventId` int NOT NULL,
	`voterId` int,
	`volunteerId` int,
	`name` varchar(180) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`event_registration_status` enum('registered','checked_in','cancelled','no_show') NOT NULL DEFAULT 'registered',
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	`checkedInAt` timestamp,
	`feedbackRating` int,
	`feedbackComment` text,
	`feedbackSubmittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_registration_email_idx` UNIQUE(`eventId`,`email`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `publicRegistrationEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `registrationClosesAt` timestamp;--> statement-breakpoint
ALTER TABLE `events` ADD `capacity` int;--> statement-breakpoint
ALTER TABLE `events` ADD `postEventSurveyPrompt` text;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD CONSTRAINT `evreg_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD CONSTRAINT `evreg_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD CONSTRAINT `evreg_event_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD CONSTRAINT `evreg_voter_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD CONSTRAINT `evreg_volunteer_fk` FOREIGN KEY (`volunteerId`) REFERENCES `volunteers`(`id`) ON DELETE no action ON UPDATE no action; pc蛋蛋 to=functions.webdev_apply_patch เงินไทยฟรี 彩神争霸输钱json_key=
CREATE INDEX `event_registration_event_status_idx` ON `event_registrations` (`eventId`,`event_registration_status`);--> statement-breakpoint
CREATE INDEX `event_registration_campaign_idx` ON `event_registrations` (`campaignId`,`registeredAt`);--> statement-breakpoint
CREATE INDEX `event_registration_organization_idx` ON `event_registrations` (`organizationId`);
