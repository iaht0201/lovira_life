export interface Point2D {
  x: number;
  y: number;
}

export interface VSLJoints {
  head: Point2D;
  neck: Point2D;
  leftShoulder: Point2D;
  rightShoulder: Point2D;
  leftElbow: Point2D;
  rightElbow: Point2D;
  leftHand: Point2D;
  rightHand: Point2D;
  waist: Point2D;
}

export const NEUTRAL_POSE: VSLJoints = {
  head: { x: 0, y: -0.65 },
  neck: { x: 0, y: -0.45 },
  leftShoulder: { x: -0.25, y: -0.4 },
  rightShoulder: { x: 0.25, y: -0.4 },
  leftElbow: { x: -0.35, y: -0.1 },
  rightElbow: { x: 0.35, y: -0.1 },
  leftHand: { x: -0.3, y: 0.2 },
  rightHand: { x: 0.3, y: 0.2 },
  waist: { x: 0, y: 0.1 },
};

const GESTURE_DICTIONARY: Record<string, VSLJoints[]> = {
  chao: [
    NEUTRAL_POSE,
    {
      ...NEUTRAL_POSE,
      rightElbow: { x: 0.4, y: -0.4 },
      rightHand: { x: 0.5, y: -0.65 },
    },
    {
      ...NEUTRAL_POSE,
      rightElbow: { x: 0.45, y: -0.35 },
      rightHand: { x: 0.6, y: -0.55 },
    },
    NEUTRAL_POSE,
  ],
  nghe: [
    NEUTRAL_POSE,
    {
      ...NEUTRAL_POSE,
      rightElbow: { x: 0.3, y: -0.5 },
      rightHand: { x: 0.15, y: -0.6 },
    },
    {
      ...NEUTRAL_POSE,
      rightElbow: { x: 0.35, y: -0.52 },
      rightHand: { x: 0.18, y: -0.62 },
    },
    NEUTRAL_POSE,
  ],
  cam_on: [
    NEUTRAL_POSE,
    {
      ...NEUTRAL_POSE,
      rightElbow: { x: 0.2, y: -0.45 },
      rightHand: { x: 0.05, y: -0.48 },
      leftElbow: { x: -0.2, y: -0.45 },
      leftHand: { x: -0.05, y: -0.48 },
    },
    {
      ...NEUTRAL_POSE,
      rightElbow: { x: 0.25, y: -0.2 },
      rightHand: { x: 0.2, y: -0.1 },
      leftElbow: { x: -0.25, y: -0.2 },
      leftHand: { x: -0.2, y: -0.1 },
    },
    NEUTRAL_POSE,
  ],
  giup: [
    NEUTRAL_POSE,
    {
      ...NEUTRAL_POSE,
      leftElbow: { x: -0.2, y: -0.2 },
      leftHand: { x: -0.1, y: -0.2 },
      rightElbow: { x: 0.2, y: -0.3 },
      rightHand: { x: -0.1, y: -0.25 },
    },
    NEUTRAL_POSE,
  ],
  dong_y: [
    NEUTRAL_POSE,
    {
      ...NEUTRAL_POSE,
      head: { x: 0, y: -0.6 },
    },
    {
      ...NEUTRAL_POSE,
      head: { x: 0, y: -0.68 },
    },
    NEUTRAL_POSE,
  ],
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t),
  };
}

export function interpolateJoints(from: VSLJoints, to: VSLJoints, factor: number): VSLJoints {
  const t = Math.max(0, Math.min(1, factor));
  return {
    head: lerpPoint(from.head, to.head, t),
    neck: lerpPoint(from.neck, to.neck, t),
    leftShoulder: lerpPoint(from.leftShoulder, to.leftShoulder, t),
    rightShoulder: lerpPoint(from.rightShoulder, to.rightShoulder, t),
    leftElbow: lerpPoint(from.leftElbow, to.leftElbow, t),
    rightElbow: lerpPoint(from.rightElbow, to.rightElbow, t),
    leftHand: lerpPoint(from.leftHand, to.leftHand, t),
    rightHand: lerpPoint(from.rightHand, to.rightHand, t),
    waist: lerpPoint(from.waist, to.waist, t),
  };
}

export class VSLMotionService {
  private static instance: VSLMotionService;

  public static getInstance(): VSLMotionService {
    if (!VSLMotionService.instance) {
      VSLMotionService.instance = new VSLMotionService();
    }
    return VSLMotionService.instance;
  }

  public getGestureForText(text: string): VSLJoints[] {
    const lower = text.toLowerCase();
    if (lower.includes('chào') || lower.includes('hello')) {
      return GESTURE_DICTIONARY.chao;
    }
    if (lower.includes('nghe') || lower.includes('lắng nghe')) {
      return GESTURE_DICTIONARY.nghe;
    }
    if (lower.includes('cảm ơn') || lower.includes('cam on')) {
      return GESTURE_DICTIONARY.cam_on;
    }
    if (lower.includes('giúp') || lower.includes('hỗ trợ')) {
      return GESTURE_DICTIONARY.giup;
    }
    if (lower.includes('đồng ý') || lower.includes('được')) {
      return GESTURE_DICTIONARY.dong_y;
    }
    return [
      NEUTRAL_POSE,
      {
        ...NEUTRAL_POSE,
        rightHand: { x: 0.35, y: -0.2 },
        leftHand: { x: -0.35, y: -0.2 },
      },
      NEUTRAL_POSE,
    ];
  }
}

export const vslMotionService = VSLMotionService.getInstance();
