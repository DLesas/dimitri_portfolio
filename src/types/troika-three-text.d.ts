declare module "troika-three-text" {
  import { Mesh, Color } from "three";
  export class Text extends Mesh {
    text: string;
    font?: string;
    fontSize?: number;
    letterSpacing?: number;
    lineHeight?: number | string;
    anchorX?: string | number;
    anchorY?: string | number;
    color?: string | number | Color;
    fillOpacity?: number;
    outlineWidth?: number | string;
    outlineBlur?: number | string;
    outlineColor?: string | number | Color;
    outlineOpacity?: number;
    textRenderInfo?: { blockBounds: [number, number, number, number] } | null;
    sync: (callback?: () => void) => void;
    dispose: () => void;
  }
  /** Renders any number of member Text objects in a single draw call */
  export class BatchedText extends Text {
    addText(text: Text): void;
    removeText(text: Text): void;
  }
}
