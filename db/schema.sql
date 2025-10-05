-- Schema for Telegram expense tracking bot

CREATE TABLE IF NOT EXISTS Records (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CREDIT', 'DEBIT', 'CASH', 'TRANSFER', 'OTHER')),
  category TEXT NOT NULL CHECK (category IN ('HOUSING', 'FOOD_GROCERIES', 'TRANSPORTATION', 'PETS', 'LEISURE_ENTERTAINMENT', 'OTHER')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  text TEXT,
  media_url TEXT,
  reply_to_message_id TEXT,
  date_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reply_to_message_id) REFERENCES Messages(id)
);

