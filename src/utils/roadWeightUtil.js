/**
 * 도심 평균 속도 추정
 * @param {number} cityDistance - 도심 거리 (m)
 * @param {number} totalDistance - 전체 거리 (m)
 * @param {number} totalTimeSeconds - 전체 시간 (초)
 * @returns {number} 평균 속도 (km/h)
 */
export function estimateCitySpeed(
  cityDistance,
  totalDistance,
  totalTimeSeconds
) {
  if (totalDistance === 0 || totalTimeSeconds === 0) return 0.0;
  const cityTime = (cityDistance / totalDistance) * totalTimeSeconds;
  return cityDistance / 1000 / (cityTime / 3600); // km/h
}

/**
 * 회생제동 보정 (도심 속도 30km/h 미만일 때 가중치 증가)
 * @param {number} speed - 도심 평균 속도 (km/h)
 * @param {number} cityEvRatio - 도심 주행 시 전비 가중치
 * @returns {number} 보정된 전비 가중치
 */
export function cityBoost(speed, cityEvRatio) {
  return speed < 30 ? cityEvRatio * 1.35 : cityEvRatio;
}

/**
 * 도로 유형별 전비 가중치 계산
 * @param {number} cityEvRatio - 도심 전비 가중치 (예: 1.1)
 * @param {number} highwayEvRatio - 고속도로 전비 가중치 (예: 0.9)
 * @param {number} cityDistance - 도심 거리 (m)
 * @param {number} highwayDistance - 고속도로 거리 (m)
 * @param {number} totalTimeSeconds - 전체 소요 시간 (초)
 * @returns {number} 최종 도로 가중치 (0~1)
 */
export function calculateRoadWeight(
  cityEvRatio,
  highwayEvRatio,
  cityDistance,
  highwayDistance,
  totalTimeSeconds
) {
  const totalDistance = cityDistance + highwayDistance;
  if (totalDistance === 0) return 0.0;

  const citySpeed = estimateCitySpeed(
    cityDistance,
    totalDistance,
    totalTimeSeconds
  );
  const adjustedCityEvRatio = cityBoost(citySpeed, cityEvRatio);

  const cityPortion = cityDistance / totalDistance;
  const highwayPortion = highwayDistance / totalDistance;

  return adjustedCityEvRatio * cityPortion + highwayEvRatio * highwayPortion;
}

export function calculateRoadWeightByVehicle(
  cityEv,
  highwayEv,
  cityDistance,
  highwayDistance,
  totalTimeSeconds
) {
  const totalDistance = cityDistance + highwayDistance;
  if (totalDistance === 0) return 0.0;

  // 평균 전비
  const averageEv = (cityEv + highwayEv) / 2;

  // 상대 전비 계수
  const cityEvRatio = cityEv / averageEv;
  const highwayEvRatio = highwayEv / averageEv;

  // 도심 속도 추정 (회생제동 보정 포함)
  const cityTime = (cityDistance / totalDistance) * totalTimeSeconds;
  const citySpeed = cityDistance / 1000 / (cityTime / 3600); // km/h
  const adjustedCityEvRatio = citySpeed < 30 ? cityEvRatio * 1.35 : cityEvRatio;

  const cityPortion = cityDistance / totalDistance;
  const highwayPortion = highwayDistance / totalDistance;

  const roadWeight =
    adjustedCityEvRatio * cityPortion + highwayEvRatio * highwayPortion;
  return roadWeight;
}
