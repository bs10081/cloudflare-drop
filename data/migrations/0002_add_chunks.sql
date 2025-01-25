ALTER TABLE `files` ADD COLUMN `size` integer NOT NULL;
ALTER TABLE `files` ADD COLUMN `storage_type` text NOT NULL DEFAULT 'kv';

CREATE TABLE `chunks` (
  `id` text PRIMARY KEY NOT NULL,
  `file_id` text NOT NULL,
  `chunk_number` integer NOT NULL,
  `total_chunks` integer NOT NULL,
  `size` integer NOT NULL,
  `upload_id` text NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `created_at` integer NOT NULL
); 