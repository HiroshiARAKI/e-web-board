ALTER TABLE `pin_reset_tokens` ADD `user_id` text REFERENCES `users`(`id`);
