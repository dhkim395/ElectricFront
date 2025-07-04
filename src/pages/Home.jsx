import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAutocomplete, normalizeCoords, getStationMeta } from "../api/poi";
import axios from "axios";
import { motion } from "framer-motion";
import { handleZoomChange } from "../api/zoom";
import {
  faUser,
  faComments,
  faHeadset,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
import { getUserInfo, logoutUser } from "../api/member";

import {
  setStationNear,
  getStationNear,
  registerMapCenterListener,
  trackUserMovement,
} from "../api/map";
import {
  addFavorite,
  deleteFavorite,
  isFavoriteStation,
} from "../api/favorite";
import "./home.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders } from "@fortawesome/free-solid-svg-icons";
import { faLocationArrow } from "@fortawesome/free-solid-svg-icons";
import { faWaveSquare } from "@fortawesome/free-solid-svg-icons";

function timeAgo(lastTedt) {
  if (!lastTedt || lastTedt.length !== 14) return "정보 없음";

  const year = Number(lastTedt.slice(0, 4));
  const month = Number(lastTedt.slice(4, 6)) - 1;
  const day = Number(lastTedt.slice(6, 8));
  const hour = Number(lastTedt.slice(8, 10));
  const minute = Number(lastTedt.slice(10, 12));
  const second = Number(lastTedt.slice(12, 14));

  const lastDate = new Date(year, month, day, hour, minute, second);
  const now = new Date();
  const diffMs = now - lastDate;

  if (diffMs < 0) return "미래 시간";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffWeek < 4) return `${diffWeek}주 전`;
  if (diffMonth < 12) return `${diffMonth}개월 전`;
  if (diffYear >= 1) return `${diffYear}년 전`;

  return "정보 없음";
}

// === 충전 속도 옵션 배열 ===
const outputOptions = [0, 50, 100, 150, 200, 250, 300, 350];

// === 충전사업자 옵션 배열 ===  // 수정: providerOptions 추가
const providerOptions = [
  { code: "AC", label: "아우토크립트" },
  { code: "AH", label: "아하" },
  { code: "AL", label: "아론" },
  { code: "AM", label: "아마노코리아" },
  { code: "AP", label: "애플망고" },
  { code: "BA", label: "부안군" },
  { code: "BE", label: "브라이트에너지파트너스" },
  { code: "BG", label: "비긴스" },
  { code: "BK", label: "비케이에너지" },
  { code: "BN", label: "블루네트웍스" },
  { code: "BP", label: "차밥스" },
  { code: "BS", label: "보스시큐리티" },
  { code: "BT", label: "보타리에너지" },
  { code: "CA", label: "씨에스테크놀로지" },
  { code: "CB", label: "참빛이브이씨" },
  { code: "CC", label: "코콤" },
  { code: "CG", label: "서울씨엔지" },
  { code: "CH", label: "채움모빌리티" },
  { code: "CI", label: "쿨사인" },
  { code: "CN", label: "에바씨엔피" },
  { code: "CO", label: "한전케이디엔" },
  { code: "CP", label: "캐스트프로" },
  { code: "CR", label: "크로커스" },
  { code: "CS", label: "한국EV충전서비스센터" },
  { code: "CT", label: "씨티카" },
  { code: "CU", label: "씨어스" },
  { code: "CV", label: "채비" },
  { code: "DE", label: "대구공공시설관리공단" },
  { code: "DG", label: "대구시" },
  { code: "DL", label: "딜라이브" },
  { code: "DO", label: "대한송유관공사" },
  { code: "DP", label: "대유플러스" },
  { code: "DR", label: "두루스코이브이" },
  { code: "DS", label: "대선" },
  { code: "DY", label: "동양이엔피" },
  { code: "E0", label: "에너지플러스" },
  { code: "EA", label: "에바" },
  { code: "EB", label: "일렉트리" },
  { code: "EC", label: "이지차저" },
  { code: "EE", label: "이마트" },
  { code: "EG", label: "에너지파트너즈" },
  { code: "EH", label: "이앤에이치에너지" },
  { code: "EK", label: "이노케이텍" },
  { code: "EL", label: "엔라이튼" },
  { code: "EM", label: "evmost" },
  { code: "EN", label: "이엔" },
  { code: "EO", label: "E1" },
  { code: "EP", label: "이카플러그" },
  { code: "ER", label: "이엘일렉트릭" },
  { code: "ES", label: "이테스" },
  { code: "ET", label: "이씨티" },
  { code: "EV", label: "에버온" },
  { code: "EZ", label: "차지인" },
  { code: "FE", label: "에프이씨" },
  { code: "FT", label: "포티투닷" },
  { code: "G1", label: "광주시" },
  { code: "G2", label: "광주시" },
  { code: "GD", label: "그린도트" },
  { code: "GE", label: "그린전력" },
  { code: "GG", label: "강진군" },
  { code: "GN", label: "지에스커넥트" },
  { code: "GO", label: "유한회사 골드에너지" },
  { code: "GP", label: "군포시" },
  { code: "GR", label: "그리드위즈" },
  { code: "GS", label: "GS칼텍스" },
  { code: "HB", label: "에이치엘비생명과학" },
  { code: "HD", label: "현대자동차" },
  { code: "HE", label: "한국전기차충전서비스" },
  { code: "HL", label: "에이치엘비일렉" },
  { code: "HM", label: "휴맥스이브이" },
  { code: "HP", label: "해피차지" },
  { code: "HR", label: "한국홈충전" },
  { code: "HS", label: "홈앤서비스" },
  { code: "HW", label: "한화솔루션" },
  { code: "HY", label: "현대엔지니어링" },
  { code: "IC", label: "인천국제공항공사" },
  { code: "IK", label: "익산시" },
  { code: "IM", label: "아이마켓코리아" },
  { code: "IN", label: "신세계아이앤씨" },
  { code: "IO", label: "아이온커뮤니케이션즈" },
  { code: "IV", label: "인큐버스" },
  { code: "JA", label: "이브이시스" },
  { code: "JC", label: "제주에너지공사" },
  { code: "JD", label: "제주도청" },
  { code: "JE", label: "제주전기자동차서비스" },
  { code: "JH", label: "종하아이앤씨" },
  { code: "JJ", label: "전주시" },
  { code: "JN", label: "제이앤씨플랜" },
  { code: "JT", label: "제주테크노파크" },
  { code: "JU", label: "정읍시" },
  { code: "KA", label: "기아자동차" },
  { code: "KC", label: "한국컴퓨터" },
  { code: "KE", label: "한국전기차인프라기술" },
  { code: "KG", label: "KH에너지" },
  { code: "KH", label: "김해시" },
  { code: "KI", label: "기아자동차" },
  { code: "KJ", label: "순천시" },
  { code: "KL", label: "클린일렉스" },
  { code: "KM", label: "카카오모빌리티" },
  { code: "KN", label: "한국환경공단" },
  { code: "KO", label: "이브이파트너스" },
  { code: "KP", label: "한국전력" },
  { code: "KR", label: "이브이씨코리아" },
  { code: "KS", label: "한국전기차솔루션" },
  { code: "KT", label: "케이티" },
  { code: "KU", label: "한국충전연합" },
  { code: "L3", label: "엘쓰리일렉트릭파워" },
  { code: "LC", label: "롯데건설" },
  { code: "LD", label: "롯데이노베이트" },
  { code: "LH", label: "LG유플러스 볼트업(플러그인)" },
  { code: "LI", label: "엘에스이링크" },
  { code: "LT", label: "광성계측기" },
  { code: "LU", label: "LG유플러스 볼트업" },
  { code: "MA", label: "맥플러스" },
  { code: "ME", label: "환경부" },
  { code: "MO", label: "매니지온" },
  { code: "MR", label: "미래씨앤엘" },
  { code: "MS", label: "미래에스디" },
  { code: "MT", label: "모던텍" },
  { code: "MV", label: "메가볼트" },
  { code: "NB", label: "엔비플러스" },
  { code: "NE", label: "에너넷" },
  { code: "NH", label: "농협경제지주 신재생에너지센터" },
  { code: "NJ", label: "나주시" },
  { code: "NN", label: "이브이네스트" },
  { code: "NS", label: "뉴텍솔루션" },
  { code: "NT", label: "한국전자금융" },
  { code: "NX", label: "넥씽" },
  { code: "OB", label: "현대오일뱅크" },
  { code: "PA", label: "이브이페이" },
  { code: "PC", label: "파킹클라우드" },
  { code: "PE", label: "피앤이시스템즈" },
  { code: "PI", label: "GS차지비" },
  { code: "PK", label: "펌프킨" },
  { code: "PL", label: "플러그링크" },
  { code: "PM", label: "피라인모터스" },
  { code: "PS", label: "이브이파킹서비스" },
  { code: "PW", label: "파워큐브" },
  { code: "RE", label: "레드이엔지" },
  { code: "RS", label: "리셀파워" },
  { code: "S1", label: "에스이피" },
  { code: "SA", label: "설악에너텍" },
  { code: "SB", label: "소프트베리" },
  { code: "SC", label: "삼척시" },
  { code: "SD", label: "스칼라데이터" },
  { code: "SE", label: "서울시" },
  { code: "SF", label: "스타코프" },
  { code: "SG", label: "SK시그넷" },
  { code: "SH", label: "에스에이치에너지" },
  { code: "SJ", label: "세종시" },
  { code: "SK", label: "SK에너지" },
  { code: "SL", label: "에스에스기전" },
  { code: "SM", label: "성민기업" },
  { code: "SN", label: "서울에너지공사" },
  { code: "SO", label: "선광시스템" },
  { code: "SP", label: "스마트포트테크놀로지" },
  { code: "SR", label: "SK렌터카" },
  { code: "SS", label: "투이스이브이씨" },
  { code: "ST", label: "SK일렉링크" },
  { code: "SU", label: "순천시 체육시설관리소" },
  { code: "SZ", label: "SG생활안전" },
  { code: "TB", label: "태백시" },
  { code: "TD", label: "타디스테크놀로지" },
  { code: "TE", label: "테슬라" },
  { code: "TH", label: "태현교통" },
  { code: "TL", label: "티엘컴퍼니" },
  { code: "TM", label: "티맵" },
  { code: "TR", label: "한마음장애인복지회" },
  { code: "TS", label: "태성콘텍" },
  { code: "TU", label: "티비유" },
  { code: "TV", label: "아이토브" },
  { code: "UN", label: "유니이브이" },
  { code: "UP", label: "유플러스아이티" },
  { code: "US", label: "울산시" },
  { code: "VT", label: "볼타" },
  { code: "WB", label: "이브이루씨" },
  { code: "YC", label: "노란충전" },
  { code: "YY", label: "양양군" },
  { code: "ZE", label: "이브이모드코리아" },
].sort((a, b) => a.label.localeCompare(b.label, "ko"));

