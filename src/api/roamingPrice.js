import axios from "axios";

export const fetchRoamingFee = async (memberCompany, operatorCode) => {
  console.log("📡 fetchRoamingFee 호출:", memberCompany, operatorCode);
  try {
    const response = await axios.get("/api/roaming-price", {
      params: { memberCompany, operatorCode },
    });
    return response.data.feeInfo || "요금 정보 없음";
  } catch (err) {
    console.warn("❌ 로밍 요금 가져오기 실패:", err);
    return "요금 정보 불러오기 실패";
  }
};
