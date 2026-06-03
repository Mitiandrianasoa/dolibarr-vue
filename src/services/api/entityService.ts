/**
 * entityService.ts
 * Fetch des entités GLPI (organisations)
 * Endpoint : GET /apirest.php/Entity
 */

import { fetchAllPaginated } from './glpiClient';
import { GLPI_ENDPOINTS } from '@/constants/glpi';
import {
  type GlpiEntity,
  type Entity,
  mapGlpiEntityToEntity,
} from '@/models/Entity';

// ─── Fetch toutes les entités ─────────────────────────────────────────────────

export async function fetchAllEntities(includeDeleted = false): Promise<Entity[]> {
  const raw = await fetchAllPaginated<GlpiEntity>(GLPI_ENDPOINTS.ENTITY, {
    is_deleted: includeDeleted ? undefined : 0,
  });
  return raw.map(mapGlpiEntityToEntity);
}

// ─── Fetch une entité par ID ──────────────────────────────────────────────────

export async function fetchEntityById(id: number): Promise<Entity> {
  const { default: glpiClient } = await import('./glpiClient');
  const { data } = await glpiClient.get<GlpiEntity>(`${GLPI_ENDPOINTS.ENTITY}/${id}`);
  return mapGlpiEntityToEntity(data);
}

// ─── Fetch les entités enfants d'une entité parente ──────────────────────────

export async function fetchChildEntities(parentId: number): Promise<Entity[]> {
  const all = await fetchAllEntities();
  return all.filter((e) => e.parentId === parentId);
}

// ─── Construire l'arbre hiérarchique des entités ─────────────────────────────

export interface EntityTreeNode extends Entity {
  children: EntityTreeNode[];
}

export function buildEntityTree(entities: Entity[]): EntityTreeNode[] {
  const map = new Map<number, EntityTreeNode>();

  // Initialiser tous les nœuds
  entities.forEach((e) => map.set(e.id, { ...e, children: [] }));

  const roots: EntityTreeNode[] = [];

  // Construire l'arbre
  map.forEach((node) => {
    if (node.parentId === 0 || !map.has(node.parentId)) {
      roots.push(node);
    } else {
      map.get(node.parentId)?.children.push(node);
    }
  });

  return roots;
}
