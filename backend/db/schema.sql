-- Run this in Supabase SQL Editor to create the signals table

CREATE TABLE IF NOT EXISTS signals (
  id          BIGSERIAL PRIMARY KEY,
  ticker      TEXT        NOT NULL,
  agent       TEXT        NOT NULL,  -- 'bull' | 'bear' | 'risk' | 'mediator'
  verdict     TEXT,                  -- 'BUY' | 'SELL' | 'HOLD'
  confidence  INTEGER,               -- 0-100
  reasons     JSONB,                 -- string[]
  decision    TEXT,                  -- mediator only: 'BUY' | 'SELL' | 'HOLD'
  conflict_score TEXT,               -- mediator only: 'LOW' | 'MEDIUM' | 'HIGH'
  trigger     TEXT,                  -- mediator only: conditional action string
  rationale   TEXT,                  -- mediator only: 2-3 sentence explanation
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by ticker
CREATE INDEX IF NOT EXISTS signals_ticker_idx ON signals(ticker);
CREATE INDEX IF NOT EXISTS signals_created_at_idx ON signals(created_at DESC);
