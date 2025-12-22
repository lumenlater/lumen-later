import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'NeonAI - AI API Credits';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: 64, fontWeight: 700, color: 'white' }}>
            NeonAI
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#94a3b8',
            marginBottom: 60,
          }}
        >
          Power Your Apps with AI
        </div>

        {/* Price */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '20px 40px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 700, color: 'white' }}>100</span>
          <span style={{ fontSize: 28, color: '#00d4ff' }}>USDC</span>
          <span style={{ fontSize: 20, color: '#64748b' }}>/ 1M credits</span>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 18,
            color: '#64748b',
          }}
        >
          Powered by LumenLater · Buy Now, Pay Later
        </div>
      </div>
    ),
    { ...size }
  );
}
