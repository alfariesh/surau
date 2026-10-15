import { Skeleton } from "@heroui/react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CHAT_THREADS, getChatThread } from "../../../data/chat";
import { ChatPage } from "../../../views/chat-page";

export function generateStaticParams() {
  return CHAT_THREADS.map((thread) => ({ chatId: thread.id }));
}

export default function Page({ params }: { params: Promise<{ chatId: string }> }) {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatRoute params={params} />
    </Suspense>
  );
}

async function ChatRoute({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const thread = getChatThread(chatId);

  if (!thread) notFound();

  return <ChatPage thread={thread} />;
}

function ChatPageFallback() {
  return (
    <div
      aria-busy="true"
      className="flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden"
    >
      <span className="sr-only">Loading conversation</span>
      <div className="mx-auto flex w-full max-w-[714px] flex-1 flex-col gap-8 px-4 pt-10">
        <div className="flex justify-end">
          <Skeleton className="h-14 w-2/3 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <Skeleton className="h-4 w-3/5 rounded-md" />
        </div>
      </div>
      <div className="bg-background shrink-0 px-4 pb-4 pt-3">
        <Skeleton className="mx-auto h-16 w-full max-w-[714px] rounded-2xl" />
      </div>
    </div>
  );
}
