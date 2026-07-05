1. Backoffice 
    - créer une page avec un bouton pour réinitialiser les données 
    - créer la page pour importer les 2 fichiers  
        -2 fichiers csv pour le contenu    
        - 1 fichier zip pour les images :  

    - Dashboard pour afficher  
        - le montant de salaire par genre 
        -
        - le montant de salaire par mois ( date debut salaire comme reference)

2. FrontOffice 
    - Créer la page pour afficher la liste des salairés 
        - avec recherche multi critère 
    - Page pour créer et payer un salaire ( on payer en plusieurs fois)  

PARTIE 2 
1. Backoffice 
    - ajouter une table jour férié dans sqlite 

2. FrontOffice 
    - créer un CRUD pour les jours fériés 
    - créer une page pour générer le salaire de plusieurs salariés en même temps 
        - il y a filtre qui permet de choisir les salariés 
            - Poste 
            - Genre 
            - Heure de travail min et max 

        - ensuite il y a un bouton générer salaire 
            - date début et date fin 
            - montant 
cela va générer le salaire de tous les employés sélectionnés par le 
filtre 

    - créer une page “liste salariés”, sans filtre(nouvelle page) 
        - créer un  lien pour chaque salairé, qui va afficher: 
            - les infos du salarié 
            - un tableau historique des salaires et les paiements 
            correspondant 
            - le montant “reste à payer” 