import type { Metadata } from 'next'
import './globals.css'
import Navigation from './components/Navigation'

export const metadata: Metadata = {
  title: 'SEO Tools - Индексация, Ссылочный профиль, Панель сайтов',
  description: 'Инструменты для SEO: индексация ссылок, управление ссылочным профилем, мониторинг сайтов',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="bg-gray-900 text-white">
        <Navigation />
        {children}
      </body>
    </html>
  )
}
