import './globals.css'
import { Dancing_Script, Quicksand } from 'next/font/google'
import { AuthProvider } from './contexts/AuthContext'
import { CornerProvider } from './contexts/CornerContext'

const dancingScript = Dancing_Script({ 
  subsets: ['latin'],
  variable: '--font-romantic',
  display: 'swap',
})

const quicksand = Quicksand({ 
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title: 'Our Little Corner 💖',
  description: 'A romantic digital scrapbook for our special memories',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} ${dancingScript.variable} font-body bg-background text-foreground antialiased`}>
        <AuthProvider>
          <CornerProvider>
            {children}
          </CornerProvider>
        </AuthProvider>
      </body>
    </html>
  )
}