// 충전기 타입 설명 리스트
const chargerTypeOptions = [
  { code: "01", label: "DC 차데모" },
  { code: "02", label: "AC 완속" },
  { code: "03", label: "DC 차데모+AC3 상" },
  { code: "04", label: "DC 콤보" },
  { code: "05", label: "DC 차데모+DC 콤보" },
  { code: "06", label: "DC 차데모+AC3 상+DC 콤보" },
  { code: "07", label: "AC3 상" },
  { code: "08", label: "DC 콤보(완속)" },
  { code: "09", label: "NACS" },
  { code: "10", label: "DC 콤보+NACS" },
];

// === 리스트보기 전용 서버 호출 함수 ===
async function fetchStationList(filterOptions, lat, lon) {
  try {
    const resp = await axios.post("/api/station/getStationNear", {
      lat,
      lon,
      freeParking: filterOptions.freeParking,
      noLimit: filterOptions.noLimit,
      outputMin: filterOptions.outputMin,
      outputMax: filterOptions.outputMax,
      type: filterOptions.type,
      provider: filterOptions.provider,
    });
    return resp.data; // 수정: JSON 파싱된 배열 반환
  } catch (e) {
    console.error("리스트보기 호출 실패", e); // 수정: 에러 로깅
    return [];
  }
}

