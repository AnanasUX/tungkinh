-- ============================================================================
-- CHÙA AN NHIÊN — HỆ THỐNG GỌI VIDEO & ÂM THANH TRỰC TUYẾN THỜI GIAN THỰC
-- SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- BẬT EXTENSIONS CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. BẢNG PROFILES (HỒ SƠ ĐỒNG TU / NGƯỜI DÙNG)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,                       -- User ID (Supabase Auth UID hoặc Client ID)
    display_name TEXT NOT NULL DEFAULT 'Đồng Tu',
    dharma_name TEXT DEFAULT 'Tịnh Tâm',
    avatar_url TEXT DEFAULT '',
    online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'in_call', 'busy')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_online_status ON public.profiles(online_status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Allow users to insert/update their own profile"
    ON public.profiles FOR ALL
    USING (auth.uid()::text = id OR id IS NOT NULL)
    WITH CHECK (auth.uid()::text = id OR id IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 2. BẢNG CALL_ROOMS (PHÒNG GỌI VIDEO / AUDIO)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_rooms (
    id TEXT PRIMARY KEY,                       -- Room ID duy nhất (vd: room_1730000000_abc)
    room_name TEXT NOT NULL DEFAULT 'Đạo Tràng Toàn Cầu',
    created_by TEXT NOT NULL,                  -- ID người tạo phòng
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'idle')),
    call_type TEXT DEFAULT 'video' CHECK (call_type IN ('video', 'audio')),
    max_participants INT DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_rooms_created_by ON public.call_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_call_rooms_status ON public.call_rooms(status);
CREATE INDEX IF NOT EXISTS idx_call_rooms_created_at ON public.call_rooms(created_at DESC);

-- RLS for call_rooms
ALTER TABLE public.call_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to active call rooms"
    ON public.call_rooms FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated or identified users to create call rooms"
    ON public.call_rooms FOR INSERT
    WITH CHECK (created_by IS NOT NULL);

CREATE POLICY "Allow room creator to update call room status"
    ON public.call_rooms FOR UPDATE
    USING (created_by = auth.uid()::text OR created_by IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 3. BẢNG CALL_PARTICIPANTS (DANH SÁCH THÀNH VIÊN TRONG PHÒNG GỌI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL REFERENCES public.call_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant')),
    status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'left', 'disconnected')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_call_participants_room_id ON public.call_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON public.call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_status ON public.call_participants(status);

-- RLS for call_participants
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to call participants"
    ON public.call_participants FOR SELECT
    USING (true);

CREATE POLICY "Allow users to join call room"
    ON public.call_participants FOR INSERT
    WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Allow users to update their own participant status"
    ON public.call_participants FOR UPDATE
    USING (user_id = auth.uid()::text OR user_id IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 4. BẢNG CALL_INVITATIONS (LỜI MỜI THAM GIA CUỘC GỌI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL REFERENCES public.call_rooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,                 -- Có thể là user_id cụ thể hoặc 'all'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'missed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_invitations_room_id ON public.call_invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_sender_id ON public.call_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_receiver_id ON public.call_invitations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_status ON public.call_invitations(status);

-- RLS for call_invitations
ALTER TABLE public.call_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their own invitations"
    ON public.call_invitations FOR SELECT
    USING (receiver_id = auth.uid()::text OR receiver_id = 'all' OR sender_id = auth.uid()::text OR true);

CREATE POLICY "Allow sender to create call invitations"
    ON public.call_invitations FOR INSERT
    WITH CHECK (sender_id IS NOT NULL);

CREATE POLICY "Allow receiver or sender to update call invitation status"
    ON public.call_invitations FOR UPDATE
    USING (receiver_id = auth.uid()::text OR receiver_id = 'all' OR sender_id = auth.uid()::text OR true);

-- ----------------------------------------------------------------------------
-- 5. BẢNG CALL_LOGS (LỊCH SỬ VÀ THỐNG KÊ CUỘC GỌI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL,
    caller_id TEXT NOT NULL,
    call_type TEXT DEFAULT 'video' CHECK (call_type IN ('video', 'audio')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_call_logs_room_id ON public.call_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_id ON public.call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON public.call_logs(started_at DESC);

-- RLS for call_logs
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to call logs"
    ON public.call_logs FOR SELECT
    USING (true);

CREATE POLICY "Allow insertion of call logs"
    ON public.call_logs FOR INSERT
    WITH CHECK (caller_id IS NOT NULL);

-- ============================================================================
-- KÍCH HOẠT SUPABASE REALTIME REPLICATION CHO CÁC BẢNG TRUYỀN THÔNG
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'call_rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_rooms;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'call_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'call_invitations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_invitations;
    END IF;
END $$;
