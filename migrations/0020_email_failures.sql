ALTER TABLE submissions ADD COLUMN reading_delivery_attempt_body TEXT;
ALTER TABLE submissions ADD COLUMN email_failures_json TEXT NOT NULL DEFAULT '[]';
