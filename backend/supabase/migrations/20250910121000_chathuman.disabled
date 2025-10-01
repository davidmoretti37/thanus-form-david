-- ============================================================
-- ChatHuman Schema (Multi-tenant chat per account)
-- Safe, idempotent migration for Supabase/Basejump stack
-- ============================================================

BEGIN;

-- 1) Types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'chat_message_type'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.chat_message_type AS ENUM ('text', 'file', 'audio', 'system');
    END IF;
END
$$;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id       uuid NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name             text,
    is_dm            boolean NOT NULL DEFAULT false,
    created_by       uuid NOT NULL REFERENCES auth.users(id),
    metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Timestamps trigger (uses Basejump helper)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'chat_rooms_set_timestamp'
    ) THEN
        CREATE TRIGGER chat_rooms_set_timestamp
        BEFORE INSERT OR UPDATE ON public.chat_rooms
        FOR EACH ROW EXECUTE PROCEDURE basejump.trigger_set_timestamps();
    END IF;
END
$$;

-- Participants per room
CREATE TABLE IF NOT EXISTS public.chat_participants (
    room_id     uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'member', -- future: enum ('member','admin')
    last_read_at timestamptz,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now(),
    CONSTRAINT chat_participants_pkey PRIMARY KEY (room_id, user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'chat_participants_set_timestamp'
    ) THEN
        CREATE TRIGGER chat_participants_set_timestamp
        BEFORE INSERT OR UPDATE ON public.chat_participants
        FOR EACH ROW EXECUTE PROCEDURE basejump.trigger_set_timestamps();
    END IF;
END
$$;

-- Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    room_id     uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES auth.users(id),
    type        public.chat_message_type NOT NULL DEFAULT 'text',
    content     text,            -- plain text; rich content could be json in future
    reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'chat_messages_set_timestamp'
    ) THEN
        CREATE TRIGGER chat_messages_set_timestamp
        BEFORE INSERT OR UPDATE ON public.chat_messages
        FOR EACH ROW EXECUTE PROCEDURE basejump.trigger_set_timestamps();
    END IF;
END
$$;

-- Attachments (file metadata stored in db; file bytes in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.chat_attachments (
    id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    message_id    uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    storage_path  text NOT NULL,           -- e.g. account_id/room_id/message_id/filename.ext
    file_name     text NOT NULL,
    content_type  text,
    size_bytes    bigint,
    duration_ms   integer,                 -- for audio attachments
    created_at    timestamptz DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_account_id ON public.chat_rooms(account_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON public.chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id ON public.chat_attachments(message_id);

-- 4) Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- 5) Policies
-- chat_rooms: account membership governs access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_rooms' AND policyname='rooms_select_by_account_members'
    ) THEN
        CREATE POLICY "rooms_select_by_account_members" ON public.chat_rooms
        FOR SELECT TO authenticated
        USING (
            basejump.has_role_on_account(account_id) = true
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_rooms' AND policyname='rooms_insert_by_account_members'
    ) THEN
        CREATE POLICY "rooms_insert_by_account_members" ON public.chat_rooms
        FOR INSERT TO authenticated
        WITH CHECK (
            -- creator must be account member and set created_by to self
            basejump.has_role_on_account(account_id) = true
            AND created_by = auth.uid()
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_rooms' AND policyname='rooms_update_by_owner_or_creator'
    ) THEN
        CREATE POLICY "rooms_update_by_owner_or_creator" ON public.chat_rooms
        FOR UPDATE TO authenticated
        USING (
            basejump.has_role_on_account(account_id) = true
            AND (created_by = auth.uid() OR basejump.has_role_on_account(account_id, 'owner') = true)
        )
        WITH CHECK (
            basejump.has_role_on_account(account_id) = true
            AND (created_by = auth.uid() OR basejump.has_role_on_account(account_id, 'owner') = true)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_rooms' AND policyname='rooms_delete_by_owner'
    ) THEN
        CREATE POLICY "rooms_delete_by_owner" ON public.chat_rooms
        FOR DELETE TO authenticated
        USING (basejump.has_role_on_account(account_id, 'owner') = true);
    END IF;
END
$$;

