import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import { getConfig } from '@/lib/config';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className="antialiased"
        suppressHydrationWarning
        // suppressHydrationWarning suppresses known Ant Design SSR hydration
        // mismatches produced by ConfigProvider + AntdRegistry. The AntdRegistry
        // layer prop has been tried as a mitigation but did not fully resolve
        // the issue, so the suppression is kept as a pragmatic workaround.
      >
        <Providers>
          <Toaster position="top-right" closeButton expand richColors />
          {children}
        </Providers>
      </body>
    </html>
  );
}
