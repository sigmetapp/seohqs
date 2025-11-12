import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Google Indexing Service',
  description: 'Сервис для индексации ссылок в Google',
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
