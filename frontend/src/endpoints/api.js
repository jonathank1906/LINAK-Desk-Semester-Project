import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/';
const LOGIN_URL = `${BASE_URL}token/`;
const LOGOUT_URL = `${BASE_URL}logout/`;
const REFRESH_URL = `${BASE_URL}token/refresh/`;

export const login = async (username, password) => {
    const response = await axios.post(LOGIN_URL,
        {username: username, password: password},
        { withCredentials: true }
     )
     return response.data;
}

export const refresh_token = async () => {
    try {
        const response = axios.post(REFRESH_URL,
            {},
            { withCredentials: true }
        )
        return true;
    }
    catch (error) {
        return false;
    }
}

const call_refresh = async(error, func) => {
    if (error.response && error.response.status === 401) {
        const tokenRefreshed = await refresh_token();
        if (tokenRefreshed) {
            const retryResponse = await func();
            return retryResponse;
        }
    }
    return false;
}

export const logout = async () => {
    try
    {
        const response = await axios.post(LOGOUT_URL,
            {},
            { withCredentials: true }
        )
        return true;
    }
    catch (error) {
        return false;
    }
}