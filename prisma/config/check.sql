ALTER TABLE "messages" ADD CONSTRAINT "sender_check" CHECK ((sender_id IS NOT NULL AND virtual_sender_id IS NULL) OR (sender_id IS NULL AND virtual_sender_id IS NOT NULL));
