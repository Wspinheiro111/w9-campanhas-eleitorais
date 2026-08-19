ALTER TABLE `volunteers` ADD `accessTokenHash` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `volunteers` ADD CONSTRAINT `volunteers_accessTokenHash_unique` UNIQUE(`accessTokenHash`);