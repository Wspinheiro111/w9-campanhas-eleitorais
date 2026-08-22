ALTER TABLE `platform_customer_portfolio_reports` DROP FOREIGN KEY `platform_customer_portfolio_reports_scheduleTaskUid_platform_customer_portfolio_schedules_scheduleTaskUid_fk`;
--> statement-breakpoint
ALTER TABLE `platform_customer_portfolio_schedules` ADD `frequency` varchar(16) DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_customer_portfolio_schedules` ADD `lastViewedReportAt` timestamp;