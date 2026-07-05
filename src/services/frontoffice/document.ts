import { httpClient } from '@/services/httpClient'

interface DocumentDownloadResponse {
  content: string
  'content-type': string
}

export class DocumentService {
  private cache = new Map<string, string>()

  /**
   * Télécharge un document Dolibarr (via API, DOLAPIKEY) et le renvoie sous forme de data URL.
   * Nécessaire car GET /documents/download renvoie le fichier encodé en base64 dans du JSON,
   * pas un flux binaire directement utilisable dans un <img src="...">.
   */
  async getUserPhotoDataUrl(userId: number, filename: string): Promise<string | null> {
    const key = `${userId}/${filename}`
    if (this.cache.has(key)) return this.cache.get(key)!

    try {
      const res = await httpClient.get<DocumentDownloadResponse>('/documents/download', {
        params: { modulepart: 'user', original_file: key }
      })
      const dataUrl = `data:${res['content-type']};base64,${res.content}`
      this.cache.set(key, dataUrl)
      return dataUrl
    } catch {
      return null
    }
  }
}

export const documentService = new DocumentService()
