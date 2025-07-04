import React, { useEffect, useState, useMemo } from "react";
import { getUserInfo, logoutUser } from "../api/member";
import { getMyCars } from "../api/memberCar";
import { deleteMyCar } from "../api/memberCar";
import { useNavigate, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./Mypage.css";

export default function Mypage() {
  const [user, setUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem("accessToken"));

  useEffect(() => {
    getUserInfo(token)
      .then((res) => setUser(res))
      .catch(() => setMessage("사용자 정보를 불러오지 못했습니다."));

    getMyCars(token)
      .then((res) => setCars(res))
      .catch(() => console.warn("🚗 차량 정보를 불러오지 못했습니다."));
  }, [token]);

  const handleLogout = async () => {
    await logoutUser(token);
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  const handleDeleteCar = async (carIdx) => {
    const confirm = window.confirm("정말 이 차량을 삭제하시겠습니까?");
    if (!confirm) return;

    try {
      await deleteMyCar(carIdx, token);
      alert("차량이 삭제되었습니다.");
      // 새로고침 없이 목록 갱신
      setCars((prev) => prev.filter((c) => c.idx !== carIdx));
    } catch (error) {
      console.error("❌ 차량 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleEditProfile = () => navigate("/editprofile");
  const handleCarRegister = () => navigate("/carRegister");

  if (!user)
    return (
      <div className="loading-screen">
        <div className="seal-wrapper">
          <img
            src="/seal-swim.png"
            alt="로딩 중..."
            className="swimming-seal-img"
          />
          <div className="bubble" />
          <div className="bubble small" />
        </div>
        <p className="loading-text">충전 중입니다... 🔌</p>
      </div>
    );

  return (
    <div className="mypage-container">
      <div className="top-link">
        <Link to="/home" className="home-link">
          <FaArrowLeft className="home-icon" />
        </Link>
      </div>

      <h2>MyPage</h2>

      <div className="info-box">
        <div className="info-text">
          <p>
            <strong>아이디:</strong> {user.userId}
          </p>
          <p>
            <strong>이름:</strong> {user.userName}
          </p>
        </div>
        <button className="edit-btn" onClick={handleEditProfile}>
          회원정보 수정
        </button>
      </div>

      <hr />

      <h3>내 차량</h3>
      {cars.length > 0 ? (
        cars.map((car) => (
          <div key={car.idx} className="car-box existing">
            <div className="car-image" />
            <div className="car-text">
              <strong>{car.nickname}</strong>
              <p>
                {car.brand} {car.model} {car.year} {car.trim}
              </p>
              {car.isMain && <span className="main-badge">대표 차량</span>}
            </div>
            <button
              className="delete-car-btn"
              onClick={() => handleDeleteCar(car.idx)}
            >
              삭제
            </button>
          </div>
        ))
      ) : (
        <div className="car-box" onClick={handleCarRegister}>
          <div className="car-image" />
          <span className="car-text">내 전기차를 등록해보세요!</span>
        </div>
      )}

      <button className="logout-btn" onClick={handleLogout}>
        로그아웃
      </button>

      {message && <p className="message">{message}</p>}
    </div>
  );
}
