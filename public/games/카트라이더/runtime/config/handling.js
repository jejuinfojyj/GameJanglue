/**
 * 주행 손맛. 단위는 월드 픽셀과 초.
 * 드리프트가 미끄럽거나 코너가 급하면 여기만 고치면 된다.
 */
export const handling = {
    maxSpeed: 640,
    maxReverse: 150,
    accel: 500,
    brake: 1040,
    coast: 170,
    turnRate: 1.62,
    driftTurnRate: 2.05,
    grip: 12,
    driftGrip: 3.1,
    brakeGrip: 16,
    minDriftSpeed: 200,
    minDriftTime: 0.2,
    /** 드리프트 게이지가 이 시각(초)에 1단, 2단, 3단이 된다. */
    driftSegmentTimes: [0.38, 0.9, 1.48],
    boostTimes: [0.4, 0.72, 1.08],
    boostKick: [70, 130, 190],
    boostAdd: 240,
    kartRadius: 16,
};
