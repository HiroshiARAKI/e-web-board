CREATE TABLE `pin_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text NOT NULL,
	`attempted_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pin_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pin_reset_tokens_token_unique` ON `pin_reset_tokens` (`token`);