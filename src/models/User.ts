/**
 * Modèle GLPI : Utilisateur (User)
 * Endpoint API : GET /apirest.php/User
 */
export interface GlpiUser {
  id: number;
  name: string;               // login / username
  firstname: string;
  realname: string;
  email?: string;
  phone?: string;
  mobile?: string;
  entities_id: number;        // entité principale
  profiles_id: number;        // profil/rôle
  groups_id?: number;
  is_active: number;          // 1 = actif, 0 = inactif
  is_deleted: number;         // 1 = supprimé (soft delete)
  date_creation?: string;
  date_mod?: string;
}

/**
 * Représentation locale simplifiée (SQLite / store Pinia)
 */
export interface User {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  entityId: number;
  profileId: number;
  groupId?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Mapper : réponse API GLPI → modèle local
 */
export function mapGlpiUserToUser(raw: GlpiUser): User {
  return {
    id: raw.id,
    username: raw.name,
    firstname: raw.firstname ?? '',
    lastname: raw.realname ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? undefined,
    entityId: raw.entities_id,
    profileId: raw.profiles_id,
    groupId: raw.groups_id ?? undefined,
    isActive: raw.is_active === 1,
    isDeleted: raw.is_deleted === 1,
    createdAt: raw.date_creation,
    updatedAt: raw.date_mod,
  };
}
