-- Run this in Supabase SQL Editor to create all tables

CREATE TABLE IF NOT EXISTS signals (
  id          BIGSERIAL PRIMARY KEY,
  ticker      TEXT        NOT NULL,
  agent       TEXT        NOT NULL,  -- 'bull' | 'bear' | 'risk' | 'mediator'
  verdict     TEXT,                  -- 'BUY' | 'SELL' | 'HOLD'
  confidence  INTEGER,               -- 0-100
  reasons     JSONB,                 -- { text, sources, weight }[]
  decision    TEXT,                  -- mediator only: 'BUY' | 'SELL' | 'HOLD'
  conflict_score TEXT,               -- mediator only: 'LOW' | 'MEDIUM' | 'HIGH'
  trigger     TEXT,                  -- mediator only: conditional action string
  rationale   TEXT,                  -- mediator only: 2-3 sentence explanation
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signals_ticker_idx ON signals(ticker);
CREATE INDEX IF NOT EXISTS signals_created_at_idx ON signals(created_at DESC);

-- Tracked stocks — persists across server restarts
CREATE TABLE IF NOT EXISTS tracked_stocks (
  id          BIGSERIAL PRIMARY KEY,
  ticker      TEXT        NOT NULL UNIQUE,
  verdict     TEXT,
  confidence  INTEGER,
  rationale   TEXT,
  trigger     TEXT,
  price       NUMERIC,
  change_pct  NUMERIC,
  sources     JSONB       DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tracked_stocks_ticker_idx ON tracked_stocks(ticker);

-- Chat sessions — stores constraint chat history per ticker
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          BIGSERIAL PRIMARY KEY,
  ticker      TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_ticker_idx ON chat_sessions(ticker);
CREATE INDEX IF NOT EXISTS chat_sessions_created_at_idx ON chat_sessions(created_at DESC);
