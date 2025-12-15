import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Logchecker',
}

export default function LogcheckerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
