import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "MA Installment App",
    description: "Professional installment management system for small businesses",
    manifest: "/manifest.json",
    themeColor: "#3b82f6",
    viewport: {
        width: "device-width",
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "MA Installment",
    },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <head>
            <link rel="icon" href="/favicon.ico" />
            <link rel="apple-touch-icon" href="/icon-192.png" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        </head>
        <body className="antialiased">
        {children}
        </body>
        </html>
    );
}