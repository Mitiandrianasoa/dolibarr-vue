// src/services/localHttpClient.ts
import axios from 'axios'

const baseURL = import.meta.env.VITE_LOCAL_API_URL || '/local-api'

class LocalHttpClient {
  private client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000,
  })

  async get<T = unknown>(url: string): Promise<T> {
    const response = await this.client.get(url)
    return response.data
  }

  async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post(url, data)
    return response.data
  }

  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put(url, data)
    return response.data
  }

  async delete<T = unknown>(url: string): Promise<T> {
    const response = await this.client.delete(url)
    return response.data
  }
}

export const localHttpClient = new LocalHttpClient()
