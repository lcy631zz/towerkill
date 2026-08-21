CREATE TABLE `divinationRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`question` text NOT NULL,
	`numberA` int NOT NULL,
	`numberB` int NOT NULL,
	`numberC` int NOT NULL,
	`ritualNonce` varchar(64) NOT NULL,
	`seedFingerprint` varchar(16) NOT NULL,
	`cardsJson` text NOT NULL,
	`plumJson` text NOT NULL,
	`interpretation` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `divinationRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `divinationRecords` ADD CONSTRAINT `divinationRecords_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;