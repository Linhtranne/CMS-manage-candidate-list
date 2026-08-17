import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { conversationDetails } from '@/mocks/fixtures/mail';
import { AttachmentRow } from './attachment-row';
import { LinkConversationDialog } from './link-conversation-dialog';

describe('mail safety states', () => {
  it('requires explicit candidate selection and blocks quarantined downloads', () => {
    const conversation = conversationDetails[1];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LinkConversationDialog conversation={conversation} open onClose={() => undefined} /></QueryClientProvider>);
    expect(screen.getByRole('button', { name: 'Xác nhận liên kết' })).toBeDisabled();
    render(<AttachmentRow attachment={conversation.attachments[0]} />);
    expect(screen.queryByRole('link', { name: /Tải xuống/ })).not.toBeInTheDocument();
    expect(screen.getByText('Bị cách ly')).toBeVisible();
  });
});
