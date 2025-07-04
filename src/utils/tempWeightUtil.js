// 최적 온도 범위 및 감쇠 계수
const OPTIMAL_TEMP_MIN = 18.0;
const OPTIMAL_TEMP_MAX = 22.0;
const ALPHA_WINTER = 0.015;
const ALPHA_SUMMER = 0.01;
const BETA = 1.5;

// 월별 평균 기온 (서울)
const monthlyAvgTemps = [
  -2.5, 0.3, 5.7, 12.8, 17.9, 22.2, 25.7, 26.4, 21.9, 15.0, 7.3, 0.4,
];

const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * 날짜 기준 보간된 월 평균 온도 계산
 * @param {number} month - 1~12
 * @param {number} day - 1~31
 * @returns {number} 보간된 온도 (소수 1자리 반올림)
 */
export function getInterpolatedTemperature(month, day) {
  const currentIndex = month - 1;
  const nextIndex = month === 12 ? 0 : currentIndex + 1;

  const startTemp = monthlyAvgTemps[currentIndex];
  const endTemp = monthlyAvgTemps[nextIndex];
  const daysInCurrentMonth = daysInMonth[currentIndex];

  const ratio = (day - 1) / daysInCurrentMonth;
  const interpolated = startTemp + (endTemp - startTemp) * ratio;

  return Math.round(interpolated * 10) / 10;
}

/**
 * 입력 온도에 대한 가중치 계산
 * @param {number} temperature - 온도 값
 * @returns {number} 가중치 (0~1 사이, 최적 범위는 1.0)
 */
export function getTemperatureWeight(temperature) {
  if (temperature >= OPTIMAL_TEMP_MIN && temperature <= OPTIMAL_TEMP_MAX) {
    return 1.0;
  }

  let deviation, alpha;
  if (temperature < OPTIMAL_TEMP_MIN) {
    deviation = OPTIMAL_TEMP_MIN - temperature;
    alpha = ALPHA_WINTER;
  } else {
    deviation = temperature - OPTIMAL_TEMP_MAX;
    alpha = ALPHA_SUMMER;
  }

  return 1.0 / (1 + alpha * Math.pow(deviation, BETA));
}
