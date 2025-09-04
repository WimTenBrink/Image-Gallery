
export interface Image {
  id: string;
  name: string;
  fullPath: string;
  folderId?: number;
  description?: string;
  format?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  exif?: { [key: string]: any };
}

export interface Story {
  path: string;
  name: string;
}

export interface SelectedFolder {
  path: string;
  images: Image[];
}

export type SelectedItem = 
  | { type: 'image'; data: Image }
  | { type: 'folder'; data: SelectedFolder }
  | null;


export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  API = 'API',
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  header: string;
  body: string;
}

export type ModalType = 'TOS' | 'ABOUT' | 'CONSOLE' | null;

export interface TreeNode {
    name: string;
    path: string;
    isSelectable: boolean;
    children: { [key: string]: TreeNode };
}