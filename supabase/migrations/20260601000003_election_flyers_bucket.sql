-- Storage bucket for election flyers
INSERT INTO storage.buckets (id, name, public)
VALUES ('election-flyers', 'election-flyers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_election_flyers" ON storage.objects FOR SELECT
  USING (bucket_id = 'election-flyers');

CREATE POLICY "public_write_election_flyers" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'election-flyers');

CREATE POLICY "public_update_election_flyers" ON storage.objects FOR UPDATE
  USING (bucket_id = 'election-flyers');

CREATE POLICY "public_delete_election_flyers" ON storage.objects FOR DELETE
  USING (bucket_id = 'election-flyers');
