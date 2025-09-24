import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ChatArea from "@/components/chathuman/ChatArea";

interface PageProps {
  params: { accountSlug: string };
}

export const dynamic = "force-dynamic";

export default async function ChatHumanPage({ params }: PageProps) {
  const { accountSlug } = params;

  const supabase = await createClient();

  // Resolve account_id by slug using Basejump RPC
  const { data: accountId, error } = await supabase.rpc("get_account_id", { slug: accountSlug });

  if (error || !accountId) {
    // If team slug not found, show 404 within dashboard layout context
    return notFound();
  }

  // Render a client component to handle realtime and interactions
  return <ChatArea accountId={accountId} accountSlug={accountSlug} />;
}
