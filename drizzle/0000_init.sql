CREATE TABLE `age_verifications` (
	`reference` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`last_name` text NOT NULL,
	`birth_date` text NOT NULL,
	`checked_at` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `age_verifications_status_idx` ON `age_verifications` (`status`);--> statement-breakpoint
CREATE INDEX `age_verifications_checked_idx` ON `age_verifications` (`checked_at`);--> statement-breakpoint
CREATE TABLE `brands` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`country` text NOT NULL,
	`founded` integer NOT NULL,
	`mark` text NOT NULL,
	`description` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand_slug` text NOT NULL,
	`pod_family` text NOT NULL,
	`draw_style` text NOT NULL,
	`coil_ohms` text NOT NULL,
	`watt_min` integer NOT NULL,
	`watt_max` integer NOT NULL,
	`battery_mah` integer NOT NULL,
	`pod_capacity_ml` real NOT NULL,
	`refillable` integer NOT NULL,
	`release_year` integer NOT NULL,
	`ideal_vg` integer NOT NULL,
	`vg_min` integer NOT NULL,
	`vg_max` integer NOT NULL,
	`max_nicotine_mg` integer NOT NULL,
	`popularity` integer NOT NULL,
	`summary` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`brand_slug`) REFERENCES `brands`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `devices_pod_family_idx` ON `devices` (`pod_family`);--> statement-breakpoint
CREATE INDEX `devices_brand_idx` ON `devices` (`brand_slug`);--> statement-breakpoint
CREATE TABLE `flavours` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`profiles` text NOT NULL,
	`notes` text NOT NULL,
	`sweetness` integer NOT NULL,
	`coolness` integer NOT NULL,
	`description` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `markup_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_kind` text NOT NULL,
	`markup_bps` integer NOT NULL,
	`floor_cents` integer DEFAULT 0 NOT NULL,
	`charm_pricing` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_cents` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_lines_order_idx` ON `order_lines` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`street` text NOT NULL,
	`postcode` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`payment_method` text NOT NULL,
	`subtotal_cents` integer NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`shipping_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer NOT NULL,
	`bundle_tier` text,
	`ident_reference` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`supplier_id` text,
	`is_business` integer DEFAULT false NOT NULL,
	`vat_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_email_idx` ON `orders` (`email`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`brand_slug` text NOT NULL,
	`category_slug` text NOT NULL,
	`price_cents` integer NOT NULL,
	`compare_at_cents` integer,
	`cost_cents` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`rating` real DEFAULT 0 NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`flavour_slug` text,
	`nicotine_mg` integer,
	`vg` integer,
	`volume_ml` real,
	`coil_ohm` real,
	`pod_families` text NOT NULL,
	`device_slug` text,
	`puffs` integer,
	`pack_size` integer DEFAULT 1 NOT NULL,
	`b2b_min_qty` integer,
	`b2b_unit_cents` integer,
	`tags` text NOT NULL,
	`summary` text NOT NULL,
	`hue` integer DEFAULT 180 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`brand_slug`) REFERENCES `brands`(`slug`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`flavour_slug`) REFERENCES `flavours`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_slug`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand_slug`);--> statement-breakpoint
CREATE INDEX `products_flavour_idx` ON `products` (`flavour_slug`);--> statement-breakpoint
CREATE INDEX `products_kind_idx` ON `products` (`kind`);--> statement-breakpoint
CREATE TABLE `pseo_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pattern` text NOT NULL,
	`intent` text NOT NULL,
	`enrichment_prompt` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_generated_at` text,
	`route_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`transport` text NOT NULL,
	`endpoint` text NOT NULL,
	`schedule` text NOT NULL,
	`last_sync_at` text,
	`last_sync_status` text DEFAULT 'never' NOT NULL,
	`items_tracked` integer DEFAULT 0 NOT NULL,
	`supports_blind_dropship` integer DEFAULT false NOT NULL,
	`lead_time_days` integer DEFAULT 2 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
