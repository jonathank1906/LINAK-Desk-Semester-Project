import axios from "axios";
const BASE = "http://localhost:8000/api/preferences/";

export const fetchPreferences = () => axios.get(BASE).then(r => r.data);
export const createPreference = (payload) => axios.post(BASE, payload).then(r => r.data);
export const updatePreference = (id, payload) => axios.patch(`${BASE}${id}/`, payload).then(r => r.data);
export const deletePreference = (id) => axios.delete(`${BASE}${id}/`).then(r => r.data);