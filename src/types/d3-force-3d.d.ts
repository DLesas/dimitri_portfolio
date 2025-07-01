/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "d3-force-3d" {
  export interface SimulationNode {
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    [key: string]: any;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNode> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    [key: string]: any;
  }

  export interface Force<NodeDatum extends SimulationNode> {
    (alpha: number): void;
    initialize?: (nodes: NodeDatum[]) => void;
  }

  export interface Simulation<NodeDatum extends SimulationNode> {
    restart(): this;
    stop(): this;
    tick(): this;
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaDecay(): number;
    alphaDecay(decay: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    velocityDecay(): number;
    velocityDecay(decay: number): this;
    force(name: string): Force<NodeDatum> | undefined;
    force(name: string, force: null): this;
    force(name: string, force: Force<NodeDatum>): this;
    numDimensions(): number;
    numDimensions(n: number): this;
    find(
      x: number,
      y: number,
      z: number,
      radius?: number
    ): NodeDatum | undefined;
  }

  export interface ForceLink<
    NodeDatum extends SimulationNode,
    LinkDatum extends SimulationLinkDatum<NodeDatum>
  > extends Force<NodeDatum> {
    links(): LinkDatum[];
    links(links: LinkDatum[]): this;
    id(id: (node: NodeDatum) => string): this;
    distance(distance: number | ((link: LinkDatum) => number)): this;
    strength(strength: number | ((link: LinkDatum) => number)): this;
    iterations(iterations: number): this;
  }

  export function forceSimulation<NodeDatum extends SimulationNode>(
    nodes?: NodeDatum[],
    dimensions?: number
  ): Simulation<NodeDatum>;

  export function forceLink<
    NodeDatum extends SimulationNode,
    LinkDatum extends SimulationLinkDatum<NodeDatum>
  >(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;

  export function forceManyBody<
    NodeDatum extends SimulationNode
  >(): Force<NodeDatum>;

  export function forceCenter<NodeDatum extends SimulationNode>(
    x?: number,
    y?: number,
    z?: number
  ): Force<NodeDatum>;
}
