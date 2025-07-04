import React, { useState } from "react";
import { registerUser } from "../api/member";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";
import { FaArrowLeft } from "react-icons/fa";

export default function Register() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await registerUser({ userId, password, userName });
      setMessage("회원가입 성공😁");
      navigate("/login");
    } catch (e) {
      setMessage("회원가입 실패😱");
    }
  };
  return (
    <div className="register-container">
      <div className="top-link">
        <Link to="/home" className="home-link">
          <FaArrowLeft className="home-icon" />
        </Link>
      </div>

      <h2>회원가입</h2>
      <p>
        아이디{" "}
        <input value={userId} onChange={(e) => setUserId(e.target.value)} />
      </p>
      <p>
        비밀번호{" "}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </p>
      <p>
        이름{" "}
        <input value={userName} onChange={(e) => setUserName(e.target.value)} />
      </p>
      <button onClick={handleRegister}>회원가입</button>
      <p className="message">{message}</p>

      <div className="bottom-link">
        이미 회원이신가요? <Link to="/login">로그인</Link>
      </div>
    </div>
  );
}
