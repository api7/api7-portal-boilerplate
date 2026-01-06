import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import { getConfig } from '@/lib/config';

const { app } = getConfig();

export const metadata: Metadata = {
  metadataBase: new URL(app.baseURL!),
  title: {
    default: app.name!,
    template: `%s | ${app.name}`,
  },
  description: app.desc!,
  openGraph: {
    type: 'website',
    siteName: app.name,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Toaster position="top-right" closeButton expand richColors />
          {children}
        </Providers>
      </body>
    </html>
  );
}
