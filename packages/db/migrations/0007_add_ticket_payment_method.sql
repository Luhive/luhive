-- Manual payments: the attendee chooses card transfer (and uploads a receipt)
-- or cash at the door. Checkila orders leave payment_method null.

ALTER TABLE public.ticket_orders
  ADD COLUMN payment_method text,
  ADD COLUMN receipt_path text,
  ADD COLUMN receipt_uploaded_at timestamp with time zone,
  ADD CONSTRAINT ticket_orders_payment_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('card_transfer', 'cash'));

COMMENT ON COLUMN public.ticket_orders.receipt_path IS
  'Object path in the private payment-receipts bucket. NULL until a receipt is uploaded.';

-- Private bucket, no policies: only the service role can read or write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;
