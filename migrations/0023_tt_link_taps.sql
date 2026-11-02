CREATE TABLE tt_link_taps (
  day TEXT NOT NULL,
  link_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, link_key)
) WITHOUT ROWID;
