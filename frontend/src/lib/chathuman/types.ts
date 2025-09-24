export type UUID = string;

export interface ChatRoom {
  id: UUID;
  account_id: UUID;
  name: string | null;
  is_dm: boolean;
  created_by: UUID;
  metadata: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatParticipant {
  room_id: UUID;
  user_id: UUID;
  role: 'member' | 'admin' | string;
  last_read_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ChatMessageType = 'text' | 'file' | 'audio' | 'system';

export interface ChatAttachment {
  id: UUID;
  message_id: UUID;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  duration_ms: number | null;
  created_at: string | null;
}

export interface ChatMessage {
  id: UUID;
  room_id: UUID;
  author_id: UUID;
  type: ChatMessageType;
  content: string | null;
  reply_to_id: UUID | null;
  created_at: string | null;
  updated_at: string | null;
  chat_attachments?: ChatAttachment[]; // when joined
}

export interface AccountInfo {
  account_id: UUID;
  account_role: 'owner' | 'member';
  is_primary_owner: boolean;
  personal_account: boolean;
  name: string | null;
  slug: string | null;
}

export interface SendMessageOptions {
  files?: File[];
  audioBlob?: Blob; // for voice notes
  audioFileName?: string;
  replyToId?: UUID | null;
}

export interface MessageWithAuthor extends ChatMessage {
  author?: {
    id: UUID;
    email?: string;
    name?: string;
  };
}
