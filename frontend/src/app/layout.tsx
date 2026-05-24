import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ChatBot } from "@/components/ChatBot";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CareSphere - Your Health, Our Universe",
  description: "Find trusted caregivers for your loved ones globally",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          {children}
          <ChatBot />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
