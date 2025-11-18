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
      <body className="bg-gray-900 text-white flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <footer className="bg-gray-800 border-t border-gray-700 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-400">
              Все права защищены - Seohqs [SEO gambling]
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
