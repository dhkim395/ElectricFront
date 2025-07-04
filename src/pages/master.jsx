import React, { useState } from "react";

export default function Master() {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [zscode, setZscode] = useState("");
  const [convertedZscode, setConvertedZscode] = useState("");

  const handleDBUpdate = async () => {
    console.log("요청 시작"); // ✅ 확인용
    try {
      const res = await fetch("/api/master/updateAllStations", {
        method: "POST",
      });
      console.log("응답 도착", res.status); // ✅ 응답 상태 확인
      const msg = await res.text();
      alert(msg);
    } catch (e) {
      console.error("에러 발생", e); // ✅ 에러 로그 확인
      alert("요청 실패!");
    }
  };

  const translateToZscode = async () => {
    try {
      const res = await fetch("/api/master/translateToZscode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.text();
      setConvertedZscode(data); // ← 여기만 변경
      //   alert(`변환된 ZSCODE: ${data}`);
    } catch (e) {
      console.error("ZSCODE 변환 실패", e);
      alert("ZSCODE 변환 실패");
    }
  };

  const handleDBUpdateOnlyOne = async () => {
    try {
      const res = await fetch("/api/master/updateOnlyOneZscode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ zscode }), // ✅ 위도/경도 전달
      });
      const msg = await res.text();
      alert(msg);
    } catch (e) {
      console.error("에러 발생", e);
      alert("요청 실패!");
    }
  };

  return (
    <div>
      <h2>관리자 페이지 입니다.</h2>
      <button onClick={handleDBUpdate}>전국 충전소 DB 업데이트 하기 </button>
      <br></br>
      <hr></hr>
      <br></br>
      <h3>위경도 to ZSCODE 변환</h3>
      <input
        type="text"
        placeholder="위도 (ex: 37.123)"
        value={lat}
        onChange={(e) => setLat(e.target.value)}
      />
      <input
        type="text"
        placeholder="경도 (ex: 127.123)"
        value={lng}
        onChange={(e) => setLng(e.target.value)}
      />
      <button onClick={translateToZscode}>ZSCODE로 변환!</button>
      <p>변환된 ZSCODE: {convertedZscode}</p>
      <br></br>
      <h3>ZSCODE 기반 충전소 갱신</h3>
      <input
        type="text"
        placeholder="ZSCODE"
        value={zscode}
        onChange={(e) => setZscode(e.target.value)}
      />
      <button onClick={handleDBUpdateOnlyOne}>해당 위치 충전소 DB 갱신</button>
    </div>
  );
}
