/* Core ChatHuman API utilities using Supabase client-side SDK */
"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  ChatAttachment,
  ChatMessage,
  ChatRoom,
  UUID,
  SendMessageOptions,
} from "./types";

/* Helpers */
async function getCurrentUserId(): Promise<UUID> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Usuário não autenticado");
  return user.id as UUID;
}

export async function getAccountIdBySlug(accountSlug: string): Promise<UUID | null> {
  // Prefer server to fetch account id; kept here for fallback client usage (requires RPC access).
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_account_id", {
    slug: accountSlug,
  });
  if (error) {
    console.error("[ChatHuman] getAccountIdBySlug error:", error);
    return null;
  }
  return data as UUID | null;
}

/* Rooms */
export async function listRooms(accountId: UUID): Promise<ChatRoom[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[ChatHuman] listRooms error:", error);
    return [];
  }
  return (data as unknown as ChatRoom[]) || [];
}

export async function ensureDefaultRoom(accountId: UUID): Promise<ChatRoom> {
  const supabase = createClient();
  const me = await getCurrentUserId();

  // Try to find existing default/general room
  const { data: existing, error: existingErr } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("account_id", accountId)
    .eq("is_dm", false)
    .order("created_at", { ascending: true })
    .limit(1);
  if (!existingErr && existing && existing.length > 0) {
    // Ensure I'm a participant
    await supabase
      .from("chat_participants")
      .upsert(
        {
          room_id: existing[0].id,
          user_id: me,
          role: "member",
        },
        { onConflict: "room_id,user_id" }
      );
    return existing[0] as unknown as ChatRoom;
  }

  // Create new "Geral" room
  const { data: newRoom, error: createErr } = await supabase
    .from("chat_rooms")
    .insert({
      account_id: accountId,
      name: "Geral",
      is_dm: false,
      created_by: me,
      metadata: {},
    })
    .select("*")
    .single();

  if (createErr || !newRoom) {
    console.error("[ChatHuman] ensureDefaultRoom create error:", createErr);
    throw new Error("Não foi possível criar a sala padrão");
  }

  // Add current user as participant
  const { error: partErr } = await supabase.from("chat_participants").insert({
    room_id: newRoom.id,
    user_id: me,
    role: "member",
  });
  if (partErr) {
    // Might already exist; ignore specific conflict
    console.warn("[ChatHuman] participant insert warning:", partErr.message);
  }

  return newRoom as unknown as ChatRoom;
}

/* Messages */
export async function listMessages(roomId: UUID): Promise<(ChatMessage & { chat_attachments?: ChatAttachment[] })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, chat_attachments(*)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[ChatHuman] listMessages error:", error);
    return [];
  }
  return (data as any[]) || [];
}

export type RealtimeUnsubscribe = () => void;

export function subscribeToMessages(roomId: UUID, onInsert: (msg: ChatMessage) => void): RealtimeUnsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel(`chat_room_${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
      (payload) => {
        onInsert(payload.new as ChatMessage);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // console.log("[ChatHuman] Realtime subscribed", roomId);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/* Storage helpers */
export async function createSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("chat").createSignedUrl(storagePath, expiresInSeconds);
  if (error) {
    console.error("[ChatHuman] createSignedUrl error:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

async function uploadAttachment(
  accountId: UUID,
  roomId: UUID,
  messageId: UUID,
  file: File
): Promise<{ path: string; file_name: string; content_type: string | null; size_bytes: number | null }> {
  const supabase = createClient();
  const storagePath = `${accountId}/${roomId}/${messageId}/${encodeURIComponent(file.name)}`;

  const { error: upErr } = await supabase.storage.from("chat").upload(storagePath, file, {
    upsert: false,
  });
  if (upErr) {
    console.error("[ChatHuman] uploadAttachment error:", upErr);
    throw upErr;
  }
  return {
    path: storagePath,
    file_name: file.name,
    content_type: file.type || null,
    size_bytes: file.size ?? null,
  };
}

/* Send message with optional files/audio */
export async function sendMessage(
  accountId: UUID,
  roomId: UUID,
  content: string,
  opts?: SendMessageOptions
): Promise<ChatMessage> {
  const supabase = createClient();
  const authorId = await getCurrentUserId();

  const { data: message, error: msgErr } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      author_id: authorId,
      type: opts?.audioBlob ? "audio" : opts?.files && opts.files.length > 0 ? "file" : "text",
      content: content || null,
      reply_to_id: opts?.replyToId ?? null,
    })
    .select("*")
    .single();

  if (msgErr || !message) {
    console.error("[ChatHuman] sendMessage insert error:", msgErr);
    throw new Error("Não foi possível enviar a mensagem");
  }

  // Handle attachments (files and/or audio)
  const attachments: {
    storage_path: string;
    file_name: string;
    content_type: string | null;
    size_bytes: number | null;
    duration_ms?: number | null;
  }[] = [];

  // Files
  if (opts?.files && opts.files.length > 0) {
    for (const f of opts.files) {
      const info = await uploadAttachment(accountId, roomId, message.id, f);
      attachments.push({
        storage_path: info.path,
        file_name: info.file_name,
        content_type: info.content_type,
        size_bytes: info.size_bytes,
      });
    }
  }

  // Audio (Blob)
  if (opts?.audioBlob) {
    const audioName = opts.audioFileName || `audio-${Date.now()}.webm`;
    const audioFile = new File([opts.audioBlob], audioName, { type: opts.audioBlob.type || "audio/webm" });
    const info = await uploadAttachment(accountId, roomId, message.id, audioFile);
    attachments.push({
      storage_path: info.path,
      file_name: info.file_name,
      content_type: info.content_type,
      size_bytes: info.size_bytes,
      // duration_ms could be set client-side if measured, leaving null for MVP
      duration_ms: null,
    });
  }

  if (attachments.length > 0) {
    const { error: attErr } = await supabase
      .from("chat_attachments")
      .insert(
        attachments.map((a) => ({
          message_id: message.id,
          storage_path: a.storage_path,
          file_name: a.file_name,
          content_type: a.content_type,
          size_bytes: a.size_bytes,
          duration_ms: a.duration_ms ?? null,
        }))
      );
    if (attErr) {
      console.error("[ChatHuman] chat_attachments insert error:", attErr);
      // Don't throw to avoid losing the text message; the UI can show a warning
    }
  }

  return message as ChatMessage;
}

/* Ensure participant for current user (idempotent) */
export async function ensureParticipant(roomId: UUID): Promise<void> {
  const supabase = createClient();
  const me = await getCurrentUserId();
  await supabase
    .from("chat_participants")
    .upsert(
      {
        room_id: roomId,
        user_id: me,
        role: "member",
      },
      { onConflict: "room_id,user_id" }
    );
}
