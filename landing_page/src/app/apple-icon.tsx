import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: 'linear-gradient(135deg, #0F766E 0%, #0A5C55 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ color: 'white', fontSize: 96, fontWeight: 900, lineHeight: 1 }}>
          A
        </span>
        <div
          style={{
            position: 'absolute',
            bottom: 22,
            right: 22,
            width: 32,
            height: 32,
            borderRadius: 9999,
            background: '#F59E0B',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
