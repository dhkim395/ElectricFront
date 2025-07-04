import axios from "axios";

export const getMyCars = async (token) => {
  const res = await axios.get("/api/member-car/list", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deleteMyCar = async (carIdx, token) => {
  await axios.delete(`/api/member-car/delete/${carIdx}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
