ALTER TABLE `reviews` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `technicians` MODIFY COLUMN `specialties` json NOT NULL;