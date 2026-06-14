// src/services/api/resetService.ts

import { glpiClient } from './glpiClient';

// Liste des types d'éléments à supprimer (dans l'ordre !)
const itemtypesToDelete = [
  // 1. D'abord les éléments liés aux tickets
  // 'TicketCost',
  // 'ITILFollowup',
  // 'ITILSolution',
  // 'Item_Ticket',
  
  // 2. Ensuite les tickets eux-mêmes
  'Ticket',
  // 'TicketCost',
  // 3. Puis les assets
  'Computer',
  'Monitor',
  'Printer',
  'Phone',
  'NetworkEquipment',
  'Peripheral',
  
  // 4. Autres éléments
  'Software',
  'Problem',
  'Change',
  'Location',
  'Budget',
  'Document',
  'Rack',
  'Enclosure',
  'PDU',


];

const PROTECTED_USERS = ['glpi', 'glpi-system', 'normal', 'post-only', 'tech'];

/**
 * Supprime un élément individuellement (plus fiable que suppression groupée)
 */
async function deleteItem(itemtype: string, id: number): Promise<boolean> {
  try {
    await glpiClient.delete(`/${itemtype}/${id}?force_purge=true`);
    return true;
  } catch (error: any) {
    console.warn(`[ResetService] Échec suppression ${itemtype}#${id}:`, error.message);
    return false;
  }
}

/**
 * Supprime TOUS les éléments d'un type donné
 */
async function deleteAllItemsOfType(itemtype: string): Promise<{ total: number; deleted: number; failed: number }> {
  console.log(`[ResetService] Traitement de ${itemtype}...`);
  
  try {
    // Récupérer tous les éléments
    const listResponse = await glpiClient.get(`/${itemtype}`, {
      params: { range: '0-1000' }
    });
    
    const items = listResponse.data;
    const itemsArray = Array.isArray(items) ? items : (items.data || []);
    
    if (itemsArray.length === 0) {
      console.log(`[ResetService] ⏭️ ${itemtype}: aucun élément`);
      return { total: 0, deleted: 0, failed: 0 };
    }
    
    console.log(`[ResetService] ${itemtype}: ${itemsArray.length} élément(s) à supprimer`);
    
    let deleted = 0;
    let failed = 0;
    
    // Suppression individuelle pour chaque élément
    for (const item of itemsArray) {
      const success = await deleteItem(itemtype, item.id);
      if (success) {
        deleted++;
      } else {
        failed++;
      }
    }
    
    console.log(`[ResetService] ✅ ${itemtype}: ${deleted} supprimés, ${failed} échecs`);
    return { total: itemsArray.length, deleted, failed };
    
  } catch (error: any) {
    console.error(`[ResetService] ❌ Erreur pour ${itemtype}:`, error.message);
    return { total: 0, deleted: 0, failed: 0 };
  }
}

/**
 * Supprime TOUS les éléments (y compris les utilisateurs non protégés)
 */
const resetDatabase = async () => {
  const results: {
    itemtype: string;
    success: boolean;
    message?: string;
    total?: number;
    deleted?: number;
    failed?: number;
  }[] = [];
  
  console.log('[ResetService] 🚀 Début du reset complet...');
  console.log('[ResetService] Types à supprimer:', itemtypesToDelete);
  console.log('[ResetService] Utilisateurs protégés:', PROTECTED_USERS);

  // 1. Supprimer tous les types standards
  for (const itemtype of itemtypesToDelete) {
    const stats = await deleteAllItemsOfType(itemtype);
    results.push({
      itemtype,
      success: stats.failed === 0,
      message: `${stats.deleted}/${stats.total} élément(s) supprimé(s)`,
      total: stats.total,
      deleted: stats.deleted,
      failed: stats.failed
    });
  }

  // 2. Traitement spécial pour les utilisateurs
  try {
    console.log('[ResetService] 👤 Traitement des utilisateurs...');
    
    const listResponse = await glpiClient.get('/User', {
      params: { range: '0-1000' }
    });
    
    const allUsers = listResponse.data;
    const usersArray = Array.isArray(allUsers) ? allUsers : (allUsers.data || []);
    
    if (usersArray.length > 0) {
      const usersToDelete = usersArray.filter((user: any) => {
        const isProtected = PROTECTED_USERS.includes(user.name);
        if (isProtected) {
          console.log(`[ResetService] 🔒 Utilisateur protégé: ${user.name} (ID: ${user.id})`);
        }
        return !isProtected;
      });
      
      let deleted = 0;
      let failed = 0;
      
      for (const user of usersToDelete) {
        const success = await deleteItem('User', user.id);
        if (success) {
          console.log(`[ResetService] ✅ Utilisateur supprimé: ${user.name} (ID: ${user.id})`);
          deleted++;
        } else {
          console.warn(`[ResetService] ⚠️ Échec suppression: ${user.name} (ID: ${user.id})`);
          failed++;
        }
      }
      
      results.push({
        itemtype: 'User (non-system)',
        success: failed === 0,
        message: `${deleted} utilisateur(s) supprimé(s), ${failed} échec(s)`,
        total: usersToDelete.length,
        deleted,
        failed
      });
    } else {
      results.push({ itemtype: 'User (non-system)', success: true, message: 'Aucun utilisateur trouvé' });
    }
    
  } catch (error: any) {
    console.error('[ResetService] ❌ Erreur utilisateurs:', error.message);
    results.push({ itemtype: 'User (non-system)', success: false, error: error.message });
  }
  
  // 3. Résumé final
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  
  console.log('[ResetService] ════════════════════════════════════════════');
  console.log(`[ResetService] ✅ Reset terminé: ${successCount} succès, ${errorCount} erreurs`);
  console.log('[ResetService] ════════════════════════════════════════════');
  
  return results;
};

/**
 * Version simplifiée : suppression uniquement des données importées
 */
const resetImportedData = async () => {
  const results = [];
  
  const importedTypes = [
    'TicketCost',
    'ITILFollowup',
    'ITILSolution',
    'Item_Ticket',
    'Ticket',
    'Computer',
    'Monitor', 
    'Printer',
    'Phone',
    'NetworkEquipment',
    'Document',
    'User'
  ];
  
  for (const itemtype of importedTypes) {
    const stats = await deleteAllItemsOfType(itemtype);
    
    if (itemtype === 'User') {
      // Pour les utilisateurs, on ne garde que les stats (déjà filtrés dans deleteAllItemsOfType)
      results.push({
        itemtype,
        success: stats.failed === 0,
        message: `${stats.deleted}/${stats.total} utilisateur(s) non-système supprimé(s)`
      });
    } else {
      results.push({
        itemtype,
        success: stats.failed === 0,
        message: `${stats.deleted}/${stats.total} élément(s) supprimé(s)`
      });
    }
  }
  
  return results;
};

export const resetService = {
  resetDatabase,
  resetImportedData
};