import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'

export const dynamic = 'force-dynamic';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: 'CYBER SWARM — Roguelike Bullet-Heaven',
  description: 'Um roguelike bullet-heaven cyberpunk. Sobreviva 20 minutos no ciberespaço!',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'CYBER SWARM',
    description: 'Roguelike bullet-heaven no ciberespaço. Armas auto-disparam, você foca em sobreviver!',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <body className={`${jetbrainsMono.variable} font-mono bg-[#0A0A12] text-white overflow-hidden`}>
        {children}
        <ChunkLoadErrorHandler />
      </body>
    </html>
  )
}
