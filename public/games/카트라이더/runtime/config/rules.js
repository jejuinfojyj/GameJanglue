/**
 * 경기 규칙.
 * 랩 수, 카운트다운, 드리프트 허용 같은 규칙은 여기에 둔다.
 * 아이템, 충돌 페널티, AI는 RaceDirector 옆에 이어서 붙이면 된다.
 */
export const rules = {
    laps: 3,
    countdown: 3,
    /** 다음 체크포인트를 노면에 희미하게 보여 준다. */
    showNextGate: true,
    wrongWayDelay: 0.45,
    enableDrift: true,
    enableBoost: true,
};
