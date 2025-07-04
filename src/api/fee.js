import axios from "axios";

export async function fetchChargerFee(busiId) {
  try {
    console.log("🔌 호출할 API:", `/api/charger-fee/${busiId}`);
    const res = await axios.get(`/api/charger-fee/${busiId}`);
    return res.data;
  } catch (error) {
    console.error("요금 정보 불러오기 실패:", error);
    return null;
  }
}
