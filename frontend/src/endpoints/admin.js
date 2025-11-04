// src/endpoints/admin.js
import axios from "axios";
const BASE_URL = "http://localhost:8000/api";

export const getAllUsers = async () => {
  const res = await axios.get(`${BASE_URL}/users/`, { withCredentials: true });
  return res.data;
};

export const getUserById = async (id) => {
  const res = await axios.get(`${BASE_URL}/users/${id}/`, { withCredentials: true });
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await axios.patch(`${BASE_URL}/users/${id}/`, data, { withCredentials: true });
  return res.data;
};

export const toggleUserStatus = async (id, is_active) => {
  const res = await axios.patch(`${BASE_URL}/users/${id}/`, { is_active }, { withCredentials: true });
  return res.data;
};
