ALTER TABLE `campaign_compliance_decisions` ADD `entityVersion` int;--> statement-breakpoint
ALTER TABLE `campaign_compliance_decisions` ADD `entityHash` varchar(64);--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `syntheticUsesCandidateOrPublicPerson` boolean;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `complianceReviewedContentVersion` int;--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `complianceReviewedContentHash` varchar(64);--> statement-breakpoint
ALTER TABLE `campaign_contents` ADD `complianceReviewedRuleVersion` varchar(32);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `electionEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `electionTimeZone` varchar(80);