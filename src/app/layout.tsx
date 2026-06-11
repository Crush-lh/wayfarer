import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { NetworkStatus } from "@/components/ErrorBoundary";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Wayfarer - 智能旅行规划助手",
  description: "AI驱动的智能旅行规划平台，一键生成个性化旅行路线、景点推荐、美食攻略和预算规划。支持全国200+城市，让旅行更简单。",
  keywords: ["旅行规划", "旅游攻略", "AI旅行", "行程生成", "景点推荐", "美食攻略", "旅行助手"],
  authors: [{ name: "Wayfarer" }],
  openGraph: {
    title: "Wayfarer - 智能旅行规划助手",
    description: "输入目的地，AI自动生成完美旅行计划",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wayfarer - 智能旅行规划助手",
    description: "输入目的地，AI自动生成完美旅行计划",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://wayfarer.cc.cd",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <NetworkStatus />
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
