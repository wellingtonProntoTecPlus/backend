CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`technicianId` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`description` text NOT NULL,
	`estimatedTime` varchar(100) NOT NULL,
	`status` enum('pendente','aceito','recusado') NOT NULL DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`technicianId` int NOT NULL,
	`clientId` int NOT NULL,
	`requestId` int,
	`clientName` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`tags` json DEFAULT ('[]'),
	`serviceCategory` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`clientName` varchar(255),
	`clientPhone` varchar(20),
	`clientAddress` text,
	`technicianId` int,
	`category` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`photoUrl` text,
	`location` varchar(255) NOT NULL,
	`status` enum('solicitado','em_analise','orcamento_enviado','servico_aprovado','tecnico_a_caminho','em_andamento','aguardando_confirmacao','finalizado_cliente','encerrado','cancelado') NOT NULL DEFAULT 'solicitado',
	`urgency` enum('normal','urgente') NOT NULL DEFAULT 'normal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`companyName` varchar(255),
	`document` varchar(20),
	`phone` varchar(20) NOT NULL,
	`whatsapp` varchar(20),
	`description` text,
	`city` varchar(100) NOT NULL,
	`state` varchar(2) NOT NULL,
	`addressStreet` varchar(255),
	`addressNumber` varchar(20),
	`addressComplement` varchar(100),
	`addressNeighborhood` varchar(100),
	`addressZipCode` varchar(10),
	`addressLat` decimal(10,7),
	`addressLng` decimal(10,7),
	`type` enum('empresa','autonomo','certificada') NOT NULL DEFAULT 'autonomo',
	`badge` enum('verificado','autonomo','certificada') NOT NULL DEFAULT 'autonomo',
	`level` enum('autonomo','empresa_verificada','parceiro_prontotec') NOT NULL DEFAULT 'autonomo',
	`availability` enum('disponivel','agenda_cheia','indisponivel') NOT NULL DEFAULT 'disponivel',
	`avatarUrl` text,
	`photoUri` text,
	`specialties` json NOT NULL DEFAULT ('[]'),
	`rating` decimal(3,2) DEFAULT '5.00',
	`totalReviews` int NOT NULL DEFAULT 0,
	`totalServices` int NOT NULL DEFAULT 0,
	`yearsExperience` int NOT NULL DEFAULT 0,
	`planType` enum('basico','destaque','gratuito') NOT NULL DEFAULT 'gratuito',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technicians_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `state` varchar(2);--> statement-breakpoint
ALTER TABLE `users` ADD `addressStreet` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `addressNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `addressComplement` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `addressNeighborhood` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `addressZipCode` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `addressLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `users` ADD `addressLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mode` enum('cliente','tecnico') DEFAULT 'cliente' NOT NULL;