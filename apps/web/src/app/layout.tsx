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
      <body><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-panel focus:px-4 focus:py-3 focus:text-accent focus:shadow-panel">Bỏ qua đến nội dung chính</a>{children}</body>
    </html>
  );
}
