-- MetaSuite — schema inicial
-- Se aplica solo la primera vez que arranca Postgres (idempotente vía IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS clients (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  spoter_instance_id  INT NOT NULL UNIQUE,
  meta_ad_account_id  TEXT NOT NULL,
  timezone            TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  active              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ads (
  ad_id                  TEXT PRIMARY KEY,
  adset_id               TEXT NOT NULL,
  campaign_id            TEXT NOT NULL,
  client_id              INT REFERENCES clients(id),
  name                   TEXT,
  creative_snapshot      JSONB,
  status                 TEXT,             -- ACTIVE, PAUSED, DELETED (mirror Meta)
  effective_status       TEXT,             -- IN_REVIEW, DISAPPROVED, etc
  manual_override_until  TIMESTAMPTZ,
  supported_format       BOOLEAN DEFAULT true,
  disapproval_reason     TEXT,
  first_seen_at          TIMESTAMPTZ DEFAULT now(),
  last_updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ads_client_status ON ads(client_id, status);

CREATE TABLE IF NOT EXISTS ad_snapshots (
  id               BIGSERIAL PRIMARY KEY,
  ad_id            TEXT REFERENCES ads(ad_id),
  ts               TIMESTAMPTZ NOT NULL,
  spend            NUMERIC(12,2),
  impressions      INT,
  clicks           INT,
  results          INT,
  cost_per_result  NUMERIC(12,2),
  raw              JSONB,
  UNIQUE (ad_id, ts)  -- idempotencia del poller
);
CREATE INDEX IF NOT EXISTS idx_ad_snapshots_ad_ts ON ad_snapshots(ad_id, ts DESC);

CREATE TABLE IF NOT EXISTS conversions_log (
  id                 BIGSERIAL PRIMARY KEY,
  client_id          INT REFERENCES clients(id),
  ts                 TIMESTAMPTZ DEFAULT now(),
  phone_hash         TEXT,
  ad_id              TEXT REFERENCES ads(ad_id),
  ctwa_clid          TEXT,
  status_id          TEXT,             -- 'lead_new', '1'..'5', 'ghost', 'cold', 'stalled_at_price'
  amount             NUMERIC(14,2),
  currency           TEXT,
  opened_at          TIMESTAMPTZ,
  closed_at          TIMESTAMPTZ,
  attribution_method TEXT,             -- 'ctwa_clid' | 'window_match' | 'utm' | 'unattributed'
  is_duplicate       BOOLEAN DEFAULT false,
  original_conv_id   BIGINT REFERENCES conversions_log(id),
  raw                JSONB
);
CREATE INDEX IF NOT EXISTS idx_conversions_ad ON conversions_log(ad_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_phone ON conversions_log(phone_hash);

CREATE TABLE IF NOT EXISTS lead_journeys (
  id             BIGSERIAL PRIMARY KEY,
  conversion_id  BIGINT REFERENCES conversions_log(id),
  ts             TIMESTAMPTZ DEFAULT now(),
  event_type     TEXT,
  from_status    TEXT,
  to_status      TEXT,
  metadata       JSONB
);
CREATE INDEX IF NOT EXISTS idx_lead_journeys_conv ON lead_journeys(conversion_id, ts DESC);

CREATE TABLE IF NOT EXISTS sla_events (
  id                  BIGSERIAL PRIMARY KEY,
  conversion_id       BIGINT REFERENCES conversions_log(id),
  ts                  TIMESTAMPTZ DEFAULT now(),
  vendor_id           TEXT,
  response_time_min   INT,
  breached_sla        BOOLEAN,
  ad_id               TEXT REFERENCES ads(ad_id)
);

CREATE TABLE IF NOT EXISTS analyst_reports (
  id                 BIGSERIAL PRIMARY KEY,
  ts                 TIMESTAMPTZ DEFAULT now(),
  ad_id              TEXT REFERENCES ads(ad_id),
  model              TEXT,
  prompt_hash        TEXT,
  narrative          TEXT,
  score_qualitative  TEXT,
  recommendations    JSONB
);

CREATE TABLE IF NOT EXISTS pending_actions (
  id               BIGSERIAL PRIMARY KEY,
  ts               TIMESTAMPTZ DEFAULT now(),
  action_type      TEXT NOT NULL,
  target_ad_id     TEXT,
  target_adset_id  TEXT,
  params           JSONB,
  status           TEXT DEFAULT 'pending',   -- pending | applied | cancelled | pending_review | failed
  dry_run          BOOLEAN DEFAULT true,
  applied_at       TIMESTAMPTZ,
  cancelled_by     TEXT,
  reason           TEXT,
  attempts         INT DEFAULT 0,
  last_error       TEXT
);
CREATE INDEX IF NOT EXISTS idx_pending_actions_pending ON pending_actions(ts) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS budget_actions (
  id                    BIGSERIAL PRIMARY KEY,
  ts                    TIMESTAMPTZ DEFAULT now(),
  target_type           TEXT,
  target_id             TEXT,
  before_daily_budget   NUMERIC(12,2),
  after_daily_budget    NUMERIC(12,2),
  reason                TEXT,
  applied_by_action     BIGINT REFERENCES pending_actions(id)
);

CREATE TABLE IF NOT EXISTS creative_variants (
  id                  BIGSERIAL PRIMARY KEY,
  ts                  TIMESTAMPTZ DEFAULT now(),
  source_ad_id        TEXT REFERENCES ads(ad_id),
  generated_ad_id     TEXT,
  prompt              JSONB,
  generated_creative  JSONB,
  approved_by         TEXT,
  approval_ts         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rules (
  id          SERIAL PRIMARY KEY,
  client_id   INT REFERENCES clients(id),
  rule_type   TEXT,
  params      JSONB,
  active      BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS capi_events_log (
  id             BIGSERIAL PRIMARY KEY,
  ts             TIMESTAMPTZ DEFAULT now(),
  conversion_id  BIGINT REFERENCES conversions_log(id),
  event_name     TEXT,
  dataset_id     TEXT,
  request        JSONB,
  response       JSONB,
  status         TEXT,
  emq_score      NUMERIC(3,1)
);

CREATE TABLE IF NOT EXISTS emq_history (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ DEFAULT now(),
  client_id   INT REFERENCES clients(id),
  dataset_id  TEXT,
  event_name  TEXT,
  score       NUMERIC(3,1),
  rating      TEXT
);

-- Cola de entrada para webhooks de Spoter: recibir rápido, procesar async.
CREATE TABLE IF NOT EXISTS inbox_events (
  event_id      TEXT PRIMARY KEY,     -- UUID que Spoter genera
  received_at   TIMESTAMPTZ DEFAULT now(),
  client_id     INT REFERENCES clients(id),
  event_type    TEXT,                  -- 'sale_closed' | 'lead_lost' | 'sale_cancelled'
  payload       JSONB,
  processed_at  TIMESTAMPTZ,
  attempts      INT DEFAULT 0,
  error         TEXT
);
CREATE INDEX IF NOT EXISTS idx_inbox_unprocessed ON inbox_events(received_at) WHERE processed_at IS NULL;

-- Telemetría de llamadas a APIs externas (rate limits, costos)
CREATE TABLE IF NOT EXISTS external_api_calls (
  id            BIGSERIAL PRIMARY KEY,
  ts            TIMESTAMPTZ DEFAULT now(),
  service       TEXT,             -- 'meta_mcp' | 'openrouter' | 'spoter'
  client_id     INT REFERENCES clients(id),
  endpoint      TEXT,
  status_code   INT,
  duration_ms   INT,
  tokens_used   INT
);
CREATE INDEX IF NOT EXISTS idx_ext_api_service_ts ON external_api_calls(service, ts DESC);
