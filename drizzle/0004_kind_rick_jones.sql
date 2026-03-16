CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`senderId` int NOT NULL,
	`senderName` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
