export const calculateReachableDistance = ({
  batteryLevelPercent,
  batteryCapacity,
  baseEfficiency,
  temperature,
  averageWeight,
}) => {
  const tempFactor = temperature <= -10 ? 0.8 : 1.0;
  return (
    (batteryLevelPercent / 100) *
    batteryCapacity *
    baseEfficiency *
    tempFactor *
    averageWeight
  );
};
