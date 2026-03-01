/**
 * API client for backend communication
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

// SWR fetcher
export const fetcher = (url: string) =>
  api.get(url).then(res => res.data);
