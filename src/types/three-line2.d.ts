declare module "three/examples/jsm/lines/Line2" {
  import { Line, BufferGeometry, Material } from "three";
  import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

  export class Line2 extends Line {
    constructor(geometry?: LineGeometry, material?: LineMaterial);
    geometry: LineGeometry;
    material: LineMaterial;
    isLine2: boolean;
    computeLineDistances(): this;
  }
}

declare module "three/examples/jsm/lines/LineGeometry" {
  import { BufferGeometry, BufferAttribute, Line } from "three";

  export class LineGeometry extends BufferGeometry {
    constructor();
    isLineGeometry: boolean;
    setPositions(array: number[] | Float32Array): this;
    setColors(array: number[] | Float32Array): this;
    fromLine(line: Line): this;
  }
}

declare module "three/examples/jsm/lines/LineMaterial" {
  import { ShaderMaterial, Vector2, Color, ColorRepresentation } from "three";

  export interface LineMaterialParameters {
    alphaToCoverage?: boolean;
    color?: ColorRepresentation;
    dashed?: boolean;
    dashScale?: number;
    dashSize?: number;
    dashOffset?: number;
    gapSize?: number;
    linewidth?: number;
    opacity?: number;
    resolution?: Vector2;
    transparent?: boolean;
    worldUnits?: boolean;
    vertexColors?: boolean;
  }

  export class LineMaterial extends ShaderMaterial {
    constructor(parameters?: LineMaterialParameters);
    isLineMaterial: boolean;
    color: Color;
    linewidth: number;
    resolution: Vector2;
    alphaToCoverage: boolean;
    worldUnits: boolean;
    dashed: boolean;
    dashScale: number;
    dashSize: number;
    dashOffset: number;
    gapSize: number;
  }
}
