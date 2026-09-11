import { useRef, type ChangeEvent } from 'react';
import type { Photo } from '../../journal/types';

interface Props {
  photos: Photo[];
  onAdd: (photo: Photo) => void;
  onRemove: (id: string) => void;
}

export function PhotoUpload({ photos, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onAdd({ id: crypto.randomUUID(), dataUrl: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <>
      <label className="field-label">Photos</label>
      <div className="upload-box" onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleChange} />
        <div className="upload-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 16V4M12 4l-5 5M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="upload-hint">Click to add photos (up to 6 works best)</div>
      </div>
      <div className="photo-previews">
        {photos.map((p) => (
          <div className="photo-thumb" key={p.id}>
            <img src={p.dataUrl} alt="" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(p.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
