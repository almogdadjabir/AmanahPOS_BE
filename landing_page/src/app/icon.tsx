import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: 'linear-gradient(135deg, #0F766E 0%, #0A5C55 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ color: 'white', fontSize: 18, fontWeight: 900, lineHeight: 1 }}>
          A
        </span>
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: '#F59E0B',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
