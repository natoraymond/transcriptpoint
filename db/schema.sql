CREATE TABLE IF NOT EXISTS transcript_options (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  amount_ngn INTEGER NOT NULL CHECK (amount_ngn > 0),
  category TEXT NOT NULL DEFAULT 'Other services',
  requires_dhl BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transcript_options
  ADD COLUMN IF NOT EXISTS requires_dhl BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO transcript_options (value, label, amount_ngn, category, requires_dhl, display_order, is_active) VALUES
  ('official-softcopy-nigeria', 'Official Softcopy (Nigeria)', 17000, 'Softcopy transcript', FALSE, 10, TRUE),
  ('official-softcopy-outside-nigeria', 'Official Softcopy (Outside Nigeria)', 29000, 'Softcopy transcript', FALSE, 20, TRUE),
  ('softcopy-transcript-english-proficiency-nigeria', 'Softcopy Transcript / English Proficiency (Nigeria)', 22000, 'Softcopy transcript', FALSE, 30, TRUE),
  ('softcopy-transcript-english-proficiency-outside-nigeria', 'Softcopy Transcript / English Proficiency (Outside Nigeria)', 34000, 'Softcopy transcript', FALSE, 40, TRUE),
  ('softcopy-english-proficiency-nigeria', 'Softcopy English Proficiency (Nigeria)', 8000, 'Softcopy transcript', FALSE, 50, TRUE),
  ('students-softcopy', 'Students Softcopy', 7000, 'Other services', FALSE, 60, TRUE),
  ('hardcopy-nigeria', 'Hardcopy (Nigeria)', 30000, 'Hardcopy transcript', TRUE, 70, TRUE),
  ('hardcopy-outside-nigeria', 'Hardcopy (Outside Nigeria) - DHL delivery', 68000, 'Hardcopy transcript', TRUE, 80, TRUE),
  ('transcript-verification', 'Transcript Verification', 12000, 'Other services', FALSE, 90, TRUE),
  ('certificate-verification', 'Certificate Verification', 12000, 'Other services', FALSE, 100, TRUE),
  ('official-softcopy', 'Official Softcopy (legacy request)', 29000, 'Legacy', FALSE, 900, FALSE),
  ('students-official-softcopy-outside-nigeria', 'Students Official Softcopy (Outside Nigeria, legacy request)', 29000, 'Legacy', FALSE, 910, FALSE),
  ('english-proficiency', 'English Proficiency (legacy request)', 8000, 'Legacy', FALSE, 920, FALSE)
ON CONFLICT (value) DO UPDATE
  SET label = EXCLUDED.label,
      amount_ngn = EXCLUDED.amount_ngn,
      category = EXCLUDED.category,
      requires_dhl = EXCLUDED.requires_dhl,
      display_order = EXCLUDED.display_order,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();

CREATE INDEX IF NOT EXISTS transcript_options_active_order_idx
  ON transcript_options (is_active, display_order);

CREATE TABLE IF NOT EXISTS transcript_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campus TEXT NOT NULL,
  transcript_format TEXT NOT NULL,
  mode_of_admission TEXT NOT NULL,
  level_of_study TEXT NOT NULL,
  matriculation_number TEXT NOT NULL,
  document_type TEXT NOT NULL,
  first_name TEXT NOT NULL,
  other_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  month_of_graduation TEXT NOT NULL,
  year_of_graduation SMALLINT NOT NULL CHECK (year_of_graduation BETWEEN 1900 AND 2200),
  recipient_institution TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'dhl')),
  reference_number TEXT,
  receiver_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_reference TEXT,
  payment_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'email';

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS payment_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS transcript_requests_matriculation_number_idx
  ON transcript_requests (matriculation_number);

CREATE INDEX IF NOT EXISTS transcript_requests_status_idx
  ON transcript_requests (status);

CREATE INDEX IF NOT EXISTS transcript_requests_created_at_idx
  ON transcript_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS transcript_requests_email_idx
  ON transcript_requests (email);

