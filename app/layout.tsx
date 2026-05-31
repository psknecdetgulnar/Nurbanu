import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TAKBIS Okuyucu',
  description: 'Web Tapu / TAKBIS belgelerinizi saniyede Excel\'e çevirin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
