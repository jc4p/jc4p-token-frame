-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT UNIQUE NOT NULL,
  block_number INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  buyer TEXT NOT NULL,
  fid INTEGER,
  qty INTEGER NOT NULL,
  price TEXT NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  discount_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Redemptions table
CREATE TABLE IF NOT EXISTS redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT UNIQUE NOT NULL,
  block_number INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_address TEXT NOT NULL,
  fid INTEGER,
  qty INTEGER NOT NULL,
  work_cid TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer);
CREATE INDEX IF NOT EXISTS idx_purchases_fid ON purchases(fid);
CREATE INDEX IF NOT EXISTS idx_purchases_timestamp ON purchases(timestamp);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(user_address);
CREATE INDEX IF NOT EXISTS idx_redemptions_fid ON redemptions(fid);
CREATE INDEX IF NOT EXISTS idx_redemptions_timestamp ON redemptions(timestamp);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);

-- Redemption requests table (private storage)
CREATE TABLE IF NOT EXISTS redemption_requests (
  id TEXT PRIMARY KEY, -- UUID for the request
  user_address TEXT NOT NULL,
  fid INTEGER,
  qty INTEGER NOT NULL,
  request_content TEXT NOT NULL, -- The actual request/ask from the user
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tx_hash TEXT, -- Will be set when the redemption is processed on-chain
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_requests_user ON redemption_requests(user_address);
CREATE INDEX IF NOT EXISTS idx_requests_fid ON redemption_requests(fid);
CREATE INDEX IF NOT EXISTS idx_requests_status ON redemption_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created ON redemption_requests(created_at);