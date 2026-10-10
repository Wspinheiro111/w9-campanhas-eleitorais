CREATE TABLE `public_rate_limit_buckets` (
	`bucketKey` varchar(64) NOT NULL,
	`routeKey` varchar(80) NOT NULL,
	`campaignId` int NOT NULL,
	`hitCount` int NOT NULL DEFAULT 1,
	`windowStartedAt` timestamp(3) NOT NULL,
	`expiresAt` timestamp(3) NOT NULL,
	`updatedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `public_rate_limit_buckets_bucketKey` PRIMARY KEY(`bucketKey`)
);
--> statement-breakpoint
CREATE INDEX `public_rate_limit_expiry_idx` ON `public_rate_limit_buckets` (`expiresAt`);
--> statement-breakpoint
CREATE INDEX `public_rate_limit_route_campaign_idx` ON `public_rate_limit_buckets` (`routeKey`,`campaignId`);
--> statement-breakpoint
CREATE TABLE `volunteer_portal_tokens` (
	`tokenHash` varchar(128) NOT NULL,
	`volunteerId` int NOT NULL,
	`campaignId` int NOT NULL,
	`expiresAt` timestamp(3),
	`revokedAt` timestamp(3),
	`lastUsedAt` timestamp(3),
	`createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `volunteer_portal_tokens_tokenHash` PRIMARY KEY(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `volunteer_portal_tokens_volunteer_idx` ON `volunteer_portal_tokens` (`volunteerId`);
--> statement-breakpoint
CREATE INDEX `volunteer_portal_tokens_campaign_idx` ON `volunteer_portal_tokens` (`campaignId`);
--> statement-breakpoint
CREATE INDEX `volunteer_portal_tokens_expiry_idx` ON `volunteer_portal_tokens` (`expiresAt`);
--> statement-breakpoint
INSERT IGNORE INTO `volunteer_portal_tokens` (`tokenHash`,`volunteerId`,`campaignId`,`expiresAt`,`revokedAt`,`lastUsedAt`)
SELECT `accessTokenHash`,`id`,`campaignId`,NULL,NULL,NULL
FROM `volunteers`
WHERE `accessTokenHash` IS NOT NULL AND `accessTokenHash` <> '';
