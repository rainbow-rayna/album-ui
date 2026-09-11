export type Family = 'scatter' | 'grid' | 'filmstrip' | 'circles';

export type PhotoShape = 'square' | 'torn' | 'circle';

export interface Palette {
  bg: string;
  ink: string;
  accent: string;
  tapes: [string, string, string];
}

export interface PhotoSpec {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  rotation: number;
  shape: PhotoShape;
  tape?: boolean;
  tapeColor?: string;
  tornClip?: string;
  z?: number;
}

export interface Decoration {
  type: 'tape' | keyof typeof import('./constants').DOODLES;
  left: number;
  top: number;
  size: number;
  rotation: number;
  color: string;
}

export interface LayoutSpec {
  family: Family;
  palette: Palette;
  font: string;
  texture: string;
  photoSpecs: PhotoSpec[];
  decorations: Decoration[];
  textRotation: number;
  textFontSize: number;
}

export interface Photo {
  id: string;
  dataUrl: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  dateLabel: string;
  photos: string[];
  text: string;
  caption: string;
  captionAuthor?: string;
  aiImage: string | null;
  layoutSpec: LayoutSpec;
}
