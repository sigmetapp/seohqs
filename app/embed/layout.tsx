import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Slotget',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
