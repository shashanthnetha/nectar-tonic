import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NECTAR | Functional Wellness Tonic',
  description: 'Premium functional wellness tonic for peak vitality.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <svg style={{ display: 'none' }}>
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
        </svg>
        <div className="noise-overlay" style={{ filter: 'url(#noiseFilter)' }}></div>
        {children}
      </body>
    </html>
  )
}
