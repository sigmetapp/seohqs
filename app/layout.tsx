import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Affiliate Catalog',
  description: 'Каталог партнёрских программ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
