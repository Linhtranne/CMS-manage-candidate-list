import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { conversationDetails } from '@/mocks/fixtures/mail';
import { EmailComposer } from './email-composer';

describe('EmailComposer', () => {
  it('blocks a template when required context is missing', async () => {
    const conversation = { ...conversationDetails[1], applicationId: null };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><EmailComposer conversation={conversation} /></QueryClientProvider>);
    await userEvent.selectOptions(screen.getByLabelText('Mẫu email'), 'INTERVIEW_INVITATION');
    await userEvent.type(screen.getByLabelText('Nội dung'), 'Xin chào');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi email' }));
    expect(screen.getByText('Thiếu thời gian phỏng vấn')).toBeVisible();
  });
});
