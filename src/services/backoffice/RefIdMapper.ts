/**
 * Utilitaire pour gérer les mappings entre références (ref_employe, position, etc.)
 * et les IDs Dolibarr.
 * 
 * Permet des correspondances bidirectionnelles :
 * - ref → id
 * - id → ref(s)
 */
export class RefIdMapper {
  private refToId: Map<string, number> = new Map();
  private idToRefs: Map<number, Set<string>> = new Map();

  constructor() {}

  /**
   * Ajoute une correspondance ref ↔ id.
   * @param ref Référence (ex: "1", "EMP001", "rakoto1")
   * @param id ID Dolibarr
   */
  add(ref: string, id: number): void {
    // Ajouter ref → id
    this.refToId.set(ref, id);

    // Ajouter id → [refs]
    if (!this.idToRefs.has(id)) {
      this.idToRefs.set(id, new Set());
    }
    this.idToRefs.get(id)?.add(ref);
  }

  /**
   * Récupère l'ID à partir d'une référence.
   * @param ref Référence à rechercher
   * @returns ID Dolibarr ou undefined si non trouvé
   */
  getId(ref: string): number | undefined {
    return this.refToId.get(ref);
  }

  /**
   * Récupère la première référence associée à un ID.
   * @param id ID Dolibarr
   * @returns Référence ou undefined si non trouvé
   */
  getFirstRef(id: number): string | undefined {
    const refs = this.idToRefs.get(id);
    return refs ? Array.from(refs)[0] : undefined;
  }

  /**
   * Récupère toutes les références associées à un ID.
   * @param id ID Dolibarr
   * @returns Tableau de références ou tableau vide
   */
  getAllRefs(id: number): string[] {
    const refs = this.idToRefs.get(id);
    return refs ? Array.from(refs) : [];
  }

  /**
   * Vérifie si une référence existe.
   * @param ref Référence à vérifier
   */
  hasRef(ref: string): boolean {
    return this.refToId.has(ref);
  }

  /**
   * Vérifie si un ID existe.
   * @param id ID à vérifier
   */
  hasId(id: number): boolean {
    return this.idToRefs.has(id);
  }

  /**
   * Retourne le nombre d'entrées.
   */
  get size(): number {
    return this.refToId.size;
  }

  /**
   * Retourne le mapping ref → id sous forme d'objet (pour compatibilité avec l'ancien code).
   */
  toRefToIdObject(): Record<string, number> {
    const obj: Record<string, number> = {};
    this.refToId.forEach((id, ref) => {
      obj[ref] = id;
    });
    return obj;
  }

  /**
   * Remplit le mapper depuis un objet ref → id.
   * @param obj Objet de mapping ref → id
   */
  fromRefToIdObject(obj: Record<string, number>): void {
    Object.entries(obj).forEach(([ref, id]) => {
      this.add(ref, id);
    });
  }

  /**
   * Vide le mapper.
   */
  clear(): void {
    this.refToId.clear();
    this.idToRefs.clear();
  }

  /**
   * Affiche le contenu du mapper dans la console (pour debug).
   * @param label Label pour identifier le log
   */
  debugLog(label: string = "RefIdMapper"): void {
    console.log(`\n=== [DEBUG] ${label} ===`);
    console.log("- Références → ID:");
    this.refToId.forEach((id, ref) => {
      console.log(`  - "${ref}" → ${id}`);
    });
    console.log("- ID → Références:");
    this.idToRefs.forEach((refs, id) => {
      console.log(`  - ${id} → [${Array.from(refs).map(r => `"${r}"`).join(", ")}]`);
    });
    console.log(`- Taille: ${this.size}`);
  }
}
