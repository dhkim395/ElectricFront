import axios from "axios";

// 즐겨찾기 추가
export const addFavorite = async (statId, token) => {
    return axios.post(
        "/api/favorite",
        { statId },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
};

// 즐겨찾기 삭제
export const deleteFavorite = async (statId, token) => {
    return axios.delete("/api/favorite/delete", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: { statId },
    });
};

// 즐겨찾기 여부 확인
export const isFavoriteStation = async (statId, token) => {
    return axios.get("/api/favorite/check", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: { statId },
    });
};
