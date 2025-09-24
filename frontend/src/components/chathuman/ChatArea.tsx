"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureDefaultRoom, ensureParticipant, listMessages, listRooms, sendMessage, subscribeToMessages, createSignedUrl } from "@/lib/chathuman/api";
import type { ChatAttachment, ChatMessage, ChatRoom, UUID } from "@/lib/chathuman/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Mic, Send, Phone, Loader2, X, Download } from "lucide-react";

// Props from the server route
export default function ChatArea({ accountId, accountSlug }: { accountId: UUID; accountSlug: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<UUID | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Compose minimalistic, modern layout aligned with project styles (shadcn/ui + Tailwind)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted && user) setUserId(user.id as UUID);

      // Ensure at least one default room and me as participant
      try {
        const room = await ensureDefaultRoom(accountId);
        await ensureParticipant(room.id);
      } catch (e) {
        console.warn("[ChatHuman] ensure default room/participant:", e);
      }

      const fetched = await listRooms(accountId);
      if (!mounted) return;
      setRooms(fetched);
      setCurrentRoom((prev) => prev ?? fetched[0] ?? null);
      setLoadingRooms(false);
    })();
    return () => { mounted = false; };
  }, [accountId]);

  // Load messages for the current room
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let mounted = true;
    (async () => {
      if (!currentRoom) return;
      setLoadingMessages(true);
      await ensureParticipant(currentRoom.id);
      const initial = await listMessages(currentRoom.id);
      if (!mounted) return;
      setMessages(initial);

      // Subscribe to realtime inserts, then refetch (ensures attachments are included)
      unsub = subscribeToMessages(currentRoom.id, async () => {
        const refreshed = await listMessages(currentRoom.id);
        if (!mounted) return;
        setMessages(refreshed);
      });
      setLoadingMessages(false);
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [currentRoom?.id]);

  const handleSelectRoom = useCallback(async (room: ChatRoom) => {
    setCurrentRoom(room);
  }, []);

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      <aside className="hidden md:flex w-64 flex-col">
        <Card className="flex h-full flex-col overflow-hidden">
          <div className="p-4">
            <h2 className="text-sm font-medium text-muted-foreground">ChatHuman</h2>
            <div className="text-xs text-muted-foreground/70">Empresa: {accountSlug}</div>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loadingRooms ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando salas...
                </div>
              ) : rooms.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">Nenhuma sala</div>
              ) : (
                rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRoom(r)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent transition ${
                      currentRoom?.id === r.id ? "bg-accent" : ""
                    }`}
                  >
                    {r.name || (r.is_dm ? "Mensagem direta" : "Sala")}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </aside>
      <main className="flex-1">
        <Card className="flex h-full flex-col overflow-hidden">
          <ChatHeader roomName={currentRoom?.name || "Geral"} />
          <Separator />
          <div className="flex-1">
            <MessageList
              messages={messages}
              userId={userId}
              loading={loadingMessages}
            />
          </div>
          <Separator />
          {currentRoom ? (
            <Composer accountId={accountId} roomId={currentRoom.id} onSent={() => {}} />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Selecione uma sala para começar</div>
          )}
        </Card>
      </main>
    </div>
  );
}

function ChatHeader({ roomName }: { roomName: string }) {
  const [calling, setCalling] = useState(false);
  const handleCall = () => {
    // Scaffold for future WebRTC/LiveKit integration
    setCalling(true);
    setTimeout(() => setCalling(false), 800);
  };
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="font-medium">{roomName}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCall} disabled={calling} title="Iniciar chamada (em breve)">
          {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">Chamar</span>
        </Button>
      </div>
    </div>
  );
}

function MessageList({ messages, userId, loading }: { messages: ChatMessage[]; userId: UUID | null; loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando mensagens...
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-sm text-muted-foreground">Sem mensagens. Envie a primeira!</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={userId != null && m.author_id === userId} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function MessageBubble({ message, isMine }: { message: ChatMessage & { chat_attachments?: ChatAttachment[] }; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm border ${
          isMine ? "bg-primary text-primary-foreground border-primary/20" : "bg-muted/40 border-border"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.chat_attachments && message.chat_attachments.length > 0 && (
          <div className={`mt-2 grid gap-2 ${isMine ? "text-primary-foreground" : "text-foreground"}`}>
            {message.chat_attachments.map((a) => (
              <AttachmentItem key={a.id} attachment={a} />
            ))}
          </div>
        )}
        <div className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {new Date(message.created_at || Date.now()).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: ChatAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const signed = await createSignedUrl(attachment.storage_path);
      if (mounted) setUrl(signed);
    })();
    return () => { mounted = false; };
  }, [attachment.storage_path]);

  const isAudio = (attachment.content_type || "").startsWith("audio/");
  return (
    <div className="flex items-center gap-2 text-xs">
      <Download className="h-3.5 w-3.5" />
      {isAudio && url ? (
        <audio controls src={url} className="w-full" />
      ) : url ? (
        <a href={url} target="_blank" rel="noreferrer" className="underline hover:no-underline">
          {attachment.file_name}
        </a>
      ) : (
        <span className="text-muted-foreground">Gerando link...</span>
      )}
    </div>
  );
}

type PendingFile = { file: File; id: string };

function Composer({ accountId, roomId, onSent }: { accountId: UUID; roomId: UUID; onSent?: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasAttachments = files.length > 0 || !!audioBlob;

  const onPickFiles = () => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const toAdd: PendingFile[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (f) toAdd.push({ file: f, id: `${f.name}-${f.size}-${Date.now()}-${i}` });
    }
    setFiles((prev) => [...prev, ...toAdd]);
    // reset input
    e.currentTarget.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAudio = () => setAudioBlob(null);

  const doSend = async () => {
    if (sending) return;
    if (!text.trim() && files.length === 0 && !audioBlob) return;

    try {
      setSending(true);
      await sendMessage(
        accountId,
        roomId,
        text.trim(),
        {
          files: files.map((f) => f.file),
          audioBlob: audioBlob || undefined,
          audioFileName: audioBlob ? `voz-${Date.now()}.webm` : undefined,
        }
      );
      setText("");
      setFiles([]);
      setAudioBlob(null);
      onSent?.();
    } catch (e) {
      console.error("[ChatHuman] send error:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3">
      {hasAttachments && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="max-w-[220px] truncate">{f.file.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(f.id)} title="Remover">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {audioBlob && (
            <div className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              <Mic className="h-3.5 w-3.5" />
              <span>Áudio gravado</span>
              <audio controls src={URL.createObjectURL(audioBlob)} className="h-7" />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearAudio} title="Remover áudio">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" title="Anexar arquivos" onClick={onPickFiles}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFilesSelected}
        />
        <AudioRecorder onRecorded={setAudioBlob} disabled={sending} />
        <Input
          placeholder="Escreva uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              doSend();
            }
          }}
          className="flex-1"
        />
        <Button onClick={doSend} disabled={sending} title="Enviar">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">Enviar</span>
        </Button>
      </div>
    </div>
  );
}

function AudioRecorder({ onRecorded, disabled }: { onRecorded: (b: Blob) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const start = async () => {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecorded(blob);
        // stop tracks
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error("[ChatHuman] mic permission / record error:", e);
    }
  };

  const stop = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <Button
      variant={recording ? "destructive" : "outline"}
      size="icon"
      onClick={recording ? stop : start}
      title={recording ? "Parar gravação" : "Gravar áudio"}
      disabled={disabled}
    >
      {recording ? <SquareIcon /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}

function SquareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

// Minimal Avatar component fallback (using shadcn Avatar)
function UserAvatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [name]);
  return (
    <Avatar className="h-6 w-6">
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
