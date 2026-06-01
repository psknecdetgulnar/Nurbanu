import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Değerleme Araçları',
  description: 'Gayrimenkul değerleme uzmanları için araç platformu. TAKBIS belgelerini saniyede rapora hazır çıktıya çevirin.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${GeistSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      {/* Anti-FOUC: set theme class before first paint */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}` }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
