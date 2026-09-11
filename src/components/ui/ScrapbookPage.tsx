import type { CSSProperties } from 'react';
import { DOODLES } from '../../journal/constants';
import type { Decoration, JournalEntry, Palette, PhotoSpec } from '../../journal/types';
import { hexA } from '../../journal/helpers';
import { FlatPageImage } from './FlatPageImage';

function textureStyle(name: string, palette: Palette): CSSProperties {
  const style: CSSProperties = { backgroundColor: palette.bg };
  if (name === 'grid-paper') {
    style.backgroundImage = `repeating-linear-gradient(0deg, transparent, transparent 22px, ${hexA(palette.ink, 0.07)} 23px), repeating-linear-gradient(90deg, transparent, transparent 22px, ${hexA(palette.ink, 0.07)} 23px)`;
  } else if (name === 'dot-paper') {
    style.backgroundImage = `radial-gradient(${hexA(palette.ink, 0.15)} 1.2px, transparent 1.6px)`;
    style.backgroundSize = '16px 16px';
  } else if (name === 'kraft') {
    style.backgroundImage = `repeating-linear-gradient(115deg, ${hexA(palette.ink, 0.035)} 0px, transparent 2px, transparent 6px)`;
  } else if (name === 'watercolor') {
    style.backgroundImage = `radial-gradient(circle at 20% 25%, ${hexA(palette.accent, 0.18)}, transparent 40%), radial-gradient(circle at 80% 75%, ${hexA(palette.tapes[0], 0.22)}, transparent 45%), radial-gradient(circle at 70% 20%, ${hexA(palette.tapes[1], 0.18)}, transparent 40%)`;
  }
  return style;
}

function DecorationNode({ d }: { d: Decoration }) {
  if (d.type === 'tape') {
    return (
      <div
        className="tape"
        style={{
          left: d.left + '%',
          top: d.top + '%',
          width: d.size + 'px',
          height: d.size * 0.38 + 'px',
          background: d.color,
          transform: `rotate(${d.rotation}deg)`,
        }}
      />
    );
  }
  return (
    <div
      className="doodle"
      style={{
        left: d.left + '%',
        top: d.top + '%',
        width: d.size + 'px',
        height: d.size + 'px',
        color: d.color,
        transform: `rotate(${d.rotation}deg)`,
      }}
      dangerouslySetInnerHTML={{ __html: DOODLES[d.type as keyof typeof DOODLES] }}
    />
  );
}

function PhotoFrame({ src, spec }: { src: string; spec: PhotoSpec }) {
  return (
    <div
      className={'photo-frame shape-' + spec.shape}
      style={{
        left: spec.left + '%',
        top: spec.top + '%',
        width: spec.width + '%',
        height: spec.height + '%',
        transform: `rotate(${spec.rotation}deg)`,
        zIndex: 10 + (spec.z ?? 0),
        clipPath: spec.shape === 'torn' && spec.tornClip ? spec.tornClip : undefined,
      }}
    >
      <img src={src} alt="" />
      {spec.tape && (
        <div
          className="tape"
          style={{
            left: '50%',
            top: '-8px',
            width: '34px',
            height: '14px',
            background: spec.tapeColor || '#e8c4c4',
            transform: `translateX(-50%) rotate(${(spec.z ?? 0) % 2 === 0 ? -8 : 8}deg)`,
          }}
        />
      )}
    </div>
  );
}

export function ScrapbookPage({ entry, maxW, maxH }: { entry: JournalEntry; maxW?: number; maxH?: number }) {
  // AI-rendered flattened image takes priority over the procedural CSS layout.
  if (entry.aiImage) {
    return (
      <FlatPageImage
        className="ai-rendered-page"
        src={entry.aiImage}
        style={maxW && maxH ? { maxWidth: maxW, maxHeight: maxH } : undefined}
      />
    );
  }

  const spec = entry.layoutSpec;
  const count = entry.photos.length;

  const pageStyle: CSSProperties = {
    ...textureStyle(spec.texture, spec.palette),
    ['--ink' as string]: spec.palette.ink,
    ['--accent' as string]: spec.palette.accent,
    ['--handwrite-font' as string]: `'${spec.font}', cursive`,
  };

  return (
    <div className="page" style={pageStyle}>
      <div className="date-stamp">{entry.dateLabel}</div>

      {spec.decorations.map((d, i) => (
        <DecorationNode key={i} d={d} />
      ))}

      {count > 0 &&
        (spec.family === 'grid' ? (
          <div
            className="page-grid"
            style={{ gridTemplateColumns: `repeat(${count <= 1 ? 1 : count <= 4 ? 2 : 3}, 1fr)` }}
          >
            {entry.photos.map((src, i) => {
              const s = spec.photoSpecs[i] || { shape: 'square', rotation: 0 };
              return (
                <div
                  key={i}
                  className={'grid-cell shape-' + s.shape}
                  style={{
                    transform: `rotate(${s.rotation}deg)`,
                    clipPath: s.shape === 'torn' && s.tornClip ? s.tornClip : undefined,
                  }}
                >
                  <img src={src} alt="" />
                </div>
              );
            })}
          </div>
        ) : (
          entry.photos.map((src, i) => {
            const s = spec.photoSpecs[i];
            return s ? <PhotoFrame key={i} src={src} spec={s} /> : null;
          })
        ))}

      <div
        className="page-text"
        style={{ transform: `rotate(${spec.textRotation}deg)`, fontSize: spec.textFontSize + 'rem' }}
      >
        {entry.caption && (
          <div className="page-quote">
            &ldquo;{entry.caption}&rdquo;
            {entry.captionAuthor && <span className="page-quote-author"> — {entry.captionAuthor}</span>}
          </div>
        )}
        <div className="journal-text">{entry.text || ''}</div>
      </div>
    </div>
  );
}
