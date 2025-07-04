import axios from "axios";
import { fetchChargerFee } from "../api/fee";
import { fetchRoamingFee } from "../api/roamingPrice";


axios.defaults.baseURL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8082";

//프론트에서 현재 위치 전송 + 근처 충전소 세팅 함수
export const setStationNear = async (lat, lon) => {
  try {
    // 수정: fetch -> axios.post 사용
    await axios.post("/api/station/setStationNear", { lat, lon });
    console.log("서버 setStationNear 성공");
  } catch (e) {
    console.error("setStationNear 오류:", e);
  }
};

//***실시간으로 중심 위경도를 백으로 보내는 함수***
export const getStationNear = async (
  centerLat,
  centerLon,
  mapInstance,
  markersRef,
  setSelectedStation,
  filterOptions = {},
  originMarkerRef,
  destMarkerRef,
  memberCompanyRef
) => {
  if (!mapInstance?.current) {
    console.warn("🚨 mapInstance.current가 없습니다!");
    return;
  }
   const zoom = mapInstance.current.getZoom();

  // ✅ 줌레벨이 13 이하면 상세 마커는 무시
  if (zoom <= 13) {
    console.log("⛔ 상세 마커 로딩 중단 (줌레벨 <= 13)");
    return;
  }
if (!Array.isArray(markersRef.current)) {
  console.warn("🚨 markersRef.current가 배열이 아님. 초기화합니다.");
  markersRef.current = [];
}
  try {
    const response = await axios.post("/api/station/getStationNear", {
      lat: centerLat,
      lon: centerLon,
      freeParking: filterOptions.freeParking,
      noLimit: filterOptions.noLimit,
      outputMin: filterOptions.outputMin,
      outputMax: filterOptions.outputMax,
      type: filterOptions.type,
      provider: filterOptions.provider,
    });

    const stations = response.data;
    console.log("서버 응답:", stations);

    // 출발,도착 마커는 따로 관리
    markersRef.current.forEach((entry) => {
      const marker = entry.marker;
      const isOrigin = marker === originMarkerRef.current;
      const isDest = marker === destMarkerRef.current;
      if (!isOrigin && !isDest) {
        marker.setMap(null); // 일반 마커만 제거
      }
    });

    markersRef.current = markersRef.current.filter(
      (entry) =>
        entry.marker === originMarkerRef.current ||
        entry.marker === destMarkerRef.current
    );

    const existingStatIds = markersRef.current.map((entry) =>
  entry.data.statId?.toString()
);
/////////////////최저가/////////
let cheapestStationIds = [];

if (stations.length > 0) {
  const stationsWithValidPrice = stations.filter(s =>
    typeof s.fastMemberPrice === "number" && !isNaN(s.fastMemberPrice)
  );

  if (stationsWithValidPrice.length > 0) {
    const minPrice = Math.min(...stationsWithValidPrice.map(s => s.fastMemberPrice));

    cheapestStationIds = stationsWithValidPrice
      .filter(s => s.fastMemberPrice === minPrice)
      .map(s => s.statId?.toString());
  }
}
//////////////////////////////////////////////////////////
    // 버전 1. 새 마커 찍기+   // 새 마커 찍기
    stations.forEach((station) => {
      const statIdStr = station.statId?.toString();
      if (!statIdStr || existingStatIds.includes(statIdStr)) return;
      const isOrigin =
        originMarkerRef.current?.dataStatId?.toString() === statIdStr;
      const isDest =
        destMarkerRef.current?.dataStatId?.toString() === statIdStr;
      if (isOrigin || isDest) return;

      const exists = markersRef.current.some(
        (e) => e.data.statId?.toString() === statIdStr
      );
      if (exists) return;
      
const isCheapest = cheapestStationIds.includes(statIdStr);
const fastMemberPrice = station.fastMemberPrice ?? "정보 없음";
const position = new window.Tmapv2.LatLng(station.lat, station.lng);
const labelHtml = `
  <div style="
    position: relative;
    display: inline-block;
  ">
    ${isCheapest ? `
      <div style="
        position: absolute;
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: #fff3e0;
        color: #e64a19;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 6px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
        white-space: nowrap;
      ">
        🔥 최저가
      </div>
    ` : ""}

    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      background: #fefefe;
      border-radius: 10px;
      padding: 4px 8px;
      font-size: 13px;
      font-weight: 500;
      color: #1e1e1e;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      border: 1px solid #ddd;
      font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
      line-height: 1;
      white-space: nowrap;
    ">
      <img src="${station.logoUrl}" style="
        width: 22px;
        height: 22px;
        border-radius: 5px;
        object-fit: cover;
      " />
      <span>
        ${fastMemberPrice}<span style="font-size: 11px; color: #888;">원</span>
      </span>
    </div>
  </div>
`;
    const marker = new window.Tmapv2.Marker({
      position,
      map:mapInstance.current,
      iconHTML: labelHtml,
      iconSize: new window.Tmapv2.Size(100, 40),
      iconAnchor: new window.Tmapv2.Point(50, 40),
      zIndex: 1000,
    });
    marker.originalIcon = "html";
    station.__marker = marker;

      marker.addListener("click", async () => {
        mapInstance.current.setCenter(position);

        if (!station.busiId) {
          console.warn("🚨 busiId 없음, 요금 정보 생략", station);
          setSelectedStation(station);
          return;
        }

        try {
          // 기본 요금
          const baseFee = await fetchChargerFee(station.busiId);
          console.log("✅ 기본 요금:", baseFee);

          // 로밍 요금
          let roamingFee;
          const currentCompany = memberCompanyRef?.current;
          console.log("📍 클릭 시 최신 memberCompany 값:", currentCompany);

          if (currentCompany) {
            roamingFee = await fetchRoamingFee(currentCompany, station.busiId);
            console.log("✅ 로밍 요금:", roamingFee);
          } else {
            roamingFee = "회원사를 먼저 선택해주세요.";
          }

          setSelectedStation({
            ...station,
            feeInfo: baseFee,
            roamingInfo: typeof roamingFee === "string" ? roamingFee : null,
          });
        } catch (error) {
          console.warn("❌ 요금 정보 에러:", error);
          setSelectedStation({
            ...station,
            feeInfo: "기본 요금 불러오기 실패",
            roamingInfo: "로밍 요금 불러오기 실패",
          });
        }
      });

      // 이제 entry 형태로 저장
      markersRef.current.push({ data: station, marker: marker });
    });
  } catch (error) {
    console.error("서버 전송 에러:", error);
    return [];
  }
}; //sendCenterToServer 함수 끝

