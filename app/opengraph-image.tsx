import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TurtleTalk – Chat with Shelly the Sea Turtle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
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
          background: 'linear-gradient(135deg, #0c4a6e 0%, #0e7490 40%, #155e75 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative wave circles */}
        <div
          style={{
            position: 'absolute',
            width: 700,
            height: 700,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.08)',
            top: -100,
            right: -150,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.06)',
            bottom: -120,
            left: -80,
          }}
        />

        {/* Turtle emoji */}
        <div style={{ fontSize: 140, lineHeight: 1, marginBottom: 24, display: 'flex' }}>
          🐢
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.03em',
            marginBottom: 16,
            display: 'flex',
          }}
        >
          TurtleTalk
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: 'rgba(255,255,255,0.82)',
            fontWeight: 600,
            textAlign: 'center',
            maxWidth: 780,
            display: 'flex',
          }}
        >
          Safe AI voice chat for children aged 5–13 🌊
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 48,
          }}
        >
          {['Voice conversations', 'Brave missions', 'Courage garden'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 100,
                padding: '10px 28px',
                fontSize: 26,
                color: 'white',
                fontWeight: 600,
                display: 'flex',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
