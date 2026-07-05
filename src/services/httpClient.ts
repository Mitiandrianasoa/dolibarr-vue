// src/services/httpClient.ts
import axios from 'axios'
import { dolibarrAuthService } from './dolibarrAuthService'

class HttpClient {
  private client: any

  constructor() {
    const baseURL = import.meta.env.VITE_DOLIBARR_BASE_URL

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    })

    // Intercepteur pour les réponses
        this.client.interceptors.request.use(
    (config) => {
        const token = dolibarrAuthService.getToken()
        if (token) {
        config.headers['DOLAPIKEY'] = token
        }
        return config
    },
    (error) => Promise.reject(error)
    )
  }

  public setApiKey(apiKey: string): void {
    this.client.defaults.headers.common['DOLAPIKEY'] = apiKey
  }

  public async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }

  public async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  public async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  public async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config)
    return response.data
  }
  
}


export const httpClient = new HttpClient()
export default httpClient