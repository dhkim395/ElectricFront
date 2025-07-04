import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import "./CarRegister.css";

const CarRegister = () => {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [trims, setTrims] = useState([]);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");
  const [nickname, setNickname] = useState("");

  const [connectors, setConnectors] = useState(null);
  const navigate = useNavigate();

  //토큰 확인
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    console.log("🔍 로컬스토리지 accessToken:", token);
  }, []);

  useEffect(() => {
    axios
      .get("/api/car/brands")
      .then((res) => setBrands(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      axios
        .get(`/api/car/models?brand=${selectedBrand}`)
        .then((res) => setModels(res.data))
        .catch((err) => console.error(err));
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedModel) {
      axios
        .get("/api/car/years", {
          params: {
            brand: selectedBrand,
            model: selectedModel,
          },
        })
        .then((res) => setYears(res.data))
        .catch((err) => console.error(err));
    }
  }, [selectedBrand, selectedModel]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) {
      axios
        .get("/api/car/trims", {
          params: {
            brand: selectedBrand,
            model: selectedModel,
            year: selectedYear,
          },
        })
        .then((res) => setTrims(res.data))
        .catch((err) => console.error(err));
    }
  }, [selectedBrand, selectedModel, selectedYear]);

  //커넥터 정보 조회
  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedTrim) {
      axios
        .get("/api/car/connectors", {
          params: {
            brand: selectedBrand,
            model: selectedModel,
            year: selectedYear,
            trim: selectedTrim,
          },
        })
        .then((res) => setConnectors(res.data))
        .catch((err) => {
          console.error("❌ 커넥터 조회 실패:", err);
          setConnectors(null);
        });
    } else {
      setConnectors(null); // 트림이 바뀌면 초기화
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedTrim]);

  const handleSubmit = async () => {
    const token = localStorage.getItem("accessToken");
    console.log("handleSubmit에서 accessToken:", token);

    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const carDataRes = await axios.get("/api/car/car-data-idx", {
        params: {
          brand: selectedBrand.trim(),
          model: selectedModel.trim(),
          year: parseInt(selectedYear),
          trim: selectedTrim.trim(),
        },
      });
      const carDataIdx = carDataRes.data.carDataIdx;

      const carData = {
        nickname,
        carDataIdx,
      };

      await axios.post("/api/member-car/register", carData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("차량이 등록되었습니다.");
      navigate("/mypage");
    } catch (err) {
      console.error("등록 실패:", err);
      alert("등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="car-register-container">
      <div className="top-link">
        <Link to="/home" className="home-link">
          <FaArrowLeft className="home-icon" />
        </Link>
      </div>
      <h2>🚗 차량 등록</h2>

      <div className="input-box">
        <label>닉네임</label>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </div>

      <div className="input-box">
        <label>Brand</label>
        <select
          onChange={(e) => setSelectedBrand(e.target.value)}
          value={selectedBrand}
        >
          <option value="">선택하세요</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="input-box">
        <label>Model</label>
        <select
          onChange={(e) => setSelectedModel(e.target.value)}
          value={selectedModel}
        >
          <option value="">선택하세요</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="input-box">
        <label>Year</label>
        <select
          onChange={(e) => setSelectedYear(e.target.value)}
          value={selectedYear}
        >
          <option value="">선택하세요</option>
          {years.map((y, idx) => (
            <option key={idx} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="input-box">
        <label>Trim</label>
        <select
          onChange={(e) => setSelectedTrim(e.target.value)}
          value={selectedTrim}
        >
          <option value="">선택하세요</option>
          {trims.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {connectors && (
        <div className="connector-box">
          <h4>지원 커넥터</h4>
          <ul>
            {Object.entries(connectors).map(([key, value]) => (
              <li key={key}>
                {key} : {value ? "지원" : "미지원"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="submit-btn" onClick={handleSubmit}>
        등록하기
      </button>
    </div>
  );
};

export default CarRegister;
