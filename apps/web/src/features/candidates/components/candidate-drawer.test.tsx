import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CandidateDrawer } from './candidate-drawer';
import { CandidateDetailPage } from './candidate-detail-page';

describe('CandidateDrawer', () => {
  it('uses the same profile layout and edit flow as the full detail page', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CandidateDrawer candidateId="candidate-09" open onClose={() => undefined} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Phạm Thu Hà' })).toBeInTheDocument();
    expect(screen.getByTestId('candidate-profile-layout')).toHaveClass('max-w-[72rem]');
    expect(screen.getByRole('dialog', { name: 'Hồ sơ ứng viên' }).querySelector('aside')).toHaveClass('lg:max-w-[calc(100vw-16rem)]');
    expect(screen.getByRole('tab', { name: 'Lộ trình cung ứng' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
    expect(screen.getByRole('dialog', { name: 'Chỉnh sửa hồ sơ ứng viên' })).toBeInTheDocument();
  });

  it('keeps the edit form structure identical to the full candidate profile', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const drawer = render(
      <QueryClientProvider client={client}>
        <CandidateDrawer candidateId="candidate-09" open onClose={() => undefined} />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
    const drawerDialog = await screen.findByRole('dialog', { name: 'Chỉnh sửa hồ sơ ứng viên' });
    const drawerForm = {
      className: drawerDialog.className,
      textboxes: within(drawerDialog).getAllByRole('textbox').map((field) => field.getAttribute('name')),
      comboboxes: within(drawerDialog).getAllByRole('combobox').map((field) => field.getAttribute('name')),
    };
    drawer.unmount();

    render(
      <QueryClientProvider client={client}>
        <CandidateDetailPage candidateId="candidate-09" />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId('candidate-profile-layout')).toHaveClass('max-w-[72rem]');
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
    const detailDialog = await screen.findByRole('dialog', { name: 'Chỉnh sửa hồ sơ ứng viên' });
    expect({
      className: detailDialog.className,
      textboxes: within(detailDialog).getAllByRole('textbox').map((field) => field.getAttribute('name')),
      comboboxes: within(detailDialog).getAllByRole('combobox').map((field) => field.getAttribute('name')),
    }).toEqual(drawerForm);
  });
});
