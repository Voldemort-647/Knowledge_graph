import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knowledge Graph Builder",
  description: "Visual Knowledge Graph Builder - Create, connect, and visualize entity relationships with AI-powered NLP.",
  keywords: ["Knowledge Graph", "React Flow", "AI", "NLP", "Visualization"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Knowledge Graph Builder",
    description: "Visual Knowledge Graph Builder with AI-powered NLP.",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Graph Builder",
    description: "Visual Knowledge Graph Builder with AI-powered NLP.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors closeButton toastOptions={{
            classNames: {
              success: '!border-teal-200 dark:!border-teal-800 !bg-teal-50 dark:!bg-teal-950/50 !text-teal-800 dark:!text-teal-100',
            },
          }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
