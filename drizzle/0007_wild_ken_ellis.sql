CREATE TABLE `organizations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(180) NOT NULL,
  `legalName` varchar(220),
  `fiscalId` varchar(32),
  `organization_status` enum('active','suspended','archived') NOT NULL DEFAULT 'active',
  `settings` json,
  `createdById` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `userId` int NOT NULL,
  `organization_role` enum('admin','manager','operator','viewer') NOT NULL DEFAULT 'operator',
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `organization_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_invitations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `organization_role` enum('admin','manager','operator','viewer') NOT NULL DEFAULT 'operator',
  `tokenHash` varchar(128) NOT NULL,
  `invitation_status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
  `expiresAt` timestamp NOT NULL,
  `invitedById` int NOT NULL,
  `acceptedById` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `organization_invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `googleId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` varchar(1200);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `campaign_members` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `events` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `goals` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `voters` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `voter_interactions` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `audio_crm_logs` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `field_incidents` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `campaign_indicators` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `pipeline_followups` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `ai_messages` ADD `organizationId` int;--> statement-breakpoint
INSERT INTO `organizations` (`name`, `createdById`, `status`) SELECT 'Organização migrada', (SELECT MIN(`id`) FROM `users`), 'active' WHERE NOT EXISTS (SELECT 1 FROM `organizations`);--> statement-breakpoint
UPDATE `campaigns` SET `organizationId` = (SELECT MIN(`id`) FROM `organizations`) WHERE `organizationId` IS NULL;--> statement-breakpoint
UPDATE `campaign_members` m INNER JOIN `campaigns` c ON c.`id` = m.`campaignId` SET m.`organizationId` = c.`organizationId` WHERE m.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `events` e INNER JOIN `campaigns` c ON c.`id` = e.`campaignId` SET e.`organizationId` = c.`organizationId` WHERE e.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `goals` g INNER JOIN `campaigns` c ON c.`id` = g.`campaignId` SET g.`organizationId` = c.`organizationId` WHERE g.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `tasks` t INNER JOIN `campaigns` c ON c.`id` = t.`campaignId` SET t.`organizationId` = c.`organizationId` WHERE t.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `voters` v INNER JOIN `campaigns` c ON c.`id` = v.`campaignId` SET v.`organizationId` = c.`organizationId` WHERE v.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `voter_interactions` i INNER JOIN `campaigns` c ON c.`id` = i.`campaignId` SET i.`organizationId` = c.`organizationId` WHERE i.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `audio_crm_logs` a INNER JOIN `campaigns` c ON c.`id` = a.`campaignId` SET a.`organizationId` = c.`organizationId` WHERE a.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `field_incidents` f INNER JOIN `campaigns` c ON c.`id` = f.`campaignId` SET f.`organizationId` = c.`organizationId` WHERE f.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `campaign_indicators` i INNER JOIN `campaigns` c ON c.`id` = i.`campaignId` SET i.`organizationId` = c.`organizationId` WHERE i.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `campaign_contents` c1 INNER JOIN `campaigns` c2 ON c2.`id` = c1.`campaignId` SET c1.`organizationId` = c2.`organizationId` WHERE c1.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `pipeline_followups` f INNER JOIN `campaigns` c ON c.`id` = f.`campaignId` SET f.`organizationId` = c.`organizationId` WHERE f.`organizationId` IS NULL;--> statement-breakpoint
UPDATE `ai_messages` a INNER JOIN `campaigns` c ON c.`id` = a.`campaignId` SET a.`organizationId` = c.`organizationId` WHERE a.`organizationId` IS NULL;--> statement-breakpoint
INSERT INTO `organization_members` (`organizationId`, `userId`, `organization_role`, `active`) SELECT DISTINCT `organizationId`, `ownerId`, 'admin', true FROM `campaigns` WHERE `ownerId` IS NOT NULL;--> statement-breakpoint
INSERT INTO `organization_members` (`organizationId`, `userId`, `organization_role`, `active`) SELECT DISTINCT `organizationId`, `userId`, 'operator', true FROM `campaign_members` WHERE `userId` IS NOT NULL AND `organizationId` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_members` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `events` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `voters` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `voter_interactions` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `audio_crm_logs` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `field_incidents` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_indicators` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_contents` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pipeline_followups` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_messages` MODIFY `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_googleId_unique` UNIQUE(`googleId`);--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_invitations` ADD CONSTRAINT `organization_invitations_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_invitations` ADD CONSTRAINT `organization_invitations_invitedById_users_id_fk` FOREIGN KEY (`invitedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_invitations` ADD CONSTRAINT `organization_invitations_acceptedById_users_id_fk` FOREIGN KEY (`acceptedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_members` ADD CONSTRAINT `campaign_members_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voters` ADD CONSTRAINT `voters_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_interactions` ADD CONSTRAINT `voter_interactions_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audio_crm_logs` ADD CONSTRAINT `audio_crm_logs_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_incidents` ADD CONSTRAINT `field_incidents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_indicators` ADD CONSTRAINT `campaign_indicators_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD CONSTRAINT `campaign_contents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_followups` ADD CONSTRAINT `pipeline_followups_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `campaign_organization_idx` ON `campaigns` (`organizationId`);--> statement-breakpoint
CREATE INDEX `member_organization_idx` ON `campaign_members` (`organizationId`);--> statement-breakpoint
CREATE INDEX `org_member_user_idx` ON `organization_members` (`userId`);--> statement-breakpoint
CREATE INDEX `org_member_org_idx` ON `organization_members` (`organizationId`);--> statement-breakpoint
CREATE INDEX `org_member_unique_idx` ON `organization_members` (`organizationId`,`userId`);--> statement-breakpoint
CREATE INDEX `invite_org_idx` ON `organization_invitations` (`organizationId`,`invitation_status`);--> statement-breakpoint
CREATE INDEX `invite_email_idx` ON `organization_invitations` (`email`,`invitation_status`);--> statement-breakpoint
CREATE INDEX `invite_token_idx` ON `organization_invitations` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `organization_status_idx` ON `organizations` (`organization_status`);--> statement-breakpoint
CREATE INDEX `organization_fiscal_idx` ON `organizations` (`fiscalId`);
