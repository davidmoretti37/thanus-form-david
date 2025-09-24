# ChatHuman — Chat corporativo nativo por empresa

Chat minimalista e moderno para equipes da mesma empresa, com:
- Salas por empresa (multi-tenant via `basejump.accounts`)
- Mensagens em tempo real (Supabase Realtime)
- Upload de arquivos (Supabase Storage, bucket privado `chat`)
- Gravação e envio de áudios (Web Audio/MediaRecorder)
- Botão “Chamar” (scaffold para chamadas por voz/vídeo)

Estado atual: MVP funcional no frontend + migração SQL e políticas RLS. As chamadas estão preparadas para implementação futura (LiveKit/WebRTC).

## Sumário técnico

- Banco:
  - Tabelas: `public.chat_rooms`, `public.chat_participants`, `public.chat_messages`, `public.chat_attachments`
  - Tipo enum: `public.chat_message_type` = `text|file|audio|system`
  - RLS:
    - Somente membros da conta acessam salas e participantes
    - Somente participantes leem/escrevem mensagens
    - Autor ou owner pode remover mensagens/participantes
  - Realtime: tabelas publicadas em `supabase_realtime`
  - Storage: bucket privado `chat` (políticas permissivas inicial/MVP)

- Frontend:
  - Página: `/ (dashboard)/(teamAccount)/[accountSlug]/chathuman`
  - Componentes:
    - `frontend/src/components/chathuman/ChatArea.tsx` (UI principal)
    - `frontend/src/lib/chathuman/api.ts` (utilitários Supabase: listar salas/mensagens, enviar, realtime, storage)
    - `frontend/src/lib/chathuman/types.ts` (tipos TS)
  - Estilo: shadcn/ui (Card, Button, Input, ScrollArea, Separator, Avatar), Tailwind

## Como aplicar a migração

1) Verifique a conexão do projeto com seu Supabase (já utilizado no projeto).
2) A migração foi adicionada em:
   - `backend/supabase/migrations/20250910121000_chathuman.sql`

3) Aplique a migração:
   - Opção A (Supabase Studio > SQL Editor): copie o conteúdo do arquivo e execute.
   - Opção B (CLI/automatizado, se você já usa pipeline de migrações deste repositório):
     - Utilize o mesmo mecanismo com que as demais migrações em `backend/supabase/migrations/` são aplicadas no seu ambiente.

4) Confirme no Supabase:
   - Tabelas criadas em `public`: `chat_rooms`, `chat_participants`, `chat_messages`, `chat_attachments`
   - Bucket `chat` em Storage

Observação: As políticas de Storage estão permissivas no MVP (qualquer autenticado pode ler/inserir/deletar no bucket `chat`). Para produção, recomendo migrar para URLs assinadas (já usamos createSignedUrl) e/ou regras baseadas em prefixo (`account_id/room_id/message_id/arquivo`) com validação mais estrita via Edge Functions ou backend.

## Como usar no Frontend

- Rota:
  - Acesse: `/{accountSlug}/chathuman` dentro do App Router de Team Account:
    - `/dashboard/[accountSlug]/chathuman`
  - A página resolve `account_id` pela RPC `get_account_id(slug)`.

- Primeiro acesso:
  - A UI cria (se não existir) a sala padrão “Geral” da empresa e garante o usuário atual como participante.

- Envio de mensagens:
  - Campo de texto com Enter para enviar
  - Botão de anexos (arquivos) → upload para Storage `chat/{account_id}/{room_id}/{message_id}/{filename}`
  - Gravação de áudio (WebM) com `MediaRecorder` e envio como anexo de áudio
  - Mensagens e anexos listados com link de download via signed URL

- Tempo real:
  - Subscrição em `chat_messages` por `room_id` (INSERT). Ao chegar novo evento, a UI refaz o fetch (para incluir anexos).

## Caminho de navegação

Atualmente, a rota está disponível. Para adicionar item no menu lateral do dashboard, inclua um link para:
```
/dashboard/[accountSlug]/chathuman
```
em seu componente de navegação (ex.: `sidebar`), se desejado.

## Roadmap (futuras melhorias)

- Chamadas (voz/vídeo)
  - Integração com LiveKit/Agora/WebRTC (sala por `room_id`, sinalização via Postgres/Supabase Realtime)
  - Controle de permissões e UI de sala com múltiplos participantes
- Segurança do Storage
  - Trocar políticas permissivas por:
    - uso exclusivo de URLs assinadas
    - prefixos obrigatórios por `account_id/room_id`
    - verificação em Edge Functions
- Threads, menções e reações
  - Estruturar threads via `reply_to_id`
  - @menções de usuários da conta
  - Reações com tabela auxiliar
- Presença/typing indicators
  - Canal Realtime por room para presença e estado de digitação
- DMs e grupos
  - `is_dm = true` + participantes 2 a 2
  - Componente para criar novas salas/dms
- Moderação e auditoria
  - Papéis em `chat_participants.role` (owner/admin/member)
  - Logs de exclusão, retention policy
- Mobile-friendly e acessibilidade
  - Ajustes de UI responsiva e teclas de atalho

## Detalhes de design (resumo)

- Minimalista e moderno com shadcn/ui
- Separação por empresa via `account_id` (Basejump) e RLS
- Realtime escalável (Postgres logical replication)
- Upload seguro via Storage + Signed URLs
- Áudio via `MediaRecorder` (WebM) — pronto para expandir

## Troubleshooting

- “Não vejo a sala”: verifique se a migração foi aplicada e se `get_account_id(slug)` retorna um UUID válido.
- “Sem realtime”: confirme que as tabelas foram adicionadas à publicação `supabase_realtime` (feito na migração).
- “Erro de permissão no Storage”: políticas do bucket `chat` estão permissivas no MVP; se alteradas para mais restritas, garanta o uso de Signed URLs (já implementado) e permissões de inserção no client.
- “Sem áudio”: permissões do navegador para microfone são necessárias.

## Arquivos criados/modificados

- Migração:
  - `backend/supabase/migrations/20250910121000_chathuman.sql`
- Frontend:
  - `frontend/src/lib/chathuman/types.ts`
  - `frontend/src/lib/chathuman/api.ts`
  - `frontend/src/components/chathuman/ChatArea.tsx`
  - `frontend/src/app/(dashboard)/(teamAccount)/[accountSlug]/chathuman/page.tsx`

Pronto para uso após aplicar a migração. Se quiser, podemos adicionar o link no sidebar e evoluir as chamadas em seguida.
