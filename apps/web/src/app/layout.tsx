import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Candidate Supply CMS',
  description: 'CMS nội bộ quản lý tuyển dụng và cung ứng nhân sự sang Nhật'
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
