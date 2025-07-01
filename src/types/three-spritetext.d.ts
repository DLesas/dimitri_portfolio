declare module "three-spritetext" {
  import { Sprite } from "three";
  export default class SpriteText extends Sprite {
    constructor(
      text?: string,
      textHeight?: number,
      color?: string,
      fontFace?: string
    );
    text: string;
    textHeight: number;
    color: string;
    fontFace: string;
  }
}
