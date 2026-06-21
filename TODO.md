FO:
  - page pour créer un ticket, on peut associer plusieurs éléments au 
ticket
  -  Créer la page pour afficher la liste des éléments(ASSETS)
    
      - avec recherche multi critère 

BO:
  - Dashboard pour afficher  
      - le nombre d’éléments général, avec détails par type 
      - le nombre de ticket général, avec détail par type 
  - Page pour afficher les tickets , avec une fiche. 
  - une page avec un bouton pour réinitialiser les données 
  -  créer la page pour importer les 4 fichiers(4 input files)  
      - 3 fichiers csv pour le contenu    
      - 1 fichier zip pour les images
 todo-test-fetch
 
 2nd pull 2
 Test-Mitia


# ALEA 1:
CHANGEMENT DE STATUS TERMINE DANS KANBAN
BOITE DE DIALOGUE 
AJOUT SUPER COST. 
STOCKER DANS SQLITE 

NOUVELLE PAGE COUT:
COUT original dans un ticket 
  - si deux elements ou plus dans le tickets diviser le cout fixe
  - affichage par type 
  - PLUS SUPER COST DEPUIS SQLITE
TOTAL 

page des couts afficher par type [moniteur, phone, ordi]
- depuis glpi
- sqlite super cout



Get-ChildrenItem D:\S6\EVAL\EVAL 2\gpli-vue
Where-Object {$_.LastWriteTime -gt (Get-Date).AddMinutes(-30)} |
Sort-Object LastWriteTime -Descending|
Select-Object LastWriteTime , FullName

Get-ChildItem "D:\S6\EVAL\EVAL 2\gpli-vue" -File |
Where-Object {$_.LastWriteTime -gt (Get-Date).AddMinutes(-30)} |
Sort-Object LastWriteTime -Descending |
Select-Object LastWriteTime, FullName  


# ALEA 2:
- Ticket CLosed l'on peut envoyer in progress
- Button: 
  - Annulation effacer dernier supercost depuis sqlite.
      - supercost liee a ce ticket
  - Reouverture
    - champs en pourcentage par exemple 10%
    - cout de reouverture 10% du dernier supercost
    - l'on n'efface pas le supercost pour ce dernier
- page CostReportView.vue
  - ajout section cost reoverture 

# REAL LIGNE DE COMMADE QUI MARCHE POUR NOUS 
Get-ChildItem "D:\S6\EVAL\EVAL 2\GLP-16-06\gpli-backend - Test"
Where-Object {$_.LastWriteTime -gt (Get-Date).AddMinutes(-90)}|
Sort-Object LastWriteTime -Descending |
Select-Object LastWriteTime, FullName

Get-ChildItem "D:\S6\EVAL\EVAL 2\GLP-16-06"
Where-Object {$_.LastWriteTime -gt (Get-Date).AddMinutes(-90)}|
Sort-Object LastWriteTime -Descending |
Select-Object LastWriteTime, FullName



# ALEA 3 
- nouvelle page import: import mouvement 
  - csv 3 colonnes 
    - ticket(ref ticket)
    - mvt
    - valeur
  par exemple ticket 1, open, 5(reouverture)
                      2, canceled, (annuler ticket)
                      2, closed, 100 (terminer avec supercout 100 a inserer dans sqlite)
  - function importService
      - MouvementInsert(csv)
    - page costReportView a modifier:
      - details pour chaque categories:
          - items/assets + cout


# ALEA SCENARIO:
Ticket 1 
terminer 100
reouverture 5
terminer 45

Ticket 2 
reouverture 10
terminer 100

ETU003145


# ALEA 4:
CALCUL REOUVERTURE: %VALEUR de reouverture 
	- MODE 1: DERNIER SUPERCOUT
	- MODE 2: PREMIER SUPERCOUT
	- MODE 3: MOYENNE DES SUPERCOUTS 
	- MODE 4: SOMME DES SUPERCOUTS 
	
IMPORT MVT:
- (OK) NOUVELLE COLONNE:
	- mode 
	- uniquement valide pour le mvt open

front:
 - dialogue de reouverture:  
	- ZONE DE LISTE [1,2,3,4] dans l'import pour chaque ligne.
appel function/ version avec idTicket

