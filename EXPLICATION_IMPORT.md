# Explication du Service d'Import (`ImportService`)

## 1. Résumé Global
Ce service permet d'importer **de manière flexible** (fichiers optionnels) :
1. Des **employés** depuis un fichier CSV (optionnel)
2. Des **salaires et leurs paiements** depuis un deuxième fichier CSV (optionnel)
3. Des **photos des employés** depuis un fichier ZIP (optionnel)

Il gère automatiquement les doublons d'employés, lie les salaires/photos aux bons employés via une référence, et utilise l'API Dolibarr pour stocker les données.

---

## 2. Étape par Étape

### 2.1 Configuration Initiale & Authentification (`setupAuth()`)
Avant toute opération :
- Vérifie que l'utilisateur est bien authentifié (récupère le token via `dolibarrAuthService`)
- Configure le client HTTP avec ce token pour accéder à l'API Dolibarr

---

### 2.2 Outils Utilitaires
Le service utilise des fonctions internes pour traiter les fichiers et les données :

#### 2.2.1 Lecture CSV (`readCsv<T>()`)
- Utilise la bibliothèque `papaparse`
- Transforme un fichier CSV en **tableau d'objets JSON**
- Prend en compte la première ligne comme en-tête de colonnes
- Nettoie les en-têtes (supprime les espaces inutiles)

