import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

// 즐겨찾기 삭제 함수
const deleteFavorite = async (statId, token) => {
    return axios.delete("/api/favorite/delete", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: { statId },
    });
};

export default function FavoriteList() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavorites = async () => {
            const token = localStorage.getItem("accessToken");

            if (!token) {
                alert("로그인이 필요합니다.");
                return;
            }

            try {
                const res = await axios.get("/api/favorite/list", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setFavorites(res.data);
            } catch (err) {
                console.error("즐겨찾기 불러오기 실패:", err);
                alert("즐겨찾기 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, []);

    const handleDelete = async (statId) => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            alert("로그인이 필요합니다.");
            return;
        }

        try {
            await deleteFavorite(statId, token);
            setFavorites((prev) =>
                prev.filter((item) => item.stat_id !== statId)
            );
        } catch (err) {
            console.error("즐겨찾기 삭제 실패:", err);
            alert("즐겨찾기 삭제에 실패했습니다.");
        }
    };

    if (loading) return <p>로딩 중...</p>;

    return (
        <div
            style={{
                padding: "24px",
                backgroundColor: "#f2fbff",
                minHeight: "100vh",
            }}
        >
            {/* 🔙 뒤로가기 버튼 */}
            <div style={{ marginBottom: "20px" }}>
                <Link
                    to="/home"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        textDecoration: "none",
                        color: "#1976d2",
                        fontWeight: "bold",
                        fontSize: "16px",
                    }}
                >
                    <FaArrowLeft style={{ marginRight: "8px" }} />
                    홈으로
                </Link>
            </div>

            <h2
                style={{
                    color: "#1976d2",
                    textAlign: "center",
                    marginBottom: "24px",
                }}
            >
                즐겨찾기 한 충전소
            </h2>

            {favorites.length === 0 ? (
                <p style={{ textAlign: "center" }}>
                    즐겨찾기한 충전소가 없습니다.
                </p>
            ) : (
                <ul
                    style={{
                        listStyle: "none",
                        padding: 0,
                        maxWidth: 640,
                        margin: "0 auto",
                    }}
                >
                    {favorites.map((station, idx) => (
                        <li
                            key={station.stat_id + idx}
                            style={{
                                backgroundColor: "#fff",
                                borderRadius: "12px",
                                padding: "16px 20px",
                                marginBottom: "16px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "8px",
                                }}
                            >
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: "18px",
                                        color: "#0d47a1",
                                    }}
                                >
                                    {station.stat_nm}
                                </h3>
                                <button
                                    onClick={() =>
                                        handleDelete(station.stat_id)
                                    }
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        fontSize: "20px",
                                        color: "#f5c518",
                                        cursor: "pointer",
                                    }}
                                    title="즐겨찾기에서 삭제"
                                >
                                    ⭐
                                </button>
                            </div>

                            <p style={{ margin: "4px 0", color: "#333" }}>
                                {station.addr}
                            </p>
                            <p style={{ margin: "4px 0", color: "#555" }}>
                                상태: {statusText(station.stat)}
                            </p>
                            <p style={{ margin: "4px 0", color: "#555" }}>
                                타입: {chargerTypeText(station.chger_type)}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// 상태 숫자를 텍스트로 변환
const statusText = (stat) => {
    const map = {
        0: "알 수 없음",
        1: "통신 이상",
        2: "사용 가능",
        3: "충전 중",
        4: "운영 중지",
        5: "점검 중",
    };
    return map[stat] || "정보 없음";
};

// 타입 코드 변환
const chargerTypeText = (code) => {
    const types = {
        "01": "DC 차데모",
        "02": "AC 완속",
        "03": "DC 차데모+AC3 상",
        "04": "DC 콤보",
        "05": "DC 차데모+DC 콤보",
        "06": "DC 차데모+AC3 상+DC 콤보",
        "07": "AC3 상",
        "08": "DC 콤보(완속)",
        "09": "NACS",
        10: "DC 콤보+NACS",
    };
    const key = String(code).padStart(2, "0");
    return types[key] || code;
};
