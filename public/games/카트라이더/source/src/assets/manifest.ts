/**
 * 이미지 교체 지점.
 * public/assets/ 에 파일을 넣은 뒤, 아래 null 을 경로 문자열로 바꾸면
 * 다음 새로고침부터 절차적 그래픽 대신 그 이미지를 쓴다.
 *
 * 카트와 바퀴 이미지는 앞쪽(또는 바퀴의 위쪽)이 오른쪽을 향하게 저장한다.
 * 카트 그림에 캐릭터가 이미 있으면 driver 는 null 로 둔다.
 *
 * background 는 잔디와 인필드 자리에 깔리고, 트랙은 그 위에 그대로 그려진다.
 */
export const manifest = {
  background: null as string | null, // "/assets/background.png"
  kart: null as string | null, // "/assets/kart.png"
  driver: null as string | null, // "/assets/driver.png"
  wheel: null as string | null, // "/assets/wheel.png"
  tree: null as string | null, // "/assets/tree.png"
  bush: null as string | null, // "/assets/bush.png"
  /** 왼쪽부터 4칸. 쓰면 충돌 때 초당 4장으로 재생한다. */
  crash: null as string | null, // "/assets/crash.png"
};

export type AssetKey = keyof typeof manifest;