// =============================
// 🔹 자동완성 입력 컴포넌트
// =============================
function AutocompleteInput({ label, value = "", onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showList, setShowList] = useState(false);
  const [userFocused, setUserFocused] = useState(false); //사용자가 input을 직접 선택했는지 여부

  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const v = (value || "").trim();
    if (v.length < 2) {
      setSuggestions([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      const data = await fetchAutocomplete(value.trim());
      console.log("자동완성 결과:", data);
      setSuggestions(data);
      if (userFocused) {
        setShowList(true);
      }
    }, 300);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowList(false);
        setUserFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <label className="autocomplete-label"></label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`차지차지! 장소를 검색해보세요!`}
        autoComplete="off"
        onFocus={() => {
          if (suggestions.length > 2) setShowList(true);
          setUserFocused(true);
        }}
        className="autocomplete-input"
      />
      {showList && suggestions.length > 2 && (
        <ul className="autocomplete-list">
          {suggestions.map((item) => (
            <li
              key={`${item.name}-${item.lat}-${item.lon}`}
              onClick={() => {
                onSelect(item);
                setShowList(false);
                setUserFocused(false);
                setSuggestions([]);
              }}
              className="autocomplete-item"
            >
              <strong>{item.name}</strong>
              <br />
              <small>{item.address}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true); // 지도 로딩중 상태
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [memberCompany, setMemberCompany] = useState("ME");
  const memberCompanyRef = useRef("ME"); // ⬅️ 추가
  const [userFocused, setUserFocused] = useState(false);

  // 상태 추가: 리스트 보기 상태 및 충전소 리스트
  const [stations, setStations] = useState([]); // 충전소 리스트
  const [showList, setShowList] = useState(false); // 리스트 뷰 토글
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeMenu, setActiveMenu] = useState("mypage"); // 선택된 메뉴
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState("");

  // 전역 변수
  const [mode, setMode] = useState("search"); //검색창 구분
  const [searchInput, setSearchInput] = useState(""); //검색창 모드
  const centerMarkerRef = useRef(null); // ← 추가: 이동 중심 마커
  const originMarkerRef = useRef(null); // 출발지 마커
  const destMarkerRef = useRef(null); // 도착지 마커
  const originIconUrl = "/img/logos/start.png";
  const destIconUrl = "/img/logos/end.png";
  const defaultIconUrl = "/img/logos/default.png";
  const mapRef = useRef(null); //  // 지도를 담을 div DOM 참조용
  const mapInstance = useRef(null); // 생성된 지도 객체(Tmapv2.Map)를 저장
  const userMarkerRef = useRef(null); // 사용자 위치 마커 객체
  const markersRef = useRef([]); // 마커들을 저장할 ref 배열
  // 기본 중심 좌표 (// 실패 시 centerLat, centerLon은 기본값 유지)
  const centerLatRef = useRef(37.504198); // 역삼역 위도
  const centerLonRef = useRef(127.04894); // 역삼역 경도
  const [originInput, setOriginInput] = useState(""); //출발지 입력값
  const [destInput, setDestInput] = useState(""); //도착지 입력값
  const [selectedDestStation, setSelectedDestStation] = useState(null);
  const [selectedOriginStation, setSelectedOriginStation] = useState(null);
  const zoomMarkers = useRef([]);
  const [user, setUser] = useState(null);
  const token = useMemo(() => localStorage.getItem("accessToken"), []);

  useEffect(() => {
    if (!token) return;

    getUserInfo(token)
      .then((res) => setUser(res))
      .catch((err) => console.warn("사용자 정보를 불러오지 못했습니다.", err));
  }, [token]);

  const handleRegister = () => navigate("/register");
  const handleLogin = () => navigate("/login");

  const handleProtectedClick = (path) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요해요! 🐾");
      return;
    }
    navigate(path);
  };

  // 충전소 상태 info 접근s
  const [selectedStation, setSelectedStation] = useState(null); // ← 상태 추가

  const [activeDropdown, setActiveDropdown] = useState(null);

  // 드롭다운 버튼 토글 함수 개선 (같은 버튼 누르면 닫힘)
  const toggleDropdown = (menu) => {
    setActiveDropdown((prev) => (prev === menu ? null : menu));
  };

  // 드롭다운 외부 클릭/터치 시 닫기
  useEffect(() => {
    if (!activeDropdown) return;
    function handleClickOutside(e) {
      // 드롭다운 영역 내 클릭이면 무시
      const dropdowns = document.querySelectorAll(".dropdown, .filter-panel");
      for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i].contains(e.target)) return;
      }
      setActiveDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [activeDropdown]);

  const [filterOptions, setFilterOptions] = useState({
    freeParking: false,
    noLimit: false,
    outputMin: 0, // 이상
    outputMax: 350, // 이하
    type: chargerTypeOptions.map((option) => option.code), // 기본 모두 체크
    provider: providerOptions.map((o) => o.code),
  }); // 필터 옵션 상태

  const filterOptionsRef = useRef(filterOptions); // 최신 필터 상태 추적용
  const drawerRef = useRef(null); // 사이드 드로어 영역 참조
  const infoPanelRef = useRef(null);

  useEffect(() => {
    memberCompanyRef.current = memberCompany; // ⬅️ 상태가 변경될 때 ref도 갱신
  }, [memberCompany]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedDrawerOutside =
        showDrawer &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target);

      const clickedInfoPanelOutside =
        selectedStation &&
        infoPanelRef.current &&
        !infoPanelRef.current.contains(e.target);

      if (clickedDrawerOutside) setShowDrawer(false);
      if (clickedInfoPanelOutside) setSelectedStation(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDrawer, selectedStation]);

  const handleSearchSelect = (item, source = "search") => {
    const map = mapInstance.current;
    if (!map) return;

    const coords = normalizeCoords(item);
    const statId = item.statId || getStationMeta(coords).statId;

    const fullStation = stations.find((st) => st.statId === statId);

    const meta = fullStation || getStationMeta(coords);
    const position = new window.Tmapv2.LatLng(meta.lat, meta.lon);

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setMap(null);
      centerMarkerRef.current = null;
    }

    const marker = new window.Tmapv2.Marker({
      position,
      map,
      icon: "/img/myLocationIcon/currentLocation.png",
      iconSize: new window.Tmapv2.Size(48, 72),
    });
    marker.dataStatId = meta.statId;
    marker.originalIcon = marker.getIcon();
    centerMarkerRef.current = marker;

    marker.addListener("click", () => {
      const found = stations.find((st) => st.statId === meta.statId);
      setSelectedStation(found || meta);
    });

    markersRef.current.push({ data: meta, marker });
    setSelectedStation(meta);
    map.setCenter(position);
    map.setZoom(15);
    setSuggestions([]); // ✅ 자동완성 리스트 초기화
    setQuery("");

    if (source === "origin") {
      setOriginInput(meta.statNm);
      setSelectedOriginStation(meta);
    } else if (source === "dest") {
      setDestInput(meta.statNm);
      setSelectedDestStation(meta);
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    const preloadCache = async () => {
      try {
        const res = await axios.post("/api/station/cache/loadAllStations");
        console.log("✅ 서버 캐시 초기화 성공:", res.data);
      } catch (err) {
        console.error("🚨 캐시 초기화 실패:", err);
      }
    };

    preloadCache(); // 처음 앱 시작할 때 캐시 로딩
  }, []);

  // 앱 실행
  useEffect(() => {
    initTmap({ mapInstance, markersRef });
  }, []);

  useEffect(() => {
    filterOptionsRef.current = filterOptions; // filterOptions가 바뀔 때 최신값 저장
  }, [filterOptions]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("showList") === "true") {
      handleShowList(); // 리스트 자동 표시
    }
  }, []);

  // 리스트보기 핸들러
  const handleShowList = async () => {
    if (showList) {
      setShowList(false); // 이미 열려있으면 닫기
      return;
    }

    await setStationNear(centerLatRef.current, centerLonRef.current);
    const list = await fetchStationList(
      filterOptions,
      centerLatRef.current,
      centerLonRef.current
    );
    const top5 = list.slice(0, 5); // 🔥 상위 5개만 자르기
    setStations(top5);
    // setStations(list);
    setShowList(true);
  };
  //충전소 리스트 클릭시
  const handleStationClick = (station) => {
    const marker = markersRef.current.find(
      (m) => m.data?.statId?.toString() === station.statId?.toString()
    );

    if (marker) {
      window.Tmapv2.event.trigger(marker, "click");

      const map = mapInstance.current;
      if (map) {
        const pos = new window.Tmapv2.LatLng(station.lat, station.lng);
        map.setCenter(pos);
        map.setZoom(17);
      }
      setShowList(false);
      setSelectedStation(station);
    } else {
      console.warn("❗ 마커를 찾을 수 없습니다:", station.statId);
    }
  };
  // === inline 필터 적용 함수 ===
  const applyFiltersInline = async (options) => {
    await setStationNear(centerLatRef.current, centerLonRef.current);
    await getStationNear(
      centerLatRef.current,
      centerLonRef.current,
      mapInstance,
      markersRef,
      setSelectedStation,
      options,
      memberCompanyRef
    );
  };

  // 속도 선택 시 필터 즉시 적용
  const handleSpeedChange = (e) => {
    const { name, value } = e.target;
    setFilterOptions((prev) => {
      const next = { ...prev, [name]: Number(value) };
      if (next.outputMin > next.outputMax) {
        if (name === "outputMin") next.outputMax = next.outputMin;
        else next.outputMin = next.outputMax;
      }
      applyFiltersInline(next);
      return next;
    });
  };

  // 타입 체크박스 선택 시 필터 즉시 적용
  const handleInlineTypeChange = (e) => {
    const { checked, value } = e.target;
    setFilterOptions((prev) => {
      const setCodes = new Set(prev.type);
      if (checked) setCodes.add(value);
      else setCodes.delete(value);
      const next = { ...prev, type: Array.from(setCodes) };
      applyFiltersInline(next);
      return next;
    });
  };

  // 사업자 체크박스 선택 시 필터 즉시 적용
  const handleInlineProviderChange = (e) => {
    const { checked, value } = e.target;
    setFilterOptions((prev) => {
      const setCodes = new Set(prev.provider);
      if (checked) setCodes.add(value);
      else setCodes.delete(value);
      const next = { ...prev, provider: Array.from(setCodes) };
      applyFiltersInline(next);
      return next;
    });
  };

  const initTmap = async () => {
    // 1. 현재 위치 얻기
    try {
      const currentLocation = await getCurrentLocation();
      centerLatRef.current = currentLocation.lat;
      centerLonRef.current = currentLocation.lon;
    } catch (err) {
      console.warn("위치 기본값 사용:", err);
    }

    // 2. 지도 생성
    mapInstance.current = new window.Tmapv2.Map(mapRef.current, {
      center: new window.Tmapv2.LatLng(
        centerLatRef.current,
        centerLonRef.current
      ),
      width: "100%",
      height: "100vh", // 화면 전체 높이
      zoom: 16,
    });

    // 3. 최초 사용자 위치 마커 생성, 이동시 마커 움직임
    updateUserMarker(centerLatRef.current, centerLonRef.current);
    // 4. 프론트에서 현재 위치 전송 + 근처 충전소 세팅 함수
    await setStationNear(centerLatRef.current, centerLonRef.current);
    // 5. 저장 후 즉시 지도에 뿌리기 (추가)
    await getStationNear(
      centerLatRef.current,
      centerLonRef.current,
      mapInstance,
      markersRef,
      setSelectedStation,
      filterOptionsRef, // 필터 옵션 전달
      originMarkerRef,
      destMarkerRef,
      memberCompanyRef
    );
    onMapReady(); // 마커 다 그려진 후
    setTimeout(() => {
      setLoading(false); // 물개 퇴장!
    }, 4000); // 단위: ms (여기선 1초)

    console.log("전송할 필터옵션:", filterOptions);

    // 6. 이벤트 발생시마다 지도 중심 구하기(줌/드래그 후 서버 반영)
    registerMapCenterListener(
      mapInstance.current,
      setStationNear,
      getStationNear,
      mapInstance,
      markersRef,
      setSelectedStation,
      filterOptionsRef, // 항상 최신값 유지되도록 ref 전달
      originMarkerRef, // 추가
      destMarkerRef,
      memberCompanyRef
    );
    // 7. 실시간으로 사용자 움직임 감지
    // + sendCenterToServer 해서 중심 위경도 전달, 충전소 호출
    trackUserMovement(
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
    );
    setTimeout(() => {
      onMapReady(); // mapInstance.current 확실히 존재할 시점
      // setLoading(false); // 로딩 완료
    }, 0);
  };

  // ***현재 위치 구하는 함수***
  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("지원하지 않는 브라우저");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  //사용자 위치 마커 생성/업데이트 함수
  const updateUserMarker = (lat, lon) => {
    const map = mapInstance.current;
    if (!map) {
      console.warn("지도(map)가 아직 초기화되지 않았습니다.");
      return;
    }

    const position = new window.Tmapv2.LatLng(lat, lon);

    if (!userMarkerRef.current) {
      console.log("🎯 사용자 마커 새로 생성");
      userMarkerRef.current = new window.Tmapv2.Marker({
        position,
        icon: "/img/myLocationIcon/currentLocation.png",
        iconSize: new window.Tmapv2.Size(48, 72),
        map,
      });
    } else {
      console.log("✅ 사용자 마커 이동");
      userMarkerRef.current.setPosition(position);
    }
  };
  const handleOriginSelect = (item) => {
    const meta = getStationMeta(normalizeCoords(item));
    setOriginInput(meta.statNm);
    const map = mapInstance.current;

    if (map) {
      const position = new window.Tmapv2.LatLng(meta.lat, meta.lon);
      map.setCenter(position);
      map.setZoom(15);
      // setOrigin(meta); // 필요 시 위치 상태 저장
    }
    setUserFocused(false);
  };
  const handleDestSelect = (item) => {
    const meta = getStationMeta(normalizeCoords(item));
    setDestInput(meta.statNm);

    const map = mapInstance.current;
    if (map) {
      const position = new window.Tmapv2.LatLng(meta.lat, meta.lon);
      map.setCenter(position);
      map.setZoom(15);
    }
    // setDest(meta); // 필요 시 위치 상태 저장
    setUserFocused(false);
  };

  // 스왑함수
  const handleSwap = () => {
    if (!originMarkerRef.current || !destMarkerRef.current) return;

    const map = mapInstance.current;

    // 1. 위치 & statId 백업
    const originPos = originMarkerRef.current.getPosition();
    const destPos = destMarkerRef.current.getPosition();
    const originStatId = originMarkerRef.current.dataStatId;
    const destStatId = destMarkerRef.current.dataStatId;

    // 2. 기존 마커 제거
    originMarkerRef.current.setMap(null);
    destMarkerRef.current.setMap(null);

    // 3. 새 마커 생성
    const newOriginMarker = new window.Tmapv2.Marker({
      position: destPos,
      map,
      icon: "/img/pointer/redMarker.png",
      iconSize: new window.Tmapv2.Size(36, 54),
      iconAnchor: new window.Tmapv2.Point(18, 54),
    });
    newOriginMarker.dataStatId = destStatId;

    const newDestMarker = new window.Tmapv2.Marker({
      position: originPos,
      map,
      icon: "/img/pointer/redMarker.png",
      iconSize: new window.Tmapv2.Size(36, 54),
      iconAnchor: new window.Tmapv2.Point(18, 54),
    });
    newDestMarker.dataStatId = originStatId;

    // 4. 클릭 이벤트 부여
    newOriginMarker.addListener("click", () => {
      map.setCenter(newOriginMarker.getPosition());
    });
    newDestMarker.addListener("click", () => {
      map.setCenter(newDestMarker.getPosition());
    });

    // 5. 레퍼런스 교체
    originMarkerRef.current = newOriginMarker;
    destMarkerRef.current = newDestMarker;

    // 6. 입력창 스왑
    const tempInput = originInput;
    setOriginInput(destInput);
    setDestInput(tempInput);
  };

  // ** 패널 버튼 함수 **
  const handleSetOrigin = () => {
    if (!selectedStation || !mapInstance.current) return;

    const position = new window.Tmapv2.LatLng(
      selectedStation.lat,
      selectedStation.lon
    );

    // === 이전 출발지 마커 복원 ===
    if (originMarkerRef.current) {
      const prev = originMarkerRef.current;
      const el = prev.getElement?.();
      if (el) {
        const wrapper = el.querySelector("div"); // 정확한 내부 요소 선택
        if (wrapper) {
          wrapper.style.outline = "";
          wrapper.style.borderRadius = "";
        }
      }
      if (prev.originalIcon === "html") {
        prev.setMap(mapInstance.current); // 다시 지도에 붙이기
      } else if (prev.originalIcon) {
        prev.setIcon(prev.originalIcon); // 아이콘 복원
      } else {
        prev.setMap(null);
      }
      originMarkerRef.current = null;
    }

    // === markersRef 또는 centerMarkerRef에서 해당 마커 찾기 ===
    let targetMarker = null;

    const found = markersRef.current.find(
      (entry) => entry.data.statId === selectedStation.statId
    );
    if (found) {
      targetMarker = found.marker;
    } else if (
      centerMarkerRef.current &&
      centerMarkerRef.current.dataStatId === selectedStation.statId
    ) {
      targetMarker = centerMarkerRef.current;
    }

    if (targetMarker) {
      // 아이콘 백업하고 출발지 아이콘으로 변경
      targetMarker.originalIcon = targetMarker.getIcon();
      targetMarker.setIcon("/img/pointer/redMarker.png");
      originMarkerRef.current = targetMarker;
      // ✅ HTML 기반 마커라면 강조 스타일 적용
      const el = targetMarker.getElement?.();
      if (el) {
        const wrapper = el.querySelector("div"); // 가장 바깥 div 선택
        if (wrapper) {
          wrapper.style.outline = "3px solid #1976D2";
          wrapper.style.borderRadius = "12px";
        }
      }
    } else {
      // 마커가 없으면 새로 생성
      const marker = new window.Tmapv2.Marker({
        position,
        map: mapInstance.current,
        icon: "/img/pointer/redMarker.png",
        iconAnchor: new Tmapv2.Point(18, 48),
      });
      marker.dataStatId = selectedStation.statId;
      originMarkerRef.current = marker;
    }

    // === 출발지 상태 반영 ===
    setOriginInput(
      selectedStation.statNm ||
        selectedStation.name ||
        selectedStation.addr ||
        ""
    );

    setSelectedStation(null);
    setMode("route");
  };
  const handleSetDest = () => {
    if (!selectedStation || !mapInstance.current) return;

    const position = new window.Tmapv2.LatLng(
      selectedStation.lat,
      selectedStation.lon
    );

    // ✅ 출발지가 없는 경우: 현재 위치를 출발지로 설정
    if (!originMarkerRef.current) {
      const originLat = centerLatRef.current;
      const originLon = centerLonRef.current;
      const originPos = new window.Tmapv2.LatLng(originLat, originLon);

      const marker = new window.Tmapv2.Marker({
        position: originPos,
        map: mapInstance.current,
        // icon: "/img/logos/start.png",
        // iconAnchor: new Tmapv2.Point(18, 48),
      });

      originMarkerRef.current = marker;
      setOriginInput("현재 위치");
    }

    // === 이전 출발지 마커 복원 ===
    if (destMarkerRef.current) {
      const prev = destMarkerRef.current;
      const el = prev.getElement?.();
      if (el) {
        const wrapper = el.querySelector("div"); // 정확한 내부 요소 선택
        if (wrapper) {
          wrapper.style.outline = "";
          wrapper.style.borderRadius = "";
        }
      }
      if (prev.destlIcon === "html") {
        prev.setMap(mapInstance.current); // 다시 지도에 붙이기
      } else if (prev.destlIcon) {
        prev.setIcon(prev.destIcon); // 아이콘 복원
      } else {
        prev.setMap(null);
      }
      destMarkerRef.current = null;
    }

    // === markersRef 또는 centerMarkerRef에서 해당 마커 찾기 ===
    let targetMarker = null;

    const found = markersRef.current.find(
      (entry) => entry.data.statId === selectedStation.statId
    );
    if (found) {
      targetMarker = found.marker;
    } else if (
      centerMarkerRef.current &&
      centerMarkerRef.current.dataStatId === selectedStation.statId
    ) {
      targetMarker = centerMarkerRef.current;
    }

    if (targetMarker) {
      // 아이콘 백업하고 출발지 아이콘으로 변경
      targetMarker.destIcon = targetMarker.getIcon();
      targetMarker.setIcon("/img/pointer/redMarker.png");
      destMarkerRef.current = targetMarker;
      const el = targetMarker.getElement?.();
      if (el) {
        const wrapper = el.querySelector("div"); // 가장 바깥 div 선택
        if (wrapper) {
          wrapper.style.outline = "3px solid #1976D2";
          wrapper.style.borderRadius = "12px";
        }
      }
    } else {
      // 마커가 없으면 새로 생성
      const marker = new window.Tmapv2.Marker({
        position,
        map: mapInstance.current,
        icon: "/img/pointer/redMarker.png",
        iconAnchor: new Tmapv2.Point(18, 48),
      });
      marker.dataStatId = selectedStation.statId;
      destMarkerRef.current = marker;
    }

    // === 출발지 상태 반영 ===
    setDestInput(
      selectedStation.statNm ||
        selectedStation.name ||
        selectedStation.addr ||
        ""
    );
    setSelectedStation(null);
    setMode("route");
  };

  // 필터 설정 변경 핸들러
  const handleFilterChange = (e) => {
    const { name, type, checked, value } = e.target;

    if (name === "provider") {
      // 수정: provider 체크박스 토글
      setFilterOptions((prev) => {
        const setCodes = new Set(prev.provider);
        if (checked) setCodes.add(value);
        else setCodes.delete(value);
        return { ...prev, provider: Array.from(setCodes) };
      });
      return;
    }

    if (name === "type") {
      setFilterOptions((prev) => {
        const currentTypes = new Set(prev.type);
        if (checked) currentTypes.add(value);
        else currentTypes.delete(value);
        return { ...prev, type: Array.from(currentTypes) };
      });
    } else {
      setFilterOptions((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // 필터 적용 버튼 클릭 시
  const applyFilters = async () => {
    await setStationNear(centerLatRef.current, centerLonRef.current);
    await getStationNear(
      centerLatRef.current,
      centerLonRef.current,
      mapInstance,
      markersRef,
      setSelectedStation,
      filterOptions,
      originMarkerRef, // ← 반드시 추가
      destMarkerRef,
      memberCompanyRef
    );
    setActiveDropdown(null);
  };

  // === 선택 구간 텍스트 표시 ===
  const outputText =
    filterOptions.outputMin === 0 && filterOptions.outputMax === 350
      ? "전체"
      : `${filterOptions.outputMin}kW 이상 ~ ${filterOptions.outputMax}kW 이하`;

  const moveToCurrentLocation = async () => {
    const map = mapInstance.current;
    const userMarker = userMarkerRef.current;

    if (!map || !userMarker) {
      alert("지도가 초기화되지 않았거나, 사용자 위치가 설정되지 않았습니다.");
      return;
    }

    const position = userMarker.getPosition(); // 마커 위치 가져오기

    map.setCenter(position); // 지도 중심을 해당 위치로 이동

    // 중심 상태 업데이트 (선택)
    centerLatRef.current = position._lat;
    centerLonRef.current = position._lng;

    await setStationNear(position._lat, position._lng);
    await getStationNear(
      position._lat,
      position._lng,
      mapInstance,
      markersRef,
      setSelectedStation,
      filterOptionsRef.current,
      originMarkerRef,
      destMarkerRef,
      memberCompanyRef
    );
  };

  // 경로추천 버튼
  const handleRecommendClick = () => {
    if (!originInput.trim()) {
      alert("출발지를 입력해주세요.");
      return;
    }
    if (!destInput.trim()) {
      alert("도착지를 입력해주세요.");
      return;
    }
    if (!originMarkerRef.current || !destMarkerRef.current) {
      alert("출발지/도착지 마커가 설정되지 않았습니다.");
      return;
    }
    const originPos = originMarkerRef.current.getPosition();
    const destPos = destMarkerRef.current.getPosition();
    navigate("/recommendRoute", {
      state: {
        originCoords: { lat: originPos._lat, lon: originPos._lng },
        destCoords: { lat: destPos._lat, lon: destPos._lng },
        originInput,
        destInput,
        filterOptions,
      },
    });
  };

  // 즐겨찾기 toggleFavorite함수
  const toggleFavorite = async () => {
    if (!selectedStation) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      if (isFavorite) {
        await deleteFavorite(selectedStation.statId, token);
      } else {
        await addFavorite(selectedStation.statId, token);
      }
      setIsFavorite((prev) => !prev);
    } catch (err) {
      console.error("즐겨찾기 처리 중 오류:", err);
      alert("즐겨찾기는 로그인 이후에 가능해요!");
    }
  };

  // === 이상/이하 select 박스 핸들러 ===
  const handleOutputSelect = (e) => {
    const { name, value } = e.target;
    setFilterOptions((prev) => {
      let newState = { ...prev, [name]: Number(value) };
      // outputMin(이상) 이 outputMax(이하)보다 크면, 둘을 맞춰줌
      if (newState.outputMin > newState.outputMax) {
        if (name === "outputMin") newState.outputMax = newState.outputMin;
        else newState.outputMin = newState.outputMax;
      }
      return newState;
    });
  };

  useEffect(() => {
    console.log("activeDropdown 상태 변경됨:", activeDropdown);
  }, [activeDropdown]);

  const [roamingSearch, setRoamingSearch] = useState("");

  // 지도 Zoomin out //
  const onMapReady = () => {
    const map = mapInstance.current;
    if (!map) {
      console.warn("🗺️ mapInstance.current가 없습니다! onMapReady 실행 중단");
      return;
    }

    console.log("🧭 초기 줌 레벨:", map.getZoom());

    // 🔁 디바운스 함수 생성 (300ms)
    let debounceTimer = null;
    const debounceFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          console.log("🚀 마커 갱신 실행 (디바운스)");
          await handleZoomChange(
            mapInstance, // ✅ map이 아닌 ref 넘기기
            markersRef,
            setSelectedStation,
            filterOptionsRef,
            originMarkerRef,
            destMarkerRef,
            memberCompanyRef
          );
          console.log(
            "✅ 마커 갱신 완료:",
            markersRef.current?.length || 0,
            "개"
          );
        } catch (err) {
          console.error("❌ 마커 갱신 중 오류:", err);
        }
      }, 200); // ← 여기서 지연 시간 조절 가능
    };

    // 최초 1회 마커 로딩
    debounceFetch();

    // 이벤트 리스너 등록
    map.addListener("zoom_changed", () => {
      console.log("🔍 줌 레벨 변경:", map.getZoom());
      debounceFetch();
    });

    map.addListener("dragend", () => {
      console.log("🧭 지도 드래그 완료");
      debounceFetch();
    });
  };

  // 화면 부분
  return (
    <div style={{ position: "relative" }}>
      {loading && (
        <div className="splash-screen">
          <img
            src="/img/seal-driver.png"
            alt="차지차지 시작!"
            className="seal-icon"
          />
          <h1 className="splash-title">차지차지!</h1>
          <p className="splash-subtitle">전기차 라이프의 시작을 함께해요 ⚡</p>
        </div>
      )}

      {/* ─── 검색/경로 입력창 (지도 위 고정) ─── */}
      <div
        className="search-fixed-container"
        style={{
          zIndex: 1100,
          background: "transparent",
          padding: 0,
          margin: 0,
          width: "100%",
        }}
      >
        {mode === "search" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "8px 12px",
              border: "none",
              width: "100%",
              margin: 0,
              borderRadius: 0,
            }}
          >
            <button
              className="hamburger-button"
              onClick={() => setShowDrawer(true)}
              style={{
                background: "none",
                border: "none",
                fontSize: 26,
                color: "#1976d2",
                cursor: "pointer",
                marginRight: 6,
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
              aria-label="메뉴 열기"
            >
              ☰
            </button>
            <AutocompleteInput
              label=""
              value={searchInput}
              onChange={setSearchInput}
              onSelect={(item) => {
                handleSearchSelect(item, "search");
              }}
              inputStyle={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 16,
                color: "#1976d2",
                width: "100%",
                padding: 0,
                fontWeight: 500,
              }}
              placeholderStyle={{
                color: "#1976d2",
                opacity: 0.7,
              }}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "12px 12px 8px 12px",
              border: "none",
              width: "100%",
              margin: 0,
              borderRadius: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AutocompleteInput
                label="출발지"
                value={originInput}
                onChange={setOriginInput}
                onSelect={(item) => handleSearchSelect(item, "origin")}
                inputStyle={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 16,
                  color: "#1976d2",
                  width: "100%",
                  padding: 0,
                  fontWeight: 500,
                }}
                placeholderStyle={{
                  color: "#1976d2",
                  opacity: 0.7,
                }}
              />
              <button
                className="swap-button"
                onClick={handleSwap}
                style={{
                  background: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  marginLeft: 2,
                  cursor: "pointer",
                }}
                title="출발/도착 스왑"
              >
                ↕
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AutocompleteInput
                label="도착지"
                value={destInput}
                onChange={setDestInput}
                onSelect={(item) => handleSearchSelect(item, "dest")}
                inputStyle={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 16,
                  color: "#1976d2",
                  width: "100%",
                  padding: 0,
                  fontWeight: 500,
                }}
                placeholderStyle={{
                  color: "#1976d2",
                  opacity: 0.7,
                }}
              />
              <button
                className="add-dest-button"
                onClick={handleRecommendClick}
                style={{
                  background: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  marginLeft: 2,
                  cursor: "pointer",
                }}
                title="경로 추천"
              >
                <FontAwesomeIcon icon={faWaveSquare} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 필터 바 */}
      <div className="home-container">
        {/* 🔹 2. 햄버거 버튼 추가 */}
        <button
          className="hamburger-button"
          onClick={() => setShowDrawer(true)}
        >
          ☰
        </button>
        {/* 리스트보기 버튼 */}
        <button className="seal-button" onClick={handleShowList}>
          <svg
            className="book-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="4" width="18" height="16" rx="3" fill="#fff" />
            <rect
              x="5.5"
              y="6.5"
              width="13"
              height="11"
              rx="1.5"
              fill="#1976d2"
            />
            <rect x="7.5" y="8.5" width="9" height="7" rx="1" fill="#fff" />
            <rect
              x="9"
              y="10.5"
              width="6"
              height="1.5"
              rx="0.75"
              fill="#1976d2"
            />
            <rect x="9" y="13" width="4" height="1" rx="0.5" fill="#1976d2" />
          </svg>
        </button>
        {/* 지도 위 인라인 필터 바 */}
        <div className="inline-filter-bar">
          {/* 필터 아이콘 및 창 */}
          <div className="inline-filter-wrapper">
            <button
              onClick={() => toggleDropdown("filter")}
              className="filter-button"
            >
              <FontAwesomeIcon icon={faSliders} />
            </button>
          </div>
          <button onClick={() => toggleDropdown("speed")}>충전속도 ▾</button>
          <button onClick={() => toggleDropdown("type")}>충전타입 ▾</button>
          <button
            onClick={() => {
              toggleDropdown("provider");
            }}
          >
            충전사업자:{" "}
            {filterOptions.provider.length === providerOptions.length
              ? "전체"
              : filterOptions.provider.length === 0
              ? "선택안함"
              : `${filterOptions.provider.length}개`}{" "}
            ▾
          </button>
          <button onClick={() => toggleDropdown("memberCompany")}>
            로밍:{" "}
            {memberCompany
              ? providerOptions.find((opt) => opt.code === memberCompany)
                  ?.label || memberCompany
              : "선택안함"}{" "}
            ▾
          </button>
        </div>

        {/* 왼쪽에서 스르륵 나타나는 필터 패널 */}
        <motion.div
          className="filter-panel"
          initial={{ x: -400 }}
          animate={{ x: activeDropdown === "filter" ? 0 : -400 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            width: "70vw", // 화면 가로의 70%
            maxWidth: "400px", // 최대 너비 제한
            background: "white",
            boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
            zIndex: 3000,
            overflowY: "auto",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h4 style={{ margin: 0 }}>충전소 필터</h4>
            <button
              onClick={() => setActiveDropdown(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <label>
            <input
              type="checkbox"
              name="freeParking"
              checked={filterOptions.freeParking}
              onChange={handleFilterChange}
            />
            무료 주차만 보기
          </label>
          <label>
            <input
              type="checkbox"
              name="noLimit"
              checked={filterOptions.noLimit}
              onChange={handleFilterChange}
            />
            이용제한 없는 곳만 보기
          </label>

          {/* === 충전 속도 '이상/이하' 셀렉트 === */}
          <div
            style={{
              margin: "20px 0 0",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            충전속도
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "10px 0 0",
              flexWrap: "wrap",
            }}
          >
            <select
              name="outputMin"
              value={filterOptions.outputMin}
              onChange={handleOutputSelect}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 16,
                marginRight: 2,
                minWidth: 70,
              }}
            >
              {outputOptions.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "완속" : `${v}kW`}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 15, fontWeight: 500 }}>이상</span>
            <select
              name="outputMax"
              value={filterOptions.outputMax}
              onChange={handleOutputSelect}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 16,
                marginLeft: 8,
                minWidth: 70,
              }}
            >
              {outputOptions.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "완속" : `${v}kW`}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 15, fontWeight: 500 }}>이하</span>
          </div>
          <div
            style={{
              width: "100%",
              textAlign: "center",
              marginTop: 7,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                color: "#31ba81",
                background: "#ecfaf3",
                fontWeight: 600,
                fontSize: 14,
                padding: "4px 10px",
                borderRadius: 12,
                display: "inline-block",
                letterSpacing: 0.5,
              }}
            >
              {outputText}
            </span>
          </div>

          <fieldset>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <legend>충전기 타입:</legend>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={
                    filterOptions.type.length === chargerTypeOptions.length
                  }
                  onChange={(e) =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      type: e.target.checked
                        ? chargerTypeOptions.map((opt) => opt.code)
                        : [],
                    }))
                  }
                />
                <span className="slider round"></span>
              </label>
            </div>

            {chargerTypeOptions.map((option) => (
              <label
                key={option.code}
                style={{ display: "block", marginBottom: 4 }}
              >
                <input
                  type="checkbox"
                  name="type"
                  value={option.code}
                  checked={filterOptions.type.includes(option.code)}
                  onChange={handleInlineTypeChange}
                />
                {" " + option.label}
              </label>
            ))}
          </fieldset>

          {/* 사업자 필터 섹션 */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 16 }}>사업자</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={
                    filterOptions.provider.length === providerOptions.length
                  }
                  onChange={(e) =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      provider: e.target.checked
                        ? providerOptions.map((opt) => opt.code)
                        : [],
                    }))
                  }
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: 8,
                marginTop: 4,
              }}
            >
              {providerOptions.map((opt) => (
                <label
                  key={opt.code}
                  style={{
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    name="provider"
                    value={opt.code}
                    checked={filterOptions.provider.includes(opt.code)}
                    onChange={handleInlineProviderChange}
                  />
                  {" " + opt.label}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={applyFilters}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "20px",
              background: "#31ba81",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            필터 적용
          </button>
        </motion.div>

        {/* 필터 패널 바깥 영역 클릭 시 닫기 */}
        {activeDropdown === "filter" && (
          <div
            onClick={() => setActiveDropdown(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.3)",
              zIndex: 1000,
              cursor: "pointer",
            }}
          />
        )}

        {/* 지도 위에 표시될 드롭다운들 (speed/type/provider/memberCompany 모두 같은 레벨) */}
        {activeDropdown === "speed" && (
          <div
            className="dropdown speed-dropdown"
            style={{
              position: "absolute",
              top: "110px",
              left: 0,
              width: "100vw",
              maxWidth: "100vw",
              zIndex: 1500,
              background: "rgba(0, 128, 255, 0.65)",
              color: "#fff",
              border: "none",
              borderRadius: "16px",
              padding: "18px 12px",
              boxShadow: "0 4px 24px rgba(25,118,210,0.18)",
              minWidth: 0,
            }}
          >
            <select
              name="outputMin"
              value={filterOptions.outputMin}
              onChange={handleSpeedChange}
              style={{
                color: "#222",
                borderRadius: 8,
                padding: 8,
                fontSize: 16,
              }}
            >
              {outputOptions.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "완속" : `${v}kW`}
                </option>
              ))}
            </select>
            <span style={{ margin: "0 8px", color: "#fff" }}>~</span>
            <select
              name="outputMax"
              value={filterOptions.outputMax}
              onChange={handleSpeedChange}
              style={{
                color: "#222",
                borderRadius: 8,
                padding: 8,
                fontSize: 16,
              }}
            >
              {outputOptions.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "완속" : `${v}kW`}
                </option>
              ))}
            </select>
          </div>
        )}
        {activeDropdown === "type" && (
          <div
            className="dropdown charger-type-dropdown"
            style={{
              position: "absolute",
              top: "110px",
              left: 0,
              width: "100vw",
              maxWidth: "100vw",
              zIndex: 1500,
              background: "rgba(25,118,210,0.65)",
              color: "#222",
              border: "none",
              borderRadius: "16px",
              padding: "18px 12px",
              boxShadow: "0 4px 24px rgba(25,118,210,0.18)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                justifyContent: "flex-start",
              }}
            >
              {chargerTypeOptions.map((opt) => {
                // 임시 이모지 매핑
                let icon = "";
                if (
                  opt.label.includes("DC콤보") ||
                  opt.label.includes("DC 콤보")
                )
                  icon = "🔌";
                else if (opt.label.includes("차데모")) icon = "⚡";
                else if (opt.label.includes("AC")) icon = "🔋";
                else if (opt.label.includes("완속")) icon = "⏳";
                else if (opt.label.includes("수퍼차저")) icon = "🚀";
                else if (opt.label.includes("데스티네이션")) icon = "🏁";
                else if (opt.label.includes("NACS")) icon = "🌀";
                else icon = "🔌";
                const selected = filterOptions.type.includes(opt.code);
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      // 토글 방식
                      setFilterOptions((prev) => {
                        const exists = prev.type.includes(opt.code);
                        return {
                          ...prev,
                          type: exists
                            ? prev.type.filter((c) => c !== opt.code)
                            : [...prev.type, opt.code],
                        };
                      });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      border: selected
                        ? "2px solid #2196f3"
                        : "1.5px solid #b2dfdb",
                      background: selected ? "#e3f2fd" : "#fff",
                      color: selected ? "#1976d2" : "#222",
                      borderRadius: "20px",
                      padding: "4px 12px",
                      fontWeight: 600,
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: selected
                        ? "0 2px 8px rgba(33,150,243,0.08)"
                        : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "15px" }}>{icon}</span>
                    {opt.label
                      .replace("AC ", "AC")
                      .replace("DC ", "DC")
                      .replace("+", " + ")}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {activeDropdown === "provider" && (
          <div
            className="dropdown provider-dropdown"
            style={{
              position: "absolute",
              top: "110px",
              left: 0,
              width: "100vw",
              maxWidth: "100vw",
              zIndex: 1500,
              background: "rgba(25,118,210,0.65)",
              color: "#222",
              border: "none",
              borderRadius: "16px",
              padding: "18px 12px",
              boxShadow: "0 4px 24px rgba(25,118,210,0.18)",
              maxHeight: "340px",
              overflowY: "auto",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                justifyContent: "flex-start",
              }}
            >
              {providerOptions.map((opt) => {
                const selected = filterOptions.provider.includes(opt.code);
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      // 토글 방식
                      setFilterOptions((prev) => {
                        const exists = prev.provider.includes(opt.code);
                        return {
                          ...prev,
                          provider: exists
                            ? prev.provider.filter((c) => c !== opt.code)
                            : [...prev.provider, opt.code],
                        };
                      });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      border: selected
                        ? "2px solid #2196f3"
                        : "1.5px solid #b2dfdb",
                      background: selected ? "#e3f2fd" : "#fff",
                      color: selected ? "#1976d2" : "#222",
                      borderRadius: "20px",
                      padding: "4px 12px",
                      fontWeight: 600,
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: selected
                        ? "0 2px 8px rgba(33,150,243,0.08)"
                        : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {/* 로고 이미지 등은 추후 확장 가능 */}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {activeDropdown === "memberCompany" && (
          <div
            className="dropdown member-company-dropdown"
            style={{
              position: "absolute",
              top: "110px",
              left: 0,
              width: "100vw",
              maxWidth: "100vw",
              zIndex: 1500,
              background: "rgba(25,118,210,0.65)",
              color: "#fff",
              border: "none",
              borderRadius: "16px",
              padding: "18px 12px",
              boxShadow: "0 4px 24px rgba(25,118,210,0.18)",
              minWidth: 0,
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {/* 검색 입력란 - 드롭다운 맨 위에 배치 */}
            <input
              type="text"
              value={roamingSearch}
              onChange={(e) => setRoamingSearch(e.target.value)}
              placeholder="로밍사 검색..."
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: "16px",
                borderRadius: "12px",
                border: "none",
                marginBottom: "12px",
                color: "#222",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            />

            {/* 검색 결과만 표시되는 로밍사 목록 */}
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {providerOptions
                .filter(
                  (opt) =>
                    !roamingSearch.trim() ||
                    opt.label
                      .toLowerCase()
                      .includes(roamingSearch.trim().toLowerCase())
                )
                .map((opt) => (
                  <div
                    key={opt.code}
                    onClick={() => {
                      setMemberCompany(opt.code);
                      setActiveDropdown(null);
                      setRoamingSearch("");
                    }}
                    style={{
                      padding: "12px 16px",
                      marginBottom: "4px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      color: "#fff",
                      fontSize: "15px",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
            </div>

            {/* 검색 결과가 없을 때 메시지 */}
            {roamingSearch.trim() &&
              providerOptions.filter((opt) =>
                opt.label
                  .toLowerCase()
                  .includes(roamingSearch.trim().toLowerCase())
              ).length === 0 && (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#fff",
                    fontSize: "14px",
                    fontStyle: "italic",
                  }}
                >
                  검색 결과가 없습니다.
                </div>
              )}
          </div>
        )}

        {/* <h2>전기차 충전소 홈 </h2> */}
        <div id="map_div" ref={mapRef} className="map-container"></div>
        <motion.div
          className={`station-info-panel ${selectedStation ? "visible" : ""}`}
          ref={infoPanelRef}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            if (info.offset.y < -100) {
              setIsPanelExpanded(true); // 위로 끌었을 때 확장
            } else if (info.offset.y > 100) {
              setIsPanelExpanded(false); // 아래로 끌었을 때 축소
            }
          }}
          animate={{
            height: selectedStation ? (isPanelExpanded ? "90vh" : "30vh") : "0",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            overflowY: "auto",
            zIndex: 2000,
            position: "fixed",
            left: 0,
            right: 0,
          }}
        >
          <div
            className="drag-handle"
            onClick={() => setIsPanelExpanded((prev) => !prev)}
          ></div>

          {selectedStation && (
            <>
              {/* 상단: 충전소명 + 즐겨찾기 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* 예시 아이콘: 실제 아이콘/로고로 교체 가능 */}
                  <span style={{ fontSize: 22, marginRight: 2 }}>⚠️</span>
                  <span style={{ fontWeight: 700, fontSize: 19 }}>
                    {selectedStation.statNm}
                  </span>
                </div>
                <button
                  className={`favorite-button ${isFavorite ? "on" : ""}`}
                  onClick={toggleFavorite}
                  title="즐겨찾기"
                  style={{
                    fontSize: 22,
                    // background: "none",
                    // border: "none",
                    cursor: "pointer",
                  }}
                >
                  {isFavorite ? "⭐" : "☆"}
                </button>
              </div>

              {/* 지원 충전기 타입 뱃지 */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  margin: "6px 0 8px 0",
                }}
              >
                {[...(selectedStation.chargers || [])]
                  .map(
                    (c) =>
                      chargerTypeOptions.find((opt) => opt.code === c.chgerType)
                        ?.label || c.chgerType
                  )
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .map((label, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: "#f2f3f5",
                        color: "#555",
                        borderRadius: 8,
                        padding: "3px 12px",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </span>
                  ))}
              </div>

              {/* 충전 가능 여부, 급속/완속 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                {/* 충전 가능 여부 */}
                <span
                  style={{ color: "#31ba81", fontWeight: 700, fontSize: 17 }}
                >
                  {(() => {
                    const available = (selectedStation.chargers || []).some(
                      (c) => Number(c.stat) === 2
                    );
                    return available ? "충전가능" : "이용불가";
                  })()}
                </span>
                {/* 급속/완속 개수 */}
                <span style={{ color: "#222", fontWeight: 500, fontSize: 16 }}>
                  {(() => {
                    const fast = (selectedStation.chargers || []).filter(
                      (c) => Number(c.output) >= 50
                    ).length;
                    const slow = (selectedStation.chargers || []).filter(
                      (c) => Number(c.output) < 50
                    ).length;
                    return `급속 ${fast}/${fast}  완속 ${slow}/${slow}`;
                  })()}
                </span>
              </div>

              {/* 주차료, 이용제한, 가격 간략버전 */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  margin: "6px 0 10px 0",
                }}
              >
                {/* 출력(최대), 개방여부(임의), 주차료, 이용제한 */}
                {(() => {
                  const maxOutput = Math.max(
                    ...(selectedStation.chargers || []).map(
                      (c) => Number(c.output) || 0
                    )
                  );
                  return (
                    <span
                      style={{
                        background: "#f2f3f5",
                        color: "#222",
                        borderRadius: 16,
                        padding: "5px 16px",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      {maxOutput ? `${maxOutput}kW` : "출력정보없음"}
                    </span>
                  );
                })()}
                <span
                  style={{
                    background: "#f2f3f5",
                    color: "#222",
                    borderRadius: 16,
                    padding: "5px 16px",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {selectedStation.parkingFree === "Y"
                    ? "주차 무료"
                    : selectedStation.parkingFree === "N"
                    ? "주차 유료"
                    : "주차료정보없음"}
                </span>
                {selectedStation.limitDetail && (
                  <span
                    style={{
                      background: "#f2f3f5",
                      color: "#222",
                      borderRadius: 16,
                      padding: "5px 16px",
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    {selectedStation.limitDetail}
                  </span>
                )}
                {selectedStation.feeInfo &&
                  selectedStation.feeInfo.fastMemberPrice && (
                    <span
                      style={{
                        background: "#f2f3f5",
                        color: "#222",
                        borderRadius: 16,
                        padding: "5px 16px",
                        fontSize: 15,
                        fontWeight: 500,
                      }}
                    >
                      요금 {selectedStation.feeInfo.fastMemberPrice}원/kWh
                    </span>
                  )}
              </div>

              {/* 출발/도착/내비 버튼 */}
              <div style={{ display: "flex", gap: 10, margin: "12px 0 0 0" }}>
                <button
                  onClick={handleSetOrigin}
                  style={{
                    flex: 1,
                    background: "#fff",
                    border: "1.5px solid #d0d0d0",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 16,
                    padding: "10px 0",
                    color: "#222",
                    cursor: "pointer",
                  }}
                >
                  출발
                </button>
                <button
                  onClick={handleSetDest}
                  style={{
                    flex: 1,
                    background: "#fff",
                    border: "1.5px solid #d0d0d0",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 16,
                    padding: "10px 0",
                    color: "#222",
                    cursor: "pointer",
                  }}
                >
                  도착
                </button>
                <button
                  style={{
                    flex: 2,
                    background: "#1976d2",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 18,
                    padding: "10px 0",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 22 }}>↗</span> 내비 연결
                </button>
              </div>

              {/* 이하 기존 상세/슬라이드 구조 유지 */}
              {isPanelExpanded && (
                <div
                  className="extra-info"
                  style={{
                    padding: "0 0 12px 0",
                    maxHeight: "55vh",
                    overflowY: "auto",
                  }}
                >
                  {/* 충전기 정보: 급속/완속 분류, 가로 카드 슬라이드 */}
                  <div style={{ margin: "18px 0 10px 0" }}>
                    <div
                      style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}
                    >
                      충전기 정보
                    </div>
                    {/* 급속 카드 */}
                    {(() => {
                      const fastChargers = (
                        selectedStation.chargers || []
                      ).filter((c) => Number(c.output) >= 50);
                      if (fastChargers.length > 0)
                        return (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 15,
                                margin: "0 0 6px 2px",
                                color: "#1976d2",
                              }}
                            >
                              급속
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 14,
                                overflowX: "auto",
                                paddingBottom: 4,
                              }}
                            >
                              {fastChargers.map((c, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    minWidth: 180,
                                    maxWidth: 210,
                                    background: "#f7fafc",
                                    border: "2px solid #b2e0f7",
                                    borderRadius: 16,
                                    padding: "14px 16px",
                                    boxShadow:
                                      "0 2px 8px rgba(25,118,210,0.08)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 7,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 16,
                                      color: "#1976d2",
                                    }}
                                  >
                                    {c.output}kW
                                  </div>
                                  <div style={{ fontSize: 14, color: "#555" }}>
                                    {chargerTypeOptions.find(
                                      (opt) => opt.code === c.chgerType
                                    )?.label || c.chgerType}
                                  </div>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color:
                                        Number(c.stat) === 2
                                          ? "#31ba81"
                                          : "#d73567",
                                      fontSize: 15,
                                    }}
                                  >
                                    {Number(c.stat) === 2
                                      ? "충전가능"
                                      : "이용불가"}
                                  </div>
                                  <div style={{ fontSize: 13, color: "#888" }}>
                                    {c.lastTedt
                                      ? timeAgo(c.lastTedt) + " 종료"
                                      : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                    })()}
                    {/* 완속 카드 */}
                    {(() => {
                      const slowChargers = (
                        selectedStation.chargers || []
                      ).filter((c) => Number(c.output) < 50);
                      if (slowChargers.length > 0)
                        return (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 15,
                                margin: "0 0 6px 2px",
                                color: "#1976d2",
                              }}
                            >
                              완속
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 14,
                                overflowX: "auto",
                                paddingBottom: 4,
                              }}
                            >
                              {slowChargers.map((c, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    minWidth: 180,
                                    maxWidth: 210,
                                    background: "#f7fafc",
                                    border: "2px solid #b2e0f7",
                                    borderRadius: 16,
                                    padding: "14px 16px",
                                    boxShadow:
                                      "0 2px 8px rgba(25,118,210,0.08)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 7,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 16,
                                      color: "#1976d2",
                                    }}
                                  >
                                    {c.output}kW
                                  </div>
                                  <div style={{ fontSize: 14, color: "#555" }}>
                                    {chargerTypeOptions.find(
                                      (opt) => opt.code === c.chgerType
                                    )?.label || c.chgerType}
                                  </div>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color:
                                        Number(c.stat) === 2
                                          ? "#31ba81"
                                          : "#d73567",
                                      fontSize: 15,
                                    }}
                                  >
                                    {Number(c.stat) === 2
                                      ? "충전가능"
                                      : "이용불가"}
                                  </div>
                                  <div style={{ fontSize: 13, color: "#888" }}>
                                    {c.lastTedt
                                      ? timeAgo(c.lastTedt) + " 종료"
                                      : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                    })()}
                  </div>

                  {/* 요금 정보란 */}
                  <div
                    style={{
                      margin: "18px 0 0 0",
                      padding: "18px 0 0 0",
                      borderTop: "1.5px solid #e0e7ef",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 17,
                        marginBottom: 10,
                      }}
                    >
                      요금 정보
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                      {/* 급속 */}
                      <div
                        style={{
                          minWidth: 120,
                          flex: 1,
                          background: "#f7fafc",
                          border: "2px solid #b2e0f7",
                          borderRadius: 14,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#1976d2",
                            fontSize: 15,
                            marginBottom: 2,
                          }}
                        >
                          급속
                        </div>
                        <div style={{ fontSize: 14, color: "#222" }}>
                          회원가:{" "}
                          <b>
                            {selectedStation.feeInfo?.fastMemberPrice ??
                              "정보없음"}
                          </b>{" "}
                          원/kWh
                        </div>
                        <div style={{ fontSize: 14, color: "#222" }}>
                          비회원가:{" "}
                          <b>
                            {selectedStation.feeInfo?.fastNonmemberPrice ??
                              "정보없음"}
                          </b>{" "}
                          원/kWh
                        </div>
                      </div>
                      {/* 완속 */}
                      <div
                        style={{
                          minWidth: 120,
                          flex: 1,
                          background: "#f7fafc",
                          border: "2px solid #b2e0f7",
                          borderRadius: 14,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#1976d2",
                            fontSize: 15,
                            marginBottom: 2,
                          }}
                        >
                          완속
                        </div>
                        <div style={{ fontSize: 14, color: "#222" }}>
                          회원가:{" "}
                          <b>
                            {selectedStation.feeInfo?.lowMemberPrice ??
                              "정보없음"}
                          </b>{" "}
                          원/kWh
                        </div>
                        <div style={{ fontSize: 14, color: "#222" }}>
                          비회원가:{" "}
                          <b>
                            {selectedStation.feeInfo?.lowNonmemberPrice ??
                              "정보없음"}
                          </b>{" "}
                          원/kWh
                        </div>
                      </div>
                      {/* 로밍 */}
                      <div
                        style={{
                          minWidth: 120,
                          flex: 1,
                          background: "#f7fafc",
                          border: "2px solid #b2e0f7",
                          borderRadius: 14,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#1976d2",
                            fontSize: 15,
                            marginBottom: 2,
                          }}
                        >
                          로밍
                        </div>
                        <div style={{ fontSize: 14, color: "#222" }}>
                          {selectedStation.roamingInfo
                            ? selectedStation.roamingInfo
                            : "로밍 요금 정보 없음"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* extra-info 내부 하단에 신고/제보, 리뷰쓰기 버튼 */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      margin: "18px 0 0 0",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      style={{
                        flex: 1,
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 16,
                        padding: "12px 0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>📢</span> 신고/제보
                    </button>
                    <button
                      style={{
                        flex: 1,
                        background: "#fff",
                        color: "#1976d2",
                        border: "2px solid #b2e0f7",
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 16,
                        padding: "12px 0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>✏️</span> 리뷰 쓰기
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
        {showList && (
          <>
            {/* 오버레이 */}
            <div
              onClick={() => setShowList(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.25)",
                zIndex: 3400,
                cursor: "pointer",
                pointerEvents: showList ? "auto" : "none",
                display: showList ? "block" : "none",
              }}
            />
            <motion.div
              className="station-list-motion-container"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                height: "100vh",
                width: "85vw",
                maxWidth: 420,
                background: "#fff",
                zIndex: 3500,
                boxShadow: "-2px 0 10px rgba(0,0,0,0.10)",
                overflowY: "auto",
                padding: "24px 18px 32px 18px",
                borderRadius: "24px 0 0 24px",
                pointerEvents: showList ? "auto" : "none",
                display: showList ? "block" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0 }}>추천 충전소 리스트</h3>
                <button
                  onClick={() => setShowList(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
                  title="닫기"
                >
                  ✕
                </button>
              </div>
              <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
                {stations.map((st, idx) => (
                  <li
                    key={st.statId + idx}
                    className="station-item"
                    style={{
                      marginBottom: "12px",
                      borderBottom: "1px solid #eee",
                      paddingBottom: "8px",
                    }}
                  >
                    <div
                      onClick={() => handleStationClick(st)}
                      style={{
                        cursor: "pointer",
                        padding: "6px 4px",
                        borderRadius: "6px",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f9f9f9")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <strong>{st.statNm}</strong>{" "}
                      <span style={{ fontSize: "13px", color: "#888" }}>
                        ({st.bnm})
                      </span>
                      <br />
                      <span style={{ fontSize: "14px" }}>{st.addr}</span>
                      <br />
                      <span style={{ fontSize: "13px", color: "#666" }}>
                        점수: {st.recommendScore}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
        {/* 3. 사이드 드로어 */}
        {showDrawer && (
          <>
            {/* 오버레이 */}
            <div
              onClick={() => setShowDrawer(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.2)",
                zIndex: 1200,
                cursor: "pointer",
              }}
            />
            <div
              className="side-drawer"
              ref={drawerRef}
              style={{ zIndex: 1201 }}
            >
              {/* 상단: 프로필 + 로그인 */}
              <div className="drawer-top-row">
                <img
                  src="/img/profile-default.png"
                  alt="프로필"
                  className="profile-image"
                />
                <div className="login-links">
                  {user ? (
                    <div className="user-info-row">
                      <div className="user-name">{user.userName} 님</div>
                      <button
                        className="logout-button"
                        onClick={() => {
                          localStorage.removeItem("accessToken");
                          setUser(null);
                          window.location.reload();
                        }}
                      >
                        로그아웃
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="login-buttons-row">
                        <button
                          className="login-button"
                          onClick={handleRegister}
                        >
                          회원가입
                        </button>
                        <span className="divider">|</span>
                        <button className="login-button" onClick={handleLogin}>
                          로그인
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="drawer-welcome">오늘도 차지차지와 함께 😊</div>

              {/* 하단: 아이콘 + 메뉴 텍스트 2열 */}
              <div className="drawer-body">
                <div className="icon-column">
                  <div onClick={() => setActiveMenu("mypage")}>
                    <FontAwesomeIcon
                      icon={faUser}
                      className={`menu-icon ${
                        activeMenu === "mypage" ? "active-icon" : ""
                      }`}
                    />
                  </div>
                  <div onClick={() => setActiveMenu("community")}>
                    <FontAwesomeIcon
                      icon={faComments}
                      className={`menu-icon ${
                        activeMenu === "community" ? "active-icon" : ""
                      }`}
                    />
                  </div>
                  <div onClick={() => setActiveMenu("support")}>
                    <FontAwesomeIcon
                      icon={faHeadset}
                      className={`menu-icon ${
                        activeMenu === "support" ? "active-icon" : ""
                      }`}
                    />
                  </div>
                  <div onClick={() => setActiveMenu("settings")}>
                    <FontAwesomeIcon
                      icon={faCog}
                      className={`menu-icon ${
                        activeMenu === "settings" ? "active-icon" : ""
                      }`}
                    />
                  </div>
                </div>

                <div className="text-column">
                  {activeMenu === "mypage" && (
                    <div className="text-list">
                      <div
                        className="text-item"
                        onClick={() => handleProtectedClick("/mypage")}
                      >
                        MyPage
                      </div>
                      <div className="text-item">내가 쓴 글 보기</div>
                      <div className="text-item">충전소 제보 내역</div>
                    </div>
                  )}
                  {activeMenu === "community" && (
                    <div className="text-list">
                      <div
                        className="text-item"
                        onClick={() => navigate("/community")}
                      >
                        커뮤니티
                      </div>
                      <div className="text-item">정보공유</div>
                    </div>
                  )}
                  {activeMenu === "support" && (
                    <div className="text-list">
                      <div className="text-item">문의하기</div>
                      <div className="text-item">자주 묻는 질문</div>
                    </div>
                  )}
                  {activeMenu === "settings" && (
                    <div className="text-list">
                      <div className="text-item">알림 설정</div>
                      <div className="text-item">계정 설정</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <button
          className="current-location-button"
          onClick={moveToCurrentLocation}
          title="현위치로 이동"
        >
          <FontAwesomeIcon icon={faLocationArrow} />
        </button>
      </div>

      {/* 하단 고정 바: 커뮤니티, 즐겨찾기, 경로추천 */}
      <div
        style={{
          position: "fixed",
          left: 0,
          bottom: 0,
          width: "100%",
          zIndex: 1200,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none", // 하위 버튼만 클릭 가능하게
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "18px 18px 0 0",
            boxShadow: "0 -2px 16px rgba(0,0,0,0.12)",
            display: "flex",
            gap: "36px",
            padding: "16px 32px 20px 32px",
            margin: "0 12px 8px 12px",
            minWidth: 320,
            maxWidth: 480,
            width: "100%",
            justifyContent: "space-around",
            pointerEvents: "auto",
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 15,
              color: "#222",
              cursor: "pointer",
            }}
            onClick={() => navigate("/community")}
          >
            <span style={{ fontSize: 22, marginBottom: 2 }}>💬</span>
            커뮤니티
          </button>
          <button
            style={{
              background: "#1976d2",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontWeight: 600,
              fontSize: 15,
              padding: "8px 18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 2px 8px rgba(49,186,129,0.12)",
              cursor: "pointer",
            }}
            onClick={handleRecommendClick}
          >
            <span style={{ fontSize: 22, marginBottom: 2 }}>
              <FontAwesomeIcon icon={faWaveSquare} />
            </span>
            경로추천
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 15,
              color: "#222",
              cursor: "pointer",
            }}
            onClick={() => setActiveMenu("favorite")}
          >
            <span style={{ fontSize: 22, marginBottom: 2 }}>☆</span>
            즐겨찾기
          </button>
        </div>
      </div>
    </div>
  );
}