//***드래그, 줌, 이동 등 모든 조작 끝난 후 화면 중심 위도 경도 구하기 함수***
export const registerMapCenterListener = (
  map,
  setStationNear,
  getStationNear,
  mapInstance,
  markersRef,
  setSelectedStation,
  filterOptionsRef,
  originMarkerRef, // 추가
  destMarkerRef,
  memberCompanyRef
) => {
  let debounceTimer = null;

  const handleCenterChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const center = map.getCenter();
      const centerLat = center.lat();
      const centerLon = center.lng();
      console.log("📍 중심 좌표 (디바운스):", centerLat, centerLon);

      // 1. 위치 기준 충전소 캐싱 요청
      await setStationNear(centerLat, centerLon);

      // 2. 다시 그리기
      await getStationNear(
        centerLat,
        centerLon,
        mapInstance,
        markersRef,
        setSelectedStation,
        filterOptionsRef.current,
        originMarkerRef,
        destMarkerRef,
        memberCompanyRef
      );
    }, 300);
  };

  map.addListener("dragend", handleCenterChange);
  map.addListener("zoom_changed", handleCenterChange);
};

//실시간 위치 추적 함수
export const trackUserMovement = (
  mapInstance,
  userMarkerRef,
  setStationNear,
  getStationNear,
  markersRef,
  setSelectedStation,
  filterOptionsRef,
  originMarkerRef,
  destMarkerRef,
  memberCompanyRef
) => {
  const lastUserUpdateTimeRef = { current: 0 }; // 로컬 ref 대체
  const USER_UPDATE_INTERVAL = 10000; // 10초

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLon = position.coords.longitude;
        console.log("사용자 이동 감지:", newLat, newLon);

        // 사용자 마커 갱신 / 출력
        const map = mapInstance.current;
        if (!map) return;

        const positionObj = new window.Tmapv2.LatLng(newLat, newLon);
        if (!userMarkerRef.current) {
          userMarkerRef.current = new window.Tmapv2.Marker({
            position: positionObj,
            icon: "/img/myLocationIcon/currentLocation.png",
            iconSize: new window.Tmapv2.Size(48, 72),
            map,
          });
        } else {
          userMarkerRef.current.setPosition(positionObj);
        }

        // 사용자 위치로 지도 이동. -> 검색에 방해됨
        // map.setCenter(positionObj);

        // 일정 시간 간격으로만 서버 요청
        const now = Date.now();
        if (now - lastUserUpdateTimeRef.current >= USER_UPDATE_INTERVAL) {
          lastUserUpdateTimeRef.current = now;
          setStationNear(newLat, newLon);
          getStationNear(
            newLat,
            newLon,
            mapInstance,
            markersRef,
            setSelectedStation,
            filterOptionsRef.current,
            originMarkerRef, // ← 반드시 추가
            destMarkerRef,
            memberCompanyRef
          );
        } else {
          console.log("사용자 위치 변경: 서버 요청 대기 중...");
        }
      },
      (error) => {
        console.error("실시간 위치 추적 실패:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  } else {
    alert("이 브라우저는 실시간 위치 추적을 지원하지 않습니다.");
  }
};