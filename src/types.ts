export interface Size {
    minx: number,
    maxx: number,
    miny: number,
    maxy: number,
    width: number,
    height: number
}
  
export interface PixelPosition {
    x: number,
    y: number
}
  
export interface Group {
    id: number,
    pixels: PixelPosition[],
    size: Size,
    anchors: Anchors
}
  
export interface GroupsData {
    lineSize: Size,
    groups: Group[]
}

export interface Anchors {
    top: boolean,
    bottom: boolean,
    right: boolean,
    left: boolean
}