CREATE TABLE IF NOT EXISTS dhl_delivery_rates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  continent TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  state_name TEXT NOT NULL,
  price_kobo INTEGER CHECK (price_kobo > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dhl_delivery_rates
  ADD COLUMN IF NOT EXISTS continent TEXT;

ALTER TABLE dhl_delivery_rates
  ADD COLUMN IF NOT EXISTS country_code TEXT;

ALTER TABLE dhl_delivery_rates
  ADD COLUMN IF NOT EXISTS country_name TEXT;

ALTER TABLE dhl_delivery_rates
  ALTER COLUMN price_kobo DROP NOT NULL;

UPDATE dhl_delivery_rates
SET continent = COALESCE(continent, 'Africa'),
    country_code = COALESCE(country_code, 'NG'),
    country_name = COALESCE(country_name, 'Nigeria');

ALTER TABLE dhl_delivery_rates
  ALTER COLUMN continent SET NOT NULL,
  ALTER COLUMN country_code SET NOT NULL,
  ALTER COLUMN country_name SET NOT NULL;

ALTER TABLE dhl_delivery_rates
  DROP CONSTRAINT IF EXISTS dhl_delivery_rates_state_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS dhl_delivery_rates_country_state_idx
  ON dhl_delivery_rates (country_code, state_name);

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS dhl_state TEXT;

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS dhl_delivery_price_kobo INTEGER;

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS dhl_continent TEXT;

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS dhl_country TEXT;

ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS dhl_country_code TEXT;

INSERT INTO dhl_delivery_rates (continent, country_code, country_name, state_name, price_kobo) VALUES
  ('African', 'NG', 'Nigeria', 'Abia', 2500000),
  ('African', 'NG', 'Nigeria', 'Adamawa', 2500000),
  ('African', 'NG', 'Nigeria', 'Akwa Ibom', 2500000),
  ('African', 'NG', 'Nigeria', 'Anambra', 2500000),
  ('African', 'NG', 'Nigeria', 'Bauchi', 2500000),
  ('African', 'NG', 'Nigeria', 'Bayelsa', 2500000),
  ('African', 'NG', 'Nigeria', 'Benue', 2500000),
  ('African', 'NG', 'Nigeria', 'Borno', 2500000),
  ('African', 'NG', 'Nigeria', 'Cross River', 2500000),
  ('African', 'NG', 'Nigeria', 'Delta', 2500000),
  ('African', 'NG', 'Nigeria', 'Ebonyi', 2500000),
  ('African', 'NG', 'Nigeria', 'Edo', 2500000),
  ('African', 'NG', 'Nigeria', 'Ekiti', 2500000),
  ('African', 'NG', 'Nigeria', 'Enugu', 2200000),
  ('African', 'NG', 'Nigeria', 'Gombe', 2500000),
  ('African', 'NG', 'Nigeria', 'Imo', 2500000),
  ('African', 'NG', 'Nigeria', 'Jigawa', 2500000),
  ('African', 'NG', 'Nigeria', 'Kaduna', 2500000),
  ('African', 'NG', 'Nigeria', 'Kano', 2500000),
  ('African', 'NG', 'Nigeria', 'Katsina', 2500000),
  ('African', 'NG', 'Nigeria', 'Kebbi', 2500000),
  ('African', 'NG', 'Nigeria', 'Kogi', 2500000),
  ('African', 'NG', 'Nigeria', 'Kwara', 2500000),
  ('African', 'NG', 'Nigeria', 'Lagos', 3000000),
  ('African', 'NG', 'Nigeria', 'Nasarawa', 2500000),
  ('African', 'NG', 'Nigeria', 'Niger', 2500000),
  ('African', 'NG', 'Nigeria', 'Ogun', 2500000),
  ('African', 'NG', 'Nigeria', 'Ondo', 2500000),
  ('African', 'NG', 'Nigeria', 'Osun', 2500000),
  ('African', 'NG', 'Nigeria', 'Oyo', 2500000),
  ('African', 'NG', 'Nigeria', 'Plateau', 2500000),
  ('African', 'NG', 'Nigeria', 'Rivers', 2500000),
  ('African', 'NG', 'Nigeria', 'Sokoto', 2500000),
  ('African', 'NG', 'Nigeria', 'Taraba', 2500000),
  ('African', 'NG', 'Nigeria', 'Yobe', 2500000),
  ('African', 'NG', 'Nigeria', 'Zamfara', 2500000),
  ('African', 'NG', 'Nigeria', 'Federal Capital Territory (Abuja)', 3000000)
ON CONFLICT (country_code, state_name) DO UPDATE
  SET price_kobo = EXCLUDED.price_kobo,
      continent = EXCLUDED.continent,
      country_name = EXCLUDED.country_name,
      updated_at = NOW();

UPDATE dhl_delivery_rates
SET price_kobo = CASE
      WHEN country_code <> 'NG' THEN 6800000
      WHEN state_name IN ('Lagos', 'Federal Capital Territory (Abuja)') THEN 3000000
      ELSE NULL
    END,
    updated_at = NOW();

UPDATE transcript_options
SET is_active = value NOT IN (
      'official-softcopy',
      'students-official-softcopy-outside-nigeria',
      'english-proficiency'
    ),
    updated_at = NOW();

CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assistant_messages_conversation_idx
  ON assistant_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS agent_activity (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_email TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  section TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_activity_session_action_section_unique UNIQUE (session_id, action, section)
);

CREATE INDEX IF NOT EXISTS agent_activity_created_at_idx
  ON agent_activity (created_at DESC);

CREATE INDEX IF NOT EXISTS agent_activity_actor_created_at_idx
  ON agent_activity (actor_user_id, created_at DESC);