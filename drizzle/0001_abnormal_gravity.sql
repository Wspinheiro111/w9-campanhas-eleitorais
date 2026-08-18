CREATE TABLE `ai_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`ai_message_kind` enum('chat','content') NOT NULL DEFAULT 'chat',
	`ai_message_role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`currentValue` int NOT NULL DEFAULT 0,
	`targetValue` int NOT NULL DEFAULT 0,
	`unit` varchar(40) NOT NULL DEFAULT 'unidades',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`campaign_role` enum('admin','coordinator','partner') NOT NULL DEFAULT 'partner',
	`responsibility` varchar(220),
	`workRegion` varchar(160),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`candidateName` varchar(160) NOT NULL,
	`electionLabel` varchar(120) NOT NULL,
	`region` varchar(160) NOT NULL,
	`campaign_status` enum('planning','active','paused','closed') NOT NULL DEFAULT 'planning',
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`event_type` enum('meeting','rally','visit','debate','internal','other') NOT NULL DEFAULT 'meeting',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`location` varchar(240),
	`responsibleId` int,
	`event_status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`reportedById` int,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`incident_status` enum('open','in_review','resolved') NOT NULL DEFAULT 'open',
	`location` varchar(220),
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`targetValue` int NOT NULL,
	`currentValue` int NOT NULL DEFAULT 0,
	`unit` varchar(40) NOT NULL DEFAULT 'entregas',
	`deadline` timestamp,
	`goal_status` enum('on_track','attention','completed') NOT NULL DEFAULT 'on_track',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`goalId` int,
	`title` varchar(220) NOT NULL,
	`description` text,
	`task_status` enum('backlog','todo','in_progress','review','done') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assignedToId` int,
	`dueAt` timestamp,
	`completedAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voter_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voterId` int NOT NULL,
	`campaignId` int NOT NULL,
	`memberId` int,
	`interaction_type` enum('visit','phone','whatsapp','event','audio','other') NOT NULL DEFAULT 'visit',
	`notes` text NOT NULL,
	`happenedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voter_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`ownerMemberId` int,
	`name` varchar(180) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`neighborhood` varchar(120),
	`region` varchar(120),
	`contactProfile` varchar(120),
	`engagement_level` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`conversionScore` int NOT NULL DEFAULT 0,
	`primaryDemand` text,
	`notes` text,
	`contactConsent` boolean NOT NULL DEFAULT false,
	`doNotContact` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_indicators` ADD CONSTRAINT `campaign_indicators_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_members` ADD CONSTRAINT `campaign_members_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_members` ADD CONSTRAINT `campaign_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_responsibleId_campaign_members_id_fk` FOREIGN KEY (`responsibleId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_incidents` ADD CONSTRAINT `field_incidents_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_incidents` ADD CONSTRAINT `field_incidents_reportedById_campaign_members_id_fk` FOREIGN KEY (`reportedById`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_goalId_goals_id_fk` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedToId_campaign_members_id_fk` FOREIGN KEY (`assignedToId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_interactions` ADD CONSTRAINT `voter_interactions_voterId_voters_id_fk` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_interactions` ADD CONSTRAINT `voter_interactions_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voter_interactions` ADD CONSTRAINT `voter_interactions_memberId_campaign_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voters` ADD CONSTRAINT `voters_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voters` ADD CONSTRAINT `voters_ownerMemberId_campaign_members_id_fk` FOREIGN KEY (`ownerMemberId`) REFERENCES `campaign_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_campaign_kind_idx` ON `ai_messages` (`campaignId`,`ai_message_kind`);--> statement-breakpoint
CREATE INDEX `indicator_campaign_idx` ON `campaign_indicators` (`campaignId`);--> statement-breakpoint
CREATE INDEX `member_campaign_idx` ON `campaign_members` (`campaignId`);--> statement-breakpoint
CREATE INDEX `member_user_idx` ON `campaign_members` (`userId`);--> statement-breakpoint
CREATE INDEX `campaign_owner_idx` ON `campaigns` (`ownerId`);--> statement-breakpoint
CREATE INDEX `event_campaign_start_idx` ON `events` (`campaignId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `incident_campaign_status_idx` ON `field_incidents` (`campaignId`,`incident_status`);--> statement-breakpoint
CREATE INDEX `goal_campaign_idx` ON `goals` (`campaignId`);--> statement-breakpoint
CREATE INDEX `task_campaign_status_idx` ON `tasks` (`campaignId`,`task_status`);--> statement-breakpoint
CREATE INDEX `task_assignee_idx` ON `tasks` (`assignedToId`);--> statement-breakpoint
CREATE INDEX `interaction_voter_idx` ON `voter_interactions` (`voterId`);--> statement-breakpoint
CREATE INDEX `interaction_campaign_idx` ON `voter_interactions` (`campaignId`);--> statement-breakpoint
CREATE INDEX `voter_campaign_idx` ON `voters` (`campaignId`);--> statement-breakpoint
CREATE INDEX `voter_owner_idx` ON `voters` (`ownerMemberId`);--> statement-breakpoint
CREATE INDEX `voter_segment_idx` ON `voters` (`campaignId`,`neighborhood`,`region`,`contactProfile`);