import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InboxPilot — TikTok→Shopify Commerce Intelligence',
  description: 'Discover trending TikTok Shop products, sync to Shopify, and launch Meta ad campaigns — all from one dashboard.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  )
}