#### 2.2.2 Extraction Photos ZIP (`readZipPhotos()`)
- Utilise la bibliothèque `jszip`
- Parcourt le fichier ZIP et extrait les images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`)
- Crée un **dictionnaire** : `{ "ref_employe": Blob_de_la_photo }`
- Retire l'extension du fichier pour utiliser le nom comme clé

#### 2.2.3 Parsing Date (`parseDate()`)
- Convertit une date **française (JJ/MM/AA)** en **timestamp (secondes)**
- Gère les années à 2 chiffres (les préfixe par `20`)

#### 2.2.4 Parsing Montant (`parseMontant()`)
- Convertit un texte en nombre décimal
- Supprime les espaces et remplace la virgule par un point (ex: `"1 200,50"` → `1200.5`)

---

### 2.3 Importation 1 : Les Employés (`importEmployes()`)
1. Récupère d'abord les **employés existants** dans Dolibarr pour éviter les doublons
2. Pour chaque ligne du CSV :
   - Vérifie si l'employé existe déjà (via son `identifiant`)
   - Si oui : ajoute son ID Dolibarr au dictionnaire `refToId` et continue
   - Si non :
     - Crée un payload (login, mdp, nom, genre, heures de travail, poste)
     - Appelle l'API pour créer l'employé dans Dolibarr
     - Ajoute son ID Dolibarr au dictionnaire `refToId` (clé = `ref_employe` du CSV)
     - Enregistre le résultat (succès/échec)

---

### 2.4 Importation 2 : Les Salaires & Paiements (`importSalaires()`)
1. Pour chaque ligne du CSV :
   - Récupère l'ID Dolibarr de l'employé via `refToId` (utilise `ref_employe` du CSV)
   - Si l'employé n'existe pas : saute la ligne et enregistre une erreur
   - Parse le montant du salaire
   - **Parse les paiements** (format special du CSV : `"{05/01/24, 500}, {20/01/24, 700}"`)
   - Calcule le total payé
   - Crée le salaire dans Dolibarr via l'API
   - Crée chaque paiement associé à ce salaire
   - Enregistre le résultat

---

### 2.5 Importation 3 : Les Photos (`importPhotos()`)
1. Pour chaque photo du dictionnaire :
   - Récupère l'ID Dolibarr de l'employé via `refToId` (clé = nom du fichier sans extension)
   - Si l'employé n'existe pas : saute la photo
   - Convertit le Blob de la photo en **Base64**
   - Upload la photo comme document attaché dans Dolibarr
   - Met à jour le profil de l'employé pour assigner cette photo
   - Enregistre le résultat

---

### 2.6 Orchestrateur Principal (`importAll()`)
C'est la fonction qui coordonne TOUT (fichiers optionnels) :
1. Appelle `setupAuth()`
2. Récupère **tous les utilisateurs** depuis Dolibarr
3. Filtrer pour ne garder que les **employés** (champ `employee` = 1)
4. Construire `refToId` avec les employés existants (utilisant la **position dans la liste** comme référence)
5. Si fichier employés fourni :
   - Lit le CSV
   - Importe les employés
   - Ajoute les nouveaux employés à `refToId` (leur position = nombre initial d'employés + index)
   - Garde aussi la `ref_employe` du CSV pour compatibilité
6. Si fichier salaires fourni ET `refToId` non vide :
   - Lit le CSV
   - Importe les salaires (liés via `ref_employe` = position OU ref CSV)
7. Si fichier photos fourni ET `refToId` non vide :
   - Lit le ZIP
   - Importe les photos (liées via `ref_employe` = position OU nom du fichier)
8. Retourne un résumé complet des résultats de chaque import

---

## 3. Explication détaillée : Liaison via `ref_employe` (position ou référence)

### 3.1 Qu'est-ce que `refToId` ?
C'est un **dictionnaire (objet JavaScript)** qui fait le lien entre :
- La **référence** de l'employé (position OU ref CSV) → clé
- L'**ID interne Dolibarr** de l'employé → valeur

Exemple :
```javascript
refToId = {
  "1": 12,        // Employé en position 1 a pour ID Dolibarr 12
  "2": 45,        // Employé en position 2 a pour ID Dolibarr 45
  "EMP001": 12,   // Compatible avec la ref CSV EMP001
  "EMP002": 45    // Compatible avec la ref CSV EMP002
}
```

### 3.2 Comment `refToId` est-il construit ?
1. **Récupération des utilisateurs** :
   - On récupère TOUS les utilisateurs de Dolibarr
   - On filtre pour ne garder que ceux où `employee` = 1

2. **Ajout des employés existants** :
   - Pour chaque employé, on ajoute sa **position dans la liste** (commençant à 1) comme clé
   - Valeur = ID Dolibarr de l'employé

3. **Ajout des nouveaux employés importés** :
   - Pour chaque nouvel employé, sa position = (nombre d'employés initial) + (index dans les nouveaux) + 1
   - On ajoute cette position comme clé
   - On ajoute aussi la `ref_employe` du CSV comme clé pour compatibilité

### 3.3 Comment les salaires sont-ils liés ?
Dans le CSV des salaires, chaque ligne a un champ `ref_employe` :
1. On prend la valeur de `ref_employe` de la ligne
2. On recherche cette valeur dans `refToId` (peut être une position OU une ref CSV)
3. Si on trouve une correspondance : on utilise l'ID Dolibarr associé pour créer le salaire
4. Si pas de correspondance : on saute la ligne et enregistre une erreur

### 3.4 Comment les photos sont-elles liées ?
Pour les photos, la référence est **le nom du fichier** (sans extension) :
1. On extrait le nom du fichier (ex: `1.png` → `1` OU `EMP001.png` → `EMP001`)
2. On recherche ce nom dans `refToId`
3. Si on trouve une correspondance : on utilise l'ID Dolibarr associé pour uploader la photo et la lier à l'employé
4. Si pas de correspondance : on saute la photo et enregistre une erreur

---

## 4. Points Clés Techniques
- **Fichiers optionnels** : On peut importer seulement les employés, seulement les salaires, seulement les photos, ou n'importe quelle combinaison
- **Liaison via la position** : `ref_employe` correspond maintenant à la position de l'employé dans la liste filtrée (commence à 1)
- **Compatibilité rétroactive** : On garde la possibilité d'utiliser la `ref_employe` du CSV si besoin
- **Gestion d'erreurs** : Chaque étape est entourée de `try/catch` pour ne pas bloquer tout l'import si une ligne échoue
- **Progression** : Permet d'afficher des messages de progression via le callback `onProgress`

