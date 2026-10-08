CREATE TABLE `storage_objects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(1000) NOT NULL,
	`organizationId` int,
	`campaignId` int,
	`visibility` enum('private','public') NOT NULL DEFAULT 'private',
	`resourceType` varchar(80) NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storage_objects_id` PRIMARY KEY(`id`),
	CONSTRAINT `storage_object_key_unique_idx` UNIQUE(`storageKey`)
);
--> statement-breakpoint
ALTER TABLE `storage_objects` ADD CONSTRAINT `storage_objects_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storage_objects` ADD CONSTRAINT `storage_objects_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storage_objects` ADD CONSTRAINT `storage_objects_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `storage_object_campaign_idx` ON `storage_objects` (`campaignId`);--> statement-breakpoint
CREATE INDEX `storage_object_organization_idx` ON `storage_objects` (`organizationId`);--> statement-breakpoint
CREATE INDEX `storage_object_visibility_idx` ON `storage_objects` (`visibility`);--> statement-breakpoint
INSERT IGNORE INTO `storage_objects` (`storageKey`,`organizationId`,`campaignId`,`visibility`,`resourceType`,`createdByUserId`,`createdAt`,`updatedAt`)
SELECT `assetKey`,`organizationId`,`campaignId`,'private','campaign_content_asset',NULL,`createdAt`,`updatedAt`
FROM `campaign_contents`
WHERE `assetKey` IS NOT NULL AND `assetKey` <> '';
--> statement-breakpoint
INSERT IGNORE INTO `storage_objects` (`storageKey`,`organizationId`,`campaignId`,`visibility`,`resourceType`,`createdByUserId`,`createdAt`,`updatedAt`)
SELECT `storageKey`,`organizationId`,`campaignId`,'private','legal_document',`createdByUserId`,`createdAt`,`updatedAt`
FROM `campaign_legal_documents`
WHERE `storageKey` IS NOT NULL AND `storageKey` <> '';
--> statement-breakpoint
INSERT IGNORE INTO `storage_objects` (`storageKey`,`organizationId`,`campaignId`,`visibility`,`resourceType`,`createdByUserId`,`createdAt`,`updatedAt`)
SELECT `storageKey`,`organizationId`,`campaignId`,'private','playbook_material',`createdByUserId`,`createdAt`,`createdAt`
FROM `field_playbook_materials`
WHERE `storageKey` IS NOT NULL AND `storageKey` <> '';
--> statement-breakpoint
INSERT IGNORE INTO `storage_objects` (`storageKey`,`organizationId`,`campaignId`,`visibility`,`resourceType`,`createdByUserId`,`createdAt`,`updatedAt`)
SELECT SUBSTRING_INDEX(a.`audioUrl`, '/manus-storage/', -1),a.`organizationId`,a.`campaignId`,'private','audio_crm',m.`userId`,a.`createdAt`,a.`createdAt`
FROM `audio_crm_logs` a
LEFT JOIN `campaign_members` m ON m.`id` = a.`memberId` AND m.`campaignId` = a.`campaignId`
WHERE LOCATE('/manus-storage/', a.`audioUrl`) > 0 AND SUBSTRING_INDEX(a.`audioUrl`, '/manus-storage/', -1) <> '';
--> statement-breakpoint
INSERT IGNORE INTO `storage_objects` (`storageKey`,`organizationId`,`campaignId`,`visibility`,`resourceType`,`createdByUserId`,`createdAt`,`updatedAt`)
SELECT SUBSTRING_INDEX(`logoUrl`, '/manus-storage/', -1),`organizationId`,`campaignId`,'public','certificate_logo',`updatedByUserId`,`createdAt`,`updatedAt`
FROM `campaign_certificate_settings`
WHERE `logoUrl` IS NOT NULL AND LOCATE('/manus-storage/', `logoUrl`) > 0 AND SUBSTRING_INDEX(`logoUrl`, '/manus-storage/', -1) <> '';
--> statement-breakpoint
INSERT IGNORE INTO `storage_objects` (`storageKey`,`organizationId`,`campaignId`,`visibility`,`resourceType`,`createdByUserId`,`createdAt`,`updatedAt`)
SELECT SUBSTRING_INDEX(`signatureImageUrl`, '/manus-storage/', -1),`organizationId`,`campaignId`,'public','certificate_signature',`updatedByUserId`,`createdAt`,`updatedAt`
FROM `campaign_certificate_settings`
WHERE `signatureImageUrl` IS NOT NULL AND LOCATE('/manus-storage/', `signatureImageUrl`) > 0 AND SUBSTRING_INDEX(`signatureImageUrl`, '/manus-storage/', -1) <> '';
