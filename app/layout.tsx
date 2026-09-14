import type { ReactNode } from 'react'

export const metadata = {
  title: 'ProfitLogic MailOps',
  description: 'Driverless Ops email control plane for ProfitLogic',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
