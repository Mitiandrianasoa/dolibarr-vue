import { glpiClient } from './glpiClient';

const itemtypesToDelete = [
  // Parc (Matériel & Assets)
  'Computer',
  'Monitor',
  'Printer',
  'Phone',
  'NetworkEquipment',
  'Peripheral',
  // Logiciels
  'Software',
  // Flux ITIL (Tickets & Suivi)
  'Ticket',
  'Problem',
  'Change',
  // Configurations de support
  'SLA',
  'ITILCategory',
  'Location',
  // Budget
  'Budget',
  //Documents
  'Document',
];

const resetDatabase = async () => {
  const results = [];
  
  for (const itemtype of itemtypesToDelete) {
    try {
      // ÉTAPE 1 : Récupérer les éléments existants pour obtenir leurs IDs
      // L'URL native est simplement /${itemtype} (ex: /Computer)
      const listResponse = await glpiClient.get(`/${itemtype}`, {
        params: { range: '0-1000' } // Ajustez la plage si nécessaire
      });

      const items = listResponse.data;

      // Si le tableau contient des données
      if (Array.isArray(items) && items.length > 0) {
        const ids = items.map((item: any) => item.id);

        // ÉTAPE 2 : Envoyer la commande de suppression groupée (Purge)
        // On utilise la méthode HTTP DELETE sur l'URL de l'itemtype
        const response = await glpiClient.delete(`/${itemtype}`, {
          data: {
            input: ids.map(id => ({
              id: id,
              force_purge: true // Supprime définitivement sans passer par la corbeille
            }))
          }
        });

        results.push({ itemtype, success: true, message: `${ids.length} éléments purgés.`, data: response.data });
      } else {
        results.push({ itemtype, success: true, message: 'Aucun élément à supprimer.' });
      }

    } catch (error) {
      // Capture les erreurs si un module est vide ou inaccessible
      results.push({ itemtype, success: false, error });
    }
  }
  
  return results;
};

export const resetService = {
  resetDatabase,
};