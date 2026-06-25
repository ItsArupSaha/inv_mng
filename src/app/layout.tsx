
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { AppWithAuthProvider } from './auth-wrapper';


export const metadata: Metadata = {
  title: 'Smart Stock - Inventory Management',
  description: 'Sleek, smart, and easy inventory management for any business.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
          <AuthProvider>
            <AppWithAuthProvider>
              {children}
            </AppWithAuthProvider>
          </AuthProvider>
          <Toaster />
      </body>
    </html>
  );
}
