import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';
import { InstallButton } from '@/components/InstallButton';

const inter = Inter({ subsets:  ['latin'] });

export const metadata: Metadata = {
    title: 'MA Electronics Installment',
    description: 'Manage customer installment payments with ease',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'MA Electronics Installment',
    },
    formatDetection: {
        telephone: false,
    },
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React. ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <meta name="theme-color" content="#0284c7" />
            <meta name="mobile-web-app-capable" content="true" />
            <meta name="apple-mobile-web-app-capable" content="true" />
            <link rel="icon" href="/favicon.ico" />
        </head>
        <body className={inter.className}>
        {children}
        <script
            dangerouslySetInnerHTML={{
                __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
            }}
        />
        </body>
        </html>
    );
}