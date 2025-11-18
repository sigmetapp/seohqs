import type { Metadata } from 'next'
import './globals.css'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import { ThemeProvider } from '@/lib/theme-context'
import { I18nProvider } from '@/lib/i18n-context'

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
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-gray-900 text-white flex flex-col min-h-screen transition-colors">
        <ThemeProvider>
          <I18nProvider>
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
