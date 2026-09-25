import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  title: 'CYBER SWARM — Roguelike Bullet-Heaven',
  description: 'Um roguelike bullet-heaven cyberpunk. Sobreviva 20 minutos no ciberespaço!',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${jetbrainsMono.variable} font-mono bg-[#0A0A12] text-white overflow-hidden`}>
        {children}
        <ChunkLoadErrorHandler />
      </body>
    </html>
  )
}
