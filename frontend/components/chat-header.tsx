'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon, VercelIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import type { Session } from 'next-auth';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
  useVanaBackend,
  vanaAvailable,
  isVanaConnected,
  onToggleVana,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  useVanaBackend?: boolean;
  vanaAvailable?: boolean | null;
  isVanaConnected?: boolean;
  onToggleVana?: (enabled: boolean) => void;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      {/* Vana Backend Toggle */}
      {!isReadonly && vanaAvailable !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={useVanaBackend ? "default" : "outline"}
              size="sm"
              className={`order-1 md:order-3 h-[34px] px-3 ${
                isVanaConnected 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : useVanaBackend && vanaAvailable
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  : ''
              }`}
              onClick={() => onToggleVana?.(!useVanaBackend)}
              disabled={!vanaAvailable}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isVanaConnected
                  ? 'bg-green-300 animate-pulse'
                  : vanaAvailable
                  ? 'bg-blue-300'
                  : 'bg-red-300'
              }`} />
              Vana AI
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {vanaAvailable === false 
              ? 'Vana backend unavailable'
              : isVanaConnected
              ? 'Connected to Vana AI with multi-agent support'
              : useVanaBackend
              ? 'Using Vana AI backend'
              : 'Switch to Vana AI for advanced multi-agent features'
            }
          </TooltipContent>
        </Tooltip>
      )}

      <Button
        className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-4 md:ml-auto"
        asChild
      >
        <Link
          href={`https://vercel.com/new/clone?repository-url=https://github.com/vercel/ai-chatbot&env=AUTH_SECRET&envDescription=Learn more about how to get the API Keys for the application&envLink=https://github.com/vercel/ai-chatbot/blob/main/.env.example&demo-title=AI Chatbot&demo-description=An Open-Source AI Chatbot Template Built With Next.js and the AI SDK by Vercel.&demo-url=https://chat.vercel.ai&products=[{"type":"integration","protocol":"ai","productSlug":"grok","integrationSlug":"xai"},{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"},{"type":"integration","protocol":"storage","productSlug":"upstash-kv","integrationSlug":"upstash"},{"type":"blob"}]`}
          target="_noblank"
        >
          <VercelIcon size={16} />
          Deploy with Vercel
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
