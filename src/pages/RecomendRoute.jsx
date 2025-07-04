import React, { useEffect, useRef, useState } from "react";
import haversineDistance from "../utils/haversineUtil";
import { useLocation, useNavigate } from "react-router-dom";
import "./RecomendRoute.css";
import {
  getInterpolatedTemperature,
  getTemperatureWeight,
} from "../utils/tempWeightUtil";
import { calculateRoadWeightByVehicle } from "../utils/roadWeightUtil";

import {
  estimateArrivalBattery,
  estimateChargingTime,
  estimatePostChargeBattery,
} from "../utils/estimateChargingTimeUtil";

export default function RecommendRoute() {
  const mapRef = useRef(null);
  const [searchOption, setSearchOption] = useState("0");
  const [routeResult, setRouteResult] = useState("");
  const [drawnPolylines, setDrawnPolylines] = useState([]);
  const [waypointMarkers, setWaypointMarkers] = useState([]);
  const [waypointsLatLng, setWaypointsLatLng] = useState([]);
  const [stationMarkers, setStationMarkers] = useState([]);
  const [selectedPriority, setSelectedPriority] = useState("speed"); //  기본값 설정
  const [showSettings, setShowSettings] = useState(false);
  const [stationCards, setStationCards] = useState([]);

  const userVehicle = {
    cityEv: 5.5, // 도심 전비 (km/kWh)
    highwayEv: 4.4, // 고속 전비 (km/kWh)
  };
  const [batteryInfo, setBatteryInfo] = useState({
    level: 50,
    capacity: 70,
    efficiency: 5.0,
    temperature: 15,
    chargeLimit: 85,
    targetLevel: 20,
  });
  // 임시 배터리 정보 상태 추가
  const [tempBatteryInfo, setTempBatteryInfo] = useState({
    level: 50,
    capacity: 70,
    efficiency: 5.0,
    temperature: 15,
    chargeLimit: 85,
    targetLevel: 20,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const {
    originInput,
    destInput,
    originCoords = {},
    destCoords = {},
    filterOptions = {
      freeParking: false,
      noLimit: false,
      outputMin: 0,
      outputMax: 350,
      type: [],
      provider: [],
    },
  } = location.state || {};

  const [filters, setFilters] = useState(filterOptions);

  // 출발지와 목적지 정보를 상태로 관리
  const [originInfo, setOriginInfo] = useState({
    input: originInput || "",
    coords: originCoords || { lat: 37.504198, lon: 127.04894 },
  });

  const [destInfo, setDestInfo] = useState({
    input: destInput || "",
    coords: destCoords || { lat: 35.1631, lon: 129.1635 },
  });

  // const startLat = 37.504198,
  //   startLon = 127.04894;
  // const endLat = 35.1631,
  //   endLon = 129.1635;
  const startLat = originInfo.coords.lat;
  const startLon = originInfo.coords.lon;
  const endLat = destInfo.coords.lat;
  const endLon = destInfo.coords.lon;

  const { freeParking, noLimit, outputMin, outputMax, type, provider } =
    filterOptions;

  const [selectedStationIdx, setSelectedStationIdx] = useState(0);

  const routeOptions = [
    { value: "0", label: "차지추천" },
    { value: "1", label: "무료우선" },
    { value: "2", label: "최소시간" },
    { value: "4", label: "고속도로우선" },
    { value: "10", label: "최단거리" },
  ];
  // 날짜 세팅
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const avgTemp = getInterpolatedTemperature(month, day);

    setBatteryInfo((prev) => ({
      ...prev,
      temperature: avgTemp,
    }));
    setTempBatteryInfo((prev) => ({
      // 임시 상태도 초기화
      ...prev,
      temperature: avgTemp,
    }));

    console.log("📌 평균 기온 초기화 완료:", avgTemp);
  }, []); // 의존성 배열에서 온도 제거
  // 맵 세팅
  useEffect(() => {
    const map = new Tmapv2.Map("map_div", {
      center: new Tmapv2.LatLng(startLat, startLon),
      width: "100%",
      height: "700px",
      zoom: 16,
    });
    mapRef.current = map;

    // 출발지와 목적지 마커 추가 함수
    const addMarkers = () => {
      new Tmapv2.Marker({
        position: new Tmapv2.LatLng(startLat, startLon),
        icon: "/img/myLocationIcon/currentLocation.png",
        iconSize: new window.Tmapv2.Size(48, 72),
        map,
      });
      new Tmapv2.Marker({
        position: new Tmapv2.LatLng(endLat, endLon),
        icon: "/img/myLocationIcon/currentLocation.png",
        iconSize: new window.Tmapv2.Size(48, 72),
        map,
      });
    };

    addMarkers();
  }, [startLat, startLon, endLat, endLon]); // 의존성 배열에 좌표 추가

  useEffect(() => {
    // 조건: 맵 로딩 완료 && 평균 온도 세팅 완료
    if (mapRef.current && batteryInfo.temperature !== 15) {
      console.log("📍 자동 경로 추천 시작");
      requestRoute();
    }
  }, [mapRef.current, batteryInfo.temperature]);

  const resetMap = () => {
    drawnPolylines.forEach((polyline) => polyline.setMap(null));
    setDrawnPolylines([]);
    waypointMarkers.forEach((marker) => marker.setMap(null)); // ←마커 테스트 추가
    setWaypointMarkers([]); // <- 마커 테스트 추가
    setWaypointsLatLng([]); // <- 웨이포인트 위경도 리스트 초기화
    setRouteResult("");
  };

  const drawLineSegment = (map, path, color) => {
    const polyline = new Tmapv2.Polyline({
      path: path,
      strokeColor: color,
      strokeWeight: 6,
      map: map,
    });
    setDrawnPolylines((prev) => [...prev, polyline]);
  };

  const drawRouteLine = (map, arrPoint, traffic) => {
    if (!traffic || traffic.length === 0) {
      drawLineSegment(map, arrPoint, "#06050D");
      return;
    }

    const trafficColors = [
      "#06050D",
      "#61AB25",
      "#FFFF00",
      "#E87506",
      "#D61125",
    ];
    let tInfo = traffic.map(([start, end, index]) => ({
      startIndex: start,
      endIndex: end,
      trafficIndex: index,
    }));

    if (tInfo[0].startIndex > 0) {
      drawLineSegment(map, arrPoint.slice(0, tInfo[0].startIndex), "#06050D");
    }

    tInfo.forEach((info) => {
      const section = arrPoint.slice(info.startIndex, info.endIndex + 1);
      const color = trafficColors[info.trafficIndex] || "#06050D";
      drawLineSegment(map, section, color);
    });
  };

  // ******************************************************
  // 경로에 맞는 추천소 추천 시작
  // ******************************************************
  const requestRoute = async () => {
    // 1. 맵 초기화
    resetMap();
    // 2. selectedPriority 최신 값 반영
    const payload = {
      freeParking: filterOptions.freeParking,
      noLimit: filterOptions.noLimit,
      outputMin: filterOptions.outputMin,
      outputMax: filterOptions.outputMax,
      type: filterOptions.type,
      provider: filterOptions.provider,
      priority: selectedPriority, // 👈 사용자가 선택한 우선순위
    };

    console.log();

    // 3. tmap 경로안내 api 호출
    const res = await fetch(
      "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          appKey: "rzCNpiuhIX5l0dwT9rvQ93GRc22mFn6baRSvJYFl",
        },
        body: new URLSearchParams({
          startX: startLon,
          startY: startLat,
          endX: endLon,
          endY: endLat,
          reqCoordType: "WGS84GEO",
          resCoordType: "EPSG3857",
          searchOption,
          trafficInfo: "Y",
        }),
      }
    );

    const data = await res.json();
    const routeInfo = handleRouteResponse(data);
    if (!routeInfo) return; // 실패 방지

    const {
      highwayKm,
      cityKm,
      averageWeight,
      totalDistance,
      totalTime,
      totalFare,
    } = routeInfo;
    const baseTime = routeInfo.totalTime; // 기본 경로 시간 저장!

    const {
      level: batteryLevelPercent,
      capacity: batteryCapacity,
      efficiency: baseEfficiency,
      temperature,
      chargeLimit,
      targetLevel,
    } = batteryInfo;

    // 4. 웨이포인트 계산
    let accumulatedDistance = 0;
    const WAYPOINT_INTERVAL = 2000; // 웨이포인트 간격 10km: 10000
    let nextTarget = WAYPOINT_INTERVAL;
    let waypoints = [];
    let latlngList = [];

    for (let f of data.features) {
      if (f.geometry.type !== "LineString") continue;
      const coords = f.geometry.coordinates;

      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, y1] = coords[i];
        const [x2, y2] = coords[i + 1];
        const pt1 = Tmapv2.Projection.convertEPSG3857ToWGS84GEO(
          new Tmapv2.Point(x1, y1)
        );
        const pt2 = Tmapv2.Projection.convertEPSG3857ToWGS84GEO(
          new Tmapv2.Point(x2, y2)
        );

        const segmentDistance = haversineDistance(
          pt1._lat,
          pt1._lng,
          pt2._lat,
          pt2._lng
        );

        let remaining = nextTarget - accumulatedDistance;
        while (remaining < segmentDistance) {
          const ratio = remaining / segmentDistance;
          const interpolatedX = x1 + (x2 - x1) * ratio;
          const interpolatedY = y1 + (y2 - y1) * ratio;
          waypoints.push([interpolatedX, interpolatedY]);

          // 웨이포인트 마커 추가
          // latlng : WGS84GEO 방식 위경도를 지닌 객체
          const latlng = Tmapv2.Projection.convertEPSG3857ToWGS84GEO(
            new Tmapv2.Point(interpolatedX, interpolatedY)
          );
          //전역 변수로 WGS84GEO 좌표(latlng)들을 저장 -> 충전소 API용도
          latlngList.push({ lat: latlng._lat, lng: latlng._lng });

          // const marker = new Tmapv2.Marker({
          //   position: new Tmapv2.LatLng(latlng._lat, latlng._lng),
          //   map: mapRef.current,
          //   icon: "/img/pointer/redMarker.png",
          //   iconSize: new Tmapv2.Size(24, 24),
          // });
          // setWaypointMarkers((prev) => [...prev, marker]);
          // 마커 추가 끝

          nextTarget += WAYPOINT_INTERVAL; // 웨이포인트 간격
          remaining = nextTarget - accumulatedDistance;
        }

        accumulatedDistance += segmentDistance;
      }
    }
    //최종 웨이포인트 계산이 끝난 후 저장
    const hasHighway = routeInfo.highwayKm > 0; // 고속도로 여부 추가

    setWaypointsLatLng(latlngList);

    // console.log("위경도 웨이포인트 리스트:", latlngList);

    // 5. 충전소 호출 전에 주행 가능 거리 계산

    const tempFactor = getTemperatureWeight(temperature);

    const roadFactor = calculateRoadWeightByVehicle(
      userVehicle.cityEv,
      userVehicle.highwayEv,
      routeInfo.cityKm,
      routeInfo.highwayKm,
      routeInfo.totalTime
    );

    const reachableDistance =
      (batteryLevelPercent / 100) *
      batteryCapacity *
      baseEfficiency *
      tempFactor *
      roadFactor;

    console.log(
      "🧮 계산된 주행 가능 거리:",
      reachableDistance.toFixed(1),
      "km (온도계수:",
      tempFactor,
      "도로계수:",
      roadFactor,
      ")"
    );

    // 6.reachableDistance 안에 속하는 웨이포인트에서만 충전소 호출
    const reachableCount = Math.floor(
      (reachableDistance * 1000) / WAYPOINT_INTERVAL
    );
    const includedList = latlngList.slice(0, reachableCount);

    console.log("🧮 예상 주행 가능 거리:", reachableDistance.toFixed(1), "km");
    // console.log("🚩 포함된 웨이포인트 수:", includedList.length, "개");

    // 7. 웨이포인트 근처 충전소 호출 + 반경기반 필터링 + 점수화 필터링 + 우회시간 필터링
    handleFindNearbyStations(
      includedList,
      hasHighway,
      payload,
      baseTime,
      { lat: startLat, lng: startLon },
      { lat: endLat, lng: endLon },
      totalDistance / 1000
    );
  };

  // ******************************************************
  // 경로에 맞는 추천소 끝!!!!
  // ******************************************************

  const handleRouteResponse = (response) => {
    const resultData = response.features;
    if (!resultData) return;

    let highwayDistance = 0,
      cityDistance = 0;
    resultData.forEach(({ geometry, properties }) => {
      if (geometry.type === "LineString") {
        const dist = properties.distance || 0;
        properties.roadType === 0
          ? (highwayDistance += dist)
          : (cityDistance += dist);
        const coords = geometry.coordinates.map(([x, y]) =>
          Tmapv2.Projection.convertEPSG3857ToWGS84GEO(new Tmapv2.Point(x, y))
        );
        drawRouteLine(mapRef.current, coords, geometry.traffic);
      }
    });

    const HIGHWAY_WEIGHT = 0.9;
    const CITY_WEIGHT = 1.1;
    const highwayKm = highwayDistance / 1000;
    const cityKm = cityDistance / 1000;
    const totalKm = highwayKm + cityKm;
    const averageWeight =
      totalKm > 0
        ? (highwayKm / totalKm) * HIGHWAY_WEIGHT +
          (cityKm / totalKm) * CITY_WEIGHT
        : 1.0;

    const props = resultData[0].properties;
    let resultText = `총 거리 : ${(props.totalDistance / 1000).toFixed(1)}km`;
    resultText += `, 총 시간 : ${(props.totalTime / 60).toFixed(0)}분`;
    resultText += `, 총 요금 : ${props.totalFare.toLocaleString()}원`;
    resultText += `<br> 고속도로 거리: ${highwayKm.toFixed(1)}km`;
    resultText += `<br> 도심 거리: ${cityKm.toFixed(1)}km`;
    resultText += `<br> 도로 유형별 평균 전비 가중치: ${averageWeight.toFixed(
      3
    )}`;
    setRouteResult(resultText);

    return {
      highwayKm,
      cityKm,
      averageWeight,
      totalDistance: props.totalDistance,
      totalTime: props.totalTime,
      totalFare: props.totalFare,
    };
  };

  //웨이포인트 리스트 기반 충전소 필터링 함수
  const handleFindNearbyStations = async (
    latlngList,
    hasHighway,
    payload,
    baseTime,
    originCoords,
    destCoords,
    totalDistanceKm
  ) => {
    // console.log("출발-목적지 거리: ", totalDistanceKm);
    // console.log("출발 위경도: ", originCoords);
    // console.log("도착 위경도: ", destCoords);

    // 1. 기존 추천 마커 제거
    stationMarkers.forEach((marker) => marker.setMap(null));
    setStationMarkers([]);

    // 2. 웨이포인트, 전체경로 구간별로 10개 후보 충전소 선별
    const res = await fetch("/api/station/getStationsNearWaypoints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        waypoints: latlngList,
        highway: hasHighway,
        origin: originCoords,
        dest: destCoords,
        distance: totalDistanceKm,
        ...payload, // 전개 연산자로 편입
      }),
    });

    const data = await res.json();

    // 3.각 충전소별 출발지와 도착지 설정 (위에서 정의한 startLat/startLon 등 사용)
    const start = { lat: startLat, lng: startLon };
    const end = { lat: endLat, lng: endLon };

    // 4. 각 충전소에 대해 detourTime 병렬 호출
    const evaluatedStations = await Promise.all(
      data.map(async (station) => {
        const { totalTime, totalFare, totalDistance } = await getDetourTime(
          start,
          station,
          end
        ); // 전체 경유 시간
        const detourTime = baseTime != null ? totalTime - baseTime : null; // 기본 경로 시간과의 차이
        return {
          statId: station.statId,
          lat: station.lat,
          lng: station.lng,
          statNm: station.statNm,
          totalTime,
          detourTime,
          totalFare,
          totalDistance,
        };
      })
    );

    // 5. 테스트: 우회시간 기준 정렬 Top 5 추출
    evaluatedStations.sort((a, b) => a.detourTime - b.detourTime);
    const topStations = evaluatedStations.slice(0, 5);

    // 6. topstations들 실시간 충전소 사용가능 여부 확인
    const stationsWithStatus = await Promise.all(
      topStations.map(async (station) => {
        const status = await getStationStatus(
          station.statId,
          station.totalDistance
        );
        return { ...station, ...status };
      })
    );
    console.log("[1차] 최종5개 충전소 목록:", stationsWithStatus);

    // 7. 경유 충전소에서 최종목적지까지 도달 가능 여부 판단.
    const finalStations = [];

    // 최종 충전소들 하나씩 돌면서 가능여부 판단
    for (const station of stationsWithStatus) {
      const chargedBattery = batteryInfo.chargeLimit;
      const batteryAfterChargeKm =
        (chargedBattery / 100) * batteryInfo.capacity * batteryInfo.efficiency;
      const remainingKm = totalDistanceKm - station.totalDistance / 1000;

      if (batteryAfterChargeKm >= remainingKm) {
        finalStations.push({ ...station, secondHop: null });
      } else {
        const closestIdx = waypointsLatLng.reduce(
          (bestIdx, wp, idx) => {
            const dist = haversineDistance(
              station.lat,
              station.lng,
              wp.lat,
              wp.lng
            );
            return dist < bestIdx.dist ? { idx, dist } : bestIdx;
          },
          { idx: -1, dist: Infinity }
        ).idx;

        const remainingWaypoints =
          closestIdx >= 0
            ? waypointsLatLng.slice(closestIdx + 1)
            : waypointsLatLng;

        const subWaypoints = remainingWaypoints.filter((wp) => {
          const distFromFirst = haversineDistance(
            station.lat,
            station.lng,
            wp.lat,
            wp.lng
          );
          return distFromFirst <= batteryAfterChargeKm;
        });
        const secondCandidates = await fetch(
          "/api/station/getStationsNearWaypoints",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              waypoints: subWaypoints,
              highway: hasHighway,
              origin: { lat: station.lat, lng: station.lng },
              dest: destCoords,
              distance: remainingKm,
              ...payload,
            }),
          }
        ).then((r) => r.json());

        const secondHop = secondCandidates?.[0] ?? null;

        // 2차 충전소까지 도착 시간 및 충전 시간 계산 (기본값 null)
        let secondHopTime = null;
        let secondHopChargingTime = null;

        if (secondHop) {
          const { totalTime: hopTime } = await getDetourTime(
            { lat: station.lat, lng: station.lng },
            secondHop,
            end
          );
          secondHopTime = hopTime ?? null;

          const hopBatteryPercent = batteryInfo.chargeLimit; // 동일한 충전 한도 기준
          const hopArrivalPercent = estimateArrivalBattery(
            hopBatteryPercent,
            (secondHop.distance ?? 0) / 1000,
            batteryInfo.efficiency,
            batteryInfo.capacity
          );

          const hopChargingTime = estimateChargingTime(
            batteryInfo.capacity,
            hopArrivalPercent,
            batteryInfo.chargeLimit,
            secondHop.output ?? 50
          );

          secondHopChargingTime = hopChargingTime;
        }

        finalStations.push({
          ...station,
          secondHop,
          secondHopTime,
          secondHopChargingTime,
        });
      }
    }

    // 8. ui 부분 마커 표시
    const defaultSize = new Tmapv2.Size(48, 48);

    const newMarkers = finalStations.map((station) => {
      const marker = new Tmapv2.Marker({
        position: new Tmapv2.LatLng(station.lat, station.lng),
        icon: "/img/pointer/redMarker.png",
        iconSize: defaultSize,
        title: station.statNm,
        map: mapRef.current,
      });

      return marker;
    });
    setStationMarkers(newMarkers);

    // 9. ui 부분 카드용 데이터로 변환
    const cardData = finalStations.map((s) => ({
      name: s.statNm,
      totalTime: `${Math.round(s.totalTime / 60)}분`,
      detour: `${Math.round(s.detourTime / 60)}분`,
      fare:
        s.totalFare != null
          ? `${s.totalFare.toLocaleString()}원`
          : "요금 정보 없음",
      distance:
        s.totalDistance != null
          ? `${(s.totalDistance / 1000).toFixed(1)}km`
          : "거리 정보 없음",
      available: s.availableCount ?? null, // 서버에서 넘겨주는 필드명에 따라 수정
      total: s.totalCount ?? null, // "
      arrivalPercent: s.arrivalPercent ?? null,
      chargingTime: s.chargingTime != null ? `${s.chargingTime}분` : null,
      chargedPercent:
        s.chargedBatteryPercent != null ? `${s.chargedBatteryPercent}%` : null,
      secondHop: s.secondHop?.statNm ?? null,
      secondHopTime:
        s.secondHopTime != null
          ? `${Math.round(s.secondHopTime / 60)}분`
          : null,
      secondHopChargingTime:
        s.secondHopChargingTime != null ? `${s.secondHopChargingTime}분` : null,
    }));

    setStationCards(cardData); // 🔥 카드 리스트 세팅
  };

  // tmap 경로추천 api 활용 우회시간 구하기 함수
  const getDetourTime = async (start, station, end) => {
    const body = {
      startX: start.lng,
      startY: start.lat,
      endX: end.lng,
      endY: end.lat,
      passList: `${station.lng},${station.lat}`,
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      searchOption: "0",
    };

    const response = await fetch(
      "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          appKey: "rzCNpiuhIX5l0dwT9rvQ93GRc22mFn6baRSvJYFl",
        },
        body: JSON.stringify(body),
      }
    );

    const json = await response.json();

    const props = json.features?.[0]?.properties;
    if (!props) {
      console.warn("❗ 경유지 경로 정보 없음:", station);
      return { totalTime: null, totalFare: null, totalDistance: null };
    }

    return {
      totalTime: props.totalTime ?? null,
      totalFare: props.totalFare ?? null, // 요금 포함!
      totalDistance: props.totalDistance ?? null, // 미터 단위
    };
  };

  //프론트에서 충전소 상태 API 병렬 호출
  const getStationStatus = async (statId, distanceToStation) => {
    // 하용 키
    // const urlEncoded =
    //   "Wq%2BLPbmdYSbixCNUPkPm%2B3vWdEP6EHCS%2Fx%2FUNPAejzZCAlbDERkA7NZG3aqfORfDOT9cc1Sa7KgaXrpIzaaNAQ%3D%3D";
    // 혜진 키
    const urlEncoded =
      "5fh1iyaZ1J7cmI8j1rYxs8gqu38xTrq7tfhweTdERepTeyYpeyqRArG1Ja1re0szzkXY%2B%2Fu%2BeObGbhZ6f%2B41mg%3D%3D";

    const urlStr = `http://apis.data.go.kr/B552584/EvCharger/getChargerInfo?serviceKey=${urlEncoded}&numOfRows=9999&pageNo=1&statId=${statId}&dataType=JSON`;
    try {
      const res = await fetch(urlStr);
      if (!res.ok) {
        console.warn(
          `⚠️ 상태 가져오기 실패: ${station.statId} 응답코드: ${res.status}`
        );
        return {};
      }
      const data = await res.json();

      const items = data?.items?.item || [];

      const totalCount = items.length;
      const availableCount = items.filter((c) => c.stat === "2").length;

      // 🔧 전역 상태 활용
      const batteryCapacity = batteryInfo.capacity;
      const currentBattery = batteryInfo.level;
      const efficiency = batteryInfo.efficiency;
      const chargingSpeed = items[0]?.output ?? 50; // 없으면 50kW로 가정
      const targetBattery = batteryInfo.chargeLimit;
      // km → m → km 로 normalize
      const distanceKm = distanceToStation / 1000;

      const arrivalPercent = estimateArrivalBattery(
        currentBattery,
        distanceKm,
        efficiency,
        batteryCapacity
      );
      const chargingTime = estimateChargingTime(
        batteryCapacity,
        arrivalPercent,
        targetBattery,
        chargingSpeed
      );

      const chargedBatteryPercent = estimatePostChargeBattery(
        arrivalPercent,
        chargingSpeed, // items[0]?.output 또는 50
        chargingTime, // 위에서 방금 구한 값 (분)
        batteryCapacity // batteryInfo.capacity
      );

      return {
        availableCount,
        totalCount,
        chargers: items, // 👈 상세 충전기 정보들 전부 반환
        arrivalPercent: arrivalPercent.toFixed(1),
        chargingTime, // 분 단위
        chargedBatteryPercent: chargedBatteryPercent.toFixed(1),
      };
    } catch (err) {
      console.error(`⚠️ 상태 가져오기 실패: ${statId}`, err);
      return {
        availableCount: null,
        totalCount: null,
        chargers: [],
      };
    }
  };
  // 핸들러 예시
  function handleBack() {
    navigate("/");
  }

  // 스왑 기능 구현
  const handleSwap = () => {
    // 입력값과 좌표 스왑
    const tempInput = originInfo.input;
    const tempCoords = originInfo.coords;

    setOriginInfo({
      input: destInfo.input,
      coords: destInfo.coords,
    });

    setDestInfo({
      input: tempInput,
      coords: tempCoords,
    });

    // 경로 재계산
    setTimeout(() => {
      requestRoute();
    }, 100); // 상태 업데이트 후 경로 재계산
  };

  function handleAddWaypoint() {}

  // 설정 적용 핸들러 추가
  const handleApplySettings = () => {
    setBatteryInfo(tempBatteryInfo); // 실제 상태 업데이트
    setShowSettings(false);
    requestRoute(); // 경로 재계산
  };

  return (
    <div className="recommend-route-root">
      {/* 상단 오버레이 */}
      <div className="route-top-overlay">
        <div className="route-inputs-wide">
          <div className="route-inputs-row">
            <button className="route-back-btn" onClick={handleBack}>
              &lt;
            </button>
            <input
              className="route-input"
              type="text"
              value={originInfo.input}
              placeholder="출발지 입력"
              readOnly
            />
            <button className="route-swap-btn" onClick={handleSwap}>
              ↕
            </button>
          </div>
          <div className="route-inputs-row">
            <span className="route-back-btn route-back-btn-placeholder"></span>
            <input
              className="route-input"
              type="text"
              value={destInfo.input}
              placeholder="도착지 입력"
              readOnly
            />
            <button
              className="route-addwaypoint-btn"
              onClick={handleAddWaypoint}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 경로추천 옵션 카드 슬라이드 - 오버레이 바깥, 지도 위에 */}
      <div className="route-option-slider-abs">
        <div className="route-option-slider">
          {routeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`route-option-card${
                searchOption === opt.value ? " selected" : ""
              }`}
              onClick={() => {
                setSearchOption(opt.value);
                requestRoute();
              }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowSettings(true)}
        className="route-settings-open-btn"
        aria-label="설정"
      >
        <span role="img" aria-label="설정">
          ⚙️
        </span>
      </button>

      <button
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.setZoom(8); // 줌아웃하여 전체 경로 보기
          }
        }}
        className="route-zoom-out-btn"
        aria-label="전체 경로 보기"
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M9 4H4V9"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M4 9L10 3"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M19 4H24V9"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M24 9L18 3"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M19 24H24V19"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M24 19L18 25"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9 24H4V19"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M4 19L10 25"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* 설정 패널 바깥 클릭 시 닫히는 오버레이 */}
      {showSettings && (
        <div className="route-overlay" onClick={() => setShowSettings(false)} />
      )}

      {/* 슬라이드 패널 */}
      <div className={`route-slide-panel ${showSettings ? "open" : ""}`}>
        {/* 뒤로가기 버튼 */}
        <button
          className="route-slide-back-btn"
          onClick={() => setShowSettings(false)}
        >
          ←
        </button>
        <h3>경로추천 옵션</h3>

        {/* 배터리 잔량 */}
        <div className="slider-group">
          <div className="slider-header">
            <label className="slider-label">배터리 잔량</label>
            <div className="slider-value">
              {tempBatteryInfo.level.toFixed(1)}%
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={tempBatteryInfo.level}
            onChange={(e) =>
              setTempBatteryInfo({
                ...tempBatteryInfo,
                level: Number(e.target.value),
              })
            }
            className="custom-slider"
          />
        </div>

        {/* 공인 전비 */}
        <div className="slider-group">
          <div className="slider-header">
            <label className="slider-label">공인 전비</label>
            <div className="slider-value">
              {tempBatteryInfo.efficiency.toFixed(1)} km/kWh
            </div>
          </div>
          <input
            type="range"
            min={3}
            max={10}
            step={0.1}
            value={tempBatteryInfo.efficiency}
            onChange={(e) =>
              setTempBatteryInfo({
                ...tempBatteryInfo,
                efficiency: Number(e.target.value),
              })
            }
            className="custom-slider"
          />
        </div>

        {/* 선호 충전 한도 */}
        <div className="slider-group">
          <div className="slider-header">
            <label className="slider-label">선호 충전 한도</label>
            <div className="slider-value">
              {tempBatteryInfo.chargeLimit?.toFixed(1) ?? 85}%
            </div>
          </div>
          <input
            type="range"
            min={60}
            max={100}
            step={0.1}
            value={tempBatteryInfo.chargeLimit ?? 85}
            onChange={(e) =>
              setTempBatteryInfo({
                ...tempBatteryInfo,
                chargeLimit: Number(e.target.value),
              })
            }
            className="custom-slider"
          />
        </div>

        {/* 희망 목적지 배터리 잔량 */}
        <div className="slider-group">
          <div className="slider-header">
            <label className="slider-label">희망 목적지 배터리 잔량</label>
            <div className="slider-value">
              {tempBatteryInfo.targetLevel?.toFixed(1) ?? 50}%
            </div>
          </div>
          <input
            type="range"
            min={10}
            max={80}
            step={0.1}
            value={tempBatteryInfo.targetLevel ?? 50}
            onChange={(e) =>
              setTempBatteryInfo({
                ...tempBatteryInfo,
                targetLevel: Number(e.target.value),
              })
            }
            className="custom-slider"
          />
        </div>

        {/* 배터리 용량 */}
        <div className="slider-group">
          <div className="slider-header">
            <label className="slider-label">배터리 용량</label>
            <div className="slider-value">{tempBatteryInfo.capacity} kWh</div>
          </div>
          <input
            type="range"
            min={20}
            max={120}
            step={1}
            value={tempBatteryInfo.capacity}
            onChange={(e) =>
              setTempBatteryInfo({
                ...tempBatteryInfo,
                capacity: Number(e.target.value),
              })
            }
            className="custom-slider"
          />
        </div>

        {/* 외부 온도 */}
        <div className="slider-group">
          <div className="slider-header">
            <label className="slider-label">외부 온도</label>
            <div className="slider-value">{tempBatteryInfo.temperature}℃</div>
          </div>
          <input
            type="range"
            min={-20}
            max={50}
            step={1}
            value={tempBatteryInfo.temperature}
            onChange={(e) =>
              setTempBatteryInfo({
                ...tempBatteryInfo,
                temperature: Number(e.target.value),
              })
            }
            className="custom-slider"
          />
        </div>

        {/* 충전소 선호 선택 */}
        <div className="priority-select-group">
          <button
            className={`priority-btn ${
              selectedPriority === "speed" ? "selected" : ""
            }`}
            onClick={() => setSelectedPriority("speed")}
          >
            속도 중시
          </button>
          <button
            className={`priority-btn ${
              selectedPriority === "reliability" ? "selected" : ""
            }`}
            onClick={() => setSelectedPriority("reliability")}
          >
            신뢰성 중시
          </button>
          <button
            className={`priority-btn ${
              selectedPriority === "comfort" ? "selected" : ""
            }`}
            onClick={() => setSelectedPriority("comfort")}
          >
            편의성 중시
          </button>
        </div>

        {/* 설정 적용하기 버튼 */}
        <button className="apply-settings-btn" onClick={handleApplySettings}>
          설정 적용하기
        </button>
      </div>

      {/* 지도 */}
      <div id="map_div" className="route-map-div"></div>

      {/* 하단 카드 슬라이드 */}
      <div className="station-card-slider">
        <div className="station-card-list">
          {stationCards.map((card, idx) => (
            <div
              key={idx}
              className={`station-card${
                selectedStationIdx === idx ? " selected" : ""
              }`}
              onClick={() => {
                setSelectedStationIdx(idx);

                const selectedMarker = stationMarkers[idx];
                if (selectedMarker) {
                  mapRef.current.setCenter(selectedMarker.getPosition());
                  mapRef.current.setZoom(17); // 확대까지
                }
              }}
            >
              <div
                className="station-card-title"
                style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}
              >
                {card.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 18, color: "#222" }}>
                  총: {card.totalTime}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#1976d2",
                    fontWeight: 600,
                    marginLeft: 8,
                  }}
                >
                  우회: {card.detour}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  fontSize: 14,
                  color: "#444",
                  marginBottom: 2,
                }}
              >
                <span>{card.distance}</span>
                <span>·</span>
                <span>{card.fare}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  fontSize: 14,
                  color: "#666",
                  marginBottom: 2,
                }}
              >
                <span>충전예상 {card.chargingTime}</span>
                <span>·</span>
                <span>충전후 {card.chargedPercent}%</span>
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "#1976d2",
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                {card.total === null
                  ? "🔌 충전기 정보 없음"
                  : `🔌 사용가능 ${card.available} / ${card.total}`}
              </div>
              {card.secondHop && (
                <div className="sub-card">
                  <p>2차 충전소: {card.secondHop}</p>
                  <p>도착까지: {card.secondHopTime}</p>
                  <p>충전시간: {card.secondHopChargingTime}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 네비연결(안내시작) 버튼 */}
      <button className="navi-start-btn">네비연결</button>
    </div>
  );
}
