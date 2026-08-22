CREATE TABLE `platform_customer_portfolio_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleTaskUid` varchar(65),
	`customerCount` int NOT NULL DEFAULT 0,
	`statusSummary` json NOT NULL,
	`snapshot` json NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_customer_portfolio_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_customer_portfolio_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cron` varchar(80) NOT NULL,
	`scheduleTaskUid` varchar(65) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`lastGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_customer_portfolio_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_customer_portfolio_schedule_task_idx` UNIQUE(`scheduleTaskUid`)
);
--> statement-breakpoint
-- O vínculo da tarefa é lógico e validado pelo identificador seguro do agendamento; não há chave estrangeira física para evitar nomes de restrição incompatíveis com o limite do banco.--> statement-breakpoint
ALTER TABLE `platform_customer_portfolio_schedules` ADD CONSTRAINT `platform_customer_portfolio_schedules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `platform_customer_portfolio_report_schedule_idx` ON `platform_customer_portfolio_reports` (`scheduleTaskUid`,`generatedAt`);
