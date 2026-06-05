import { fetchAllPaginated } from './glpiClient';
import { GLPI_ENDPOINTS } from '@/constants/glpi';
import { type Asset, mapGlpiSoftwareToAsset, type GlpiSoftware } from '@/models/Asset';

export async function fetchAllSoftware(params = {}): Promise<Asset[]> {
    const raw = await fetchAllPaginated<GlpiSoftware>(
        GLPI_ENDPOINTS.SOFTWARE,
        params,
    );
    return raw.map(mapGlpiSoftwareToAsset);
}
