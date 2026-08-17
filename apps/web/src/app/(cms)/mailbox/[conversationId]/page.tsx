import { MailboxPage } from '@/features/mail/components/mailbox-page';

export default async function MailboxConversationRoute({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <MailboxPage initialConversationId={conversationId} />;
}
