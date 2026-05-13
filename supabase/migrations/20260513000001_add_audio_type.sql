-- Add 'audio' to message_type enum
-- Note: PostgreSQL doesn't support adding enum values inside a transaction easily
-- So we use a check to see if it exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'message_type' AND e.enumlabel = 'audio'
    ) THEN
        ALTER TYPE public.message_type ADD VALUE 'audio';
    END IF;
END
$$;
