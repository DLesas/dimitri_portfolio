declare module "troika-three-text" {
  import { Mesh } from "three";
  export class Text extends Mesh {
    text: string;
    font?: string;
    fontSize?: number;
    anchorX?: string | number;
    anchorY?: string | number;
    sync: () => void;
  }
}