-- chat_participants: membership via room.account_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_participants' AND policyname='participants_select_by_account_members'
    ) THEN
        CREATE POLICY "participants_select_by_account_members" ON public.chat_participants
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.chat_rooms r
                WHERE r.id = chat_participants.room_id
                  AND basejump.has_role_on_account(r.account_id) = true
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_participants' AND policyname='participants_insert_by_account_members'
    ) THEN
        CREATE POLICY "participants_insert_by_account_members" ON public.chat_participants
        FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.chat_rooms r
                WHERE r.id = chat_participants.room_id
                  AND basejump.has_role_on_account(r.account_id) = true
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_participants' AND policyname='participants_update_by_account_members'
    ) THEN
        CREATE POLICY "participants_update_by_account_members" ON public.chat_participants
        FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.chat_rooms r
                WHERE r.id = chat_participants.room_id
                  AND basejump.has_role_on_account(r.account_id) = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.chat_rooms r
                WHERE r.id = chat_participants.room_id
                  AND basejump.has_role_on_account(r.account_id) = true
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_participants' AND policyname='participants_delete_by_owner'
    ) THEN
        CREATE POLICY "participants_delete_by_owner" ON public.chat_participants
        FOR DELETE TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.chat_rooms r
                WHERE r.id = chat_participants.room_id
                  AND basejump.has_role_on_account(r.account_id, 'owner') = true
            )
        );
    END IF;
END
$$;

-- chat_messages: only participants can read/write; updates only by author
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='messages_select_by_participants'
    ) THEN
        CREATE POLICY "messages_select_by_participants" ON public.chat_messages
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.chat_participants p
                WHERE p.room_id = chat_messages.room_id
                  AND p.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='messages_insert_by_participants'
    ) THEN
        CREATE POLICY "messages_insert_by_participants" ON public.chat_messages
        FOR INSERT TO authenticated
        WITH CHECK (
            author_id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM public.chat_participants p
                WHERE p.room_id = chat_messages.room_id
                  AND p.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='messages_update_by_author'
    ) THEN
        CREATE POLICY "messages_update_by_author" ON public.chat_messages
        FOR UPDATE TO authenticated
        USING (author_id = auth.uid())
        WITH CHECK (author_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='messages_delete_by_author_or_owner'
    ) THEN
        CREATE POLICY "messages_delete_by_author_or_owner" ON public.chat_messages
        FOR DELETE TO authenticated
        USING (
            author_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.chat_rooms r
                WHERE r.id = chat_messages.room_id
                  AND basejump.has_role_on_account(r.account_id, 'owner') = true
            )
        );
    END IF;
END
$$;

-- chat_attachments: governed by message/room membership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_attachments' AND policyname='attachments_select_by_participants'
    ) THEN
        CREATE POLICY "attachments_select_by_participants" ON public.chat_attachments
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.chat_messages m
                JOIN public.chat_participants p ON p.room_id = m.room_id
                WHERE m.id = chat_attachments.message_id
                  AND p.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_attachments' AND policyname='attachments_insert_by_author'
    ) THEN
        CREATE POLICY "attachments_insert_by_author" ON public.chat_attachments
        FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.chat_messages m
                WHERE m.id = chat_attachments.message_id
                  AND m.author_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_attachments' AND policyname='attachments_delete_by_author_or_owner'
    ) THEN
        CREATE POLICY "attachments_delete_by_author_or_owner" ON public.chat_attachments
        FOR DELETE TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.chat_messages m
                JOIN public.chat_rooms r ON r.id = m.room_id
                WHERE m.id = chat_attachments.message_id
                  AND (m.author_id = auth.uid() OR basejump.has_role_on_account(r.account_id, 'owner') = true)
            )
        );
    END IF;
END
$$;

-- 6) Realtime publication (supabase_realtime)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_attachments;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;

-- 7) Storage bucket for chat files (private)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'chat'
    ) THEN
        PERFORM storage.create_bucket('chat', public := false);
    END IF;
END
$$;

-- 8) Storage policies (MVP: any authenticated can access chat bucket)
-- NOTE: For stricter security, implement path-based restrictions with account_id/room_id prefixes.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'chat_files_read_auth'
    ) THEN
        CREATE POLICY "chat_files_read_auth" ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id = 'chat');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'chat_files_insert_auth'
    ) THEN
        CREATE POLICY "chat_files_insert_auth" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'chat');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'chat_files_delete_author_or_owner'
    ) THEN
        -- MVP: allow delete by any authenticated (can be tightened later via server-side routes)
        CREATE POLICY "chat_files_delete_author_or_owner" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'chat');
    END IF;
END
$$;

COMMIT;

-- ============================================================
-- Notes:
-- - Frontend should enforce path convention: {account_id}/{room_id}/{message_id}/{filename}
-- - Consider adding a unique constraint for 1:1 DM rooms in the future.
-- - Storage policies are permissive for MVP; consider replacing with signed URLs via backend.
-- ============================================================
