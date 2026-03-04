declare module 'bwip-js' {
  export type TextAlign = 'center' | 'left' | 'right'

  export interface BcidOptions {
    bcid: string
    text: string
    scale?: number
    height?: number
    width?: number
    includetext?: boolean
    textxalign?: TextAlign
    textsize?: number
    backgroundcolor?: string
    paddingwidth?: number
    paddingheight?: number
    rotate?: 'N' | 'R' | 'L' | 'I'
  }

  export function toCanvas(
    canvas: HTMLCanvasElement | string,
    options: BcidOptions
  ): void

  const bwipjs: {
    toCanvas: typeof toCanvas
  }

  export default bwipjs
}
