import { ChatInterface } from "@/components/chat/chat-interface";

export default function Home() {
  return (
    <div className="flex h-screen w-full">
      <main className="flex-1 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  );
}
