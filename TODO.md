Pour entamer efficacement la réalisation du **Dashboard (1.d)** et de la **Page des Tickets (1.e)** de votre NewAPP en Vue.js, voici une feuille de route (TODO list) technique et détaillée, structurée étape par étape.

---

### Étape 1 : Préparation de la couche de données (Services / Stores)

Puisque votre NewAPP s'appuie sur un échange au format JSON, vous devez d'abord vous assurer que vos fonctions d'extraction de données sont prêtes à alimenter vos composants Vue.

* [ ] **Service Métriques (Dashboard) :** * Créer une fonction permettant de récupérer les totaux consolidés.
* *Structure attendue pour les éléments :* Nombre total d'actifs (Ordinateurs + Écrans + Logiciels) et le décompte précis par type (ex: `{ computers: X, monitors: Y, softwares: Z }`).
* *Structure attendue pour les tickets :* Nombre total de tickets et répartition selon le champ `type` (Incident vs Demande).


* [ ] **Service Échanges / Tickets :**
* Créer une fonction `getTickets()` qui extrait la liste complète des tickets depuis votre cache local .
* Créer une fonction `getTicketById(id)` qui récupère un ticket spécifique avec ses liaisons (les éléments matériels associés via la table polymorphe).



---

Étape 2 : Implémentation du Dashboard (`1.d`) 

Créez un composant principal `DashboardView.vue` organisé en deux sections claires de cartes d'indicateurs (KPI).

Task A : Section "Éléments du Parc" 

* [ ] Créer une carte principale **"Nombre général d'éléments"** affichant la somme totale de vos équipements en gros caractères.


* [ ] Ajouter une sous-section ou une grille affichant les détails par type sous forme de petites puces ou barres de progression:


* Ordinateurs (`Computer`) : Nombre de lignes de la table locale.
* Écrans (`Monitor`) : Nombre de lignes de la table locale.
* Logiciels (`Software`) : Nombre de lignes de la table locale.



Task B : Section "Suivi de l'Assistance (Tickets)" 

* [ ] Créer une carte principale **"Nombre général de tickets"** affichant le volume global de requêtes présentes dans le système.


* [ ] Ajouter un séparateur ou un graphique simple de répartition basé sur le type exact défini dans le standard de GLPI:


* **Incidents** (où `type === 1`) : Volume et pourcentage.
* **Demandes / Besoins** (où `type === 2`) : Volume et pourcentage.



---

Étape 3 : Implémentation de la Page des Tickets (`1.e`) 

Cette section doit se diviser idéalement en deux sous-composants ou utiliser un système de navigation Liste ⇄ Fiche (Master-Detail).

Task A : Le composant Liste (`TicketList.vue`) 

* [ ] Mettre en place un tableau propre ou une liste verticale pour énumérer tous les tickets récupérés.
* [ ] Afficher sur chaque ligne les informations clés de premier niveau :
* L'ID et le Titre (`name`) du ticket.
* Le type (Badge couleur : Rouge pour Incident, Bleu pour Demande).
* Le statut actuel (`status` traduit textuellement, ex: Nouveau, En cours, Clos).
* La date d'ouverture (`date_creation` ou `date`).


* [ ] Rendre chaque ligne cliquable pour déclencher la sélection du ticket (en passant son ID au composant Fiche).

Task B : Le composant Fiche (`TicketDetail.vue`) 

* [ ] Concevoir une interface de type "Fiche descriptive" qui s'ouvre soit sur une nouvelle page (via `vue-router`), soit dans un panneau latéral/modal.
* [ ] Afficher l'intégralité des détails du ticket sélectionné:


* **En-tête :** ID, Titre complet, Statut et Priorité.
* **Dates clés :** Date de création, date de résolution (`solvedate`) et date de clôture (`closedate`).
* **Contenu métier :** Afficher la description complète du problème (le champ `content`), de préférence dans une zone lisible respectant les sauts de ligne (ou le HTML si GLPI envoie du texte enrichi).
* **Éléments associés (Bonus crucial de cohérence avec GLPI) :** Afficher la liste des matériels informatiques (Ordinateurs ou Écrans) liés à ce ticket spécifique afin que toutes les données importées prennent leur sens visuel.



---

### Structure de code suggérée pour démarrer vos composants Vue 3 (Composition API)

Pour vous faire gagner du temps lors du codage de votre interface, voici le squelette TypeScript typique à adapter pour vos deux vues :

#### `DashboardView.vue` (Exemple d'intégration des données)

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

// Interfaces de données locales
const statsAssets = ref({ computers: 0, monitors: 0, softwares: 0 });
const statsTickets = ref({ incidents: 0, demandes: 0 });

// Calculs globaux exigés par le sujet
const totalAssets = computed(() => statsAssets.value.computers + statsAssets.value.monitors + statsAssets.value.softwares);
const totalTickets = computed(() => statsTickets.value.incidents + statsTickets.value.demandes);

onMounted(async () => {
  // TODO: Appeler vos fonctions  ou API JSON ici pour hydrater vos variables ref
});
</script>

<template>
  <div class="dashboard-container">
    <section class="kpi-card">
      <h2>Total Éléments : {{ totalAssets }}</h2>
      <ul>
        <li>Ordinateurs : {{ statsAssets.computers }}</li>
        <li>Écrans : {{ statsAssets.monitors }}</li>
        <li>Logiciels : {{ statsAssets.softwares }}</li>
      </ul>
    </section>

    <section class="kpi-card">
      <h2>Total Tickets : {{ totalTickets }}</h2>
      <p>Incidents (Type 1) : {{ statsTickets.incidents }}</p>
      <p>Demandes (Type 2) : {{ statsTickets.demandes }}</p>
    </section>
  </div>
</template>

```

#### `TicketsView.vue` (Logique Liste & Fiche sur la même page)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Ticket } from '@/models/Ticket';

const tickets = ref<Ticket[]>([]);
const selectedTicket = ref<Ticket | null>(null);

onMounted(async () => {
  // Fetch initial depuis  local
  // tickets.value = await loadTicketsFromLocalDB();
});

const selectTicket = (ticket: Ticket) => {
  selectedTicket.value = ticket;
};
</script>

<template>
  <div class="tickets-layout" style="display: flex; gap: 20px;">
    <div class="tickets-list" style="flex: 1;">
      <h3>Liste des Tickets</h3>
      <div 
        v-for="ticket in tickets" 
        :key="ticket.id" 
        @click="selectTicket(ticket)"
        class="ticket-item"
        style="cursor: pointer; padding: 10px; border: 1px solid #ccc; margin-bottom: 5px;"
      >
        <h4>#{{ ticket.id }} - {{ ticket.name }}</h4>
        <small>Statut: {{ ticket.status }} | Type: {{ ticket.type === 1 ? 'Incident' : 'Demande' }}</small>
      </div>
    </div>

    <div class="ticket-fiche" style="flex: 1; border: 1px solid #000; padding: 20px;" v-if="selectedTicket">
      <h3>Fiche du Ticket #{{ selectedTicket.id }}</h3>
      <h2>{{ selectedTicket.name }}</h2>
      <hr />
      <p><strong>Description :</strong></p>
      <div v-html="selectedTicket.content"></div>
      <hr />
      <p>Créé le : {{ selectedTicket.date_creation }}</p>
      <p>Résolu le : {{ selectedTicket.solvedate || 'Non résolu' }}</p>
      <button @click="selectedTicket = null">Fermer la fiche</button>
    </div>
  </div>
</template>

```