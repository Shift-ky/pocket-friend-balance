export const ORB_SIZE = 56;
export const ORB_MARGIN = 12;
export const ORB_DRAG_THRESHOLD = 6;

export function boundOrbPosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.max(ORB_MARGIN, Math.min(x, width - ORB_SIZE - ORB_MARGIN)),
    y: Math.max(ORB_MARGIN, Math.min(y, height - ORB_SIZE - ORB_MARGIN)),
  };
}