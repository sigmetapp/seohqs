import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TabsGen',
}

export default function TabsGenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
