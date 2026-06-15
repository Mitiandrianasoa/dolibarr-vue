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



ALEA 1:
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

ALEA 2:
- Ticket CLosed l'on peut envoyer in progress
- Button: 
  - Annulation effacer dernier supercost depuis sqlite.
      - supercost liee a ce ticket
  - Reouverture
    - champs en pourcentage par exemple 10%
    - cout de reouverture 10% du supercost
    - l'on n'efface pas le supercost pour ce dernier
- page CostReportView.vue
  - ajout section cost reoverture 

//REAL LIGNE DE COMMADE QUI MARCHE POUR NOUS 
Get-ChildItem "D:\S6\EVAL\EVAL 2\gpli-vue" -Recurse |
Where-Object {$_.LastWriteTime -gt (Get-Date).AddMinutes(-30)} |
Sort-Object LastWriteTime -Descending |
Select-Object LastWriteTime, FullName