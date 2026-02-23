import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { WatchlistProvider } from "@/contexts/WatchlistContext";
import { Navigation } from "@/components/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SceneStack",
  description: "Your personal movie tracking app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <WatchlistProvider>
            <Navigation />
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster
              position="top-right"
              theme="dark"
              duration={5000}
              closeButton
              toastOptions={{
                style: {
                  background: 'oklch(0.20 0.025 240)',
                  border: '1px solid oklch(0.30 0.025 240)',
                  color: 'oklch(0.98 0 0)',
                },
                className: 'custom-toast',
              }}
            />
          </WatchlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}