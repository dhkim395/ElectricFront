// 1. 도착 시 배터리 잔량 계산 함수
export function estimateArrivalBattery(
  currentPercent,
  distanceKm,
  efficiencyKmPerKwh,
  batteryCapacityKwh
) {
  const usedEnergy = distanceKm / efficiencyKmPerKwh; // 사용된 kWh
  const usedPercent = (usedEnergy / batteryCapacityKwh) * 100; // 퍼센트 변환
  const arrivalPercent = currentPercent - usedPercent;

  return Math.max(arrivalPercent, 0); // 음수 방지
}

//2. 충전 시간 계산 함수
export function estimateChargingTime(
  batteryCapacityKwh,
  arrivalPercent,
  targetPercent,
  chargingSpeedKw
) {
  const chargeAmount =
    (batteryCapacityKwh * (targetPercent - arrivalPercent)) / 100;
  const timeInHours = chargeAmount / chargingSpeedKw;
  const timeInMinutes = timeInHours * 60;

  return Math.round(timeInMinutes); // 분 단위
}

/**
 * 도착 후 충전 결과 배터리 퍼센트 계산
 * @param {number} arrivalPercent - 도착 시 배터리 퍼센트 (%)
 * @param {number} chargingSpeedKw - 충전 속도 (kW)
 * @param {number} chargingMinutes - 충전 시간 (분)
 * @param {number} batteryCapacityKwh - 배터리 총 용량 (kWh)
 * @returns {number} 충전 후 예상 배터리 퍼센트 (최대 100%)
 */
export function estimatePostChargeBattery(
  arrivalPercent,
  chargingSpeedKw,
  chargingMinutes,
  batteryCapacityKwh
) {
  const chargedKwh = (chargingSpeedKw * chargingMinutes) / 60;
  const chargedPercent = (chargedKwh / batteryCapacityKwh) * 100;
  const finalPercent = arrivalPercent + chargedPercent;

  return Math.min(finalPercent, 100); // 100% 초과 방지
}
