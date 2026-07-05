// src/utils/dateUtils.ts

/**
 * DEUX TYPES DE DATES DANS CE PROJET — règle à connaître pour l'exam :
 *
 *  TYPE 1 — Timestamp Dolibarr  : nombre entier (ex: 1751328000)
 *           = secondes depuis le 1er jan 1970 UTC
 *           → toDisplayFormat(), toInputFormat(), getYearMonth(), getNextMonth()
 *
 *  TYPE 2 — String locale       : chaîne 'YYYY-MM-DD' (ex: '2026-07-01')
 *           = vient de <input type="date"> ou du backend Java (LocalDate)
 *           → parseLocalDate(), isInRange(), isFixedHolidayInRange(),
 *             getYearMonthFromInput(), inputToTimestamp()
 *
 *  RÈGLE D'OR : ne jamais écrire new Date('YYYY-MM-DD') directement.
 *  new Date('2026-07-01')         → UTC minuit  ← PIÈGE (décalage fuseau horaire)
 *  new Date('2026-07-01T00:00:00') → local minuit ← CORRECT
 *  → Toujours passer par DateUtils.parseLocalDate('2026-07-01')
 */
export class DateUtils {

  // ─── CONSTANTES ────────────────────────────────────────────────────────────

  private static SAFE_OFFSET = 43200; // +12h en secondes, évite le basculement à J-1


  // ══════════════════════════════════════════════════════════════════════════
  // TYPE 1 : TIMESTAMP DOLIBARR (nombre en secondes)
  // ══════════════════════════════════════════════════════════════════════════

  /** Timestamp (secondes ou ms) → 'JJ/MM/AAAA' pour l'affichage */
  static toDisplayFormat(timestamp: string | number | null | undefined): string {
    if (!timestamp) return '-';
    const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp as string, 10);
    if (isNaN(ts) || ts <= 0) return '-';
    if (ts < 10000000000) {
      return new Date((ts + this.SAFE_OFFSET) * 1000).toLocaleDateString('fr-FR');
    }
    return new Date(ts).toLocaleDateString('fr-FR');
  }

  /** Timestamp (secondes ou ms) → 'YYYY-MM-DD' pour <input type="date"> */
  static toInputFormat(timestamp: string | number | null | undefined): string {
    if (!timestamp) return '';
    const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp as string, 10);
    if (isNaN(ts) || ts <= 0) return '';
    const d = ts < 10000000000 ? new Date((ts + this.SAFE_OFFSET) * 1000) : new Date(ts);
    return this._dateToYMD(d);
  }

  /** Timestamp (secondes ou ms) → 'YYYY-MM' pour les regroupements par mois */
  static getYearMonth(timestamp: string | number | null | undefined): string | null {
    if (!timestamp) return null;
    const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp as string, 10);
    if (isNaN(ts) || ts <= 0) return null;
    const d = ts < 10000000000 ? new Date((ts + this.SAFE_OFFSET) * 1000) : new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Timestamp ou string ou Date → 'YYYY-MM-DD' du mois suivant */
  static getNextMonth(date: Date | string | number): string {
    let targetDate: Date;
    if (date instanceof Date) {
      targetDate = new Date(date);
    } else if (typeof date === 'string') {
      targetDate = this.parseLocalDate(date);
    } else {
      targetDate = date < 10000000000 ? new Date((date + this.SAFE_OFFSET) * 1000) : new Date(date);
    }
    if (isNaN(targetDate.getTime())) throw new Error('Date invalide');

    const next = new Date(targetDate);
    next.setMonth(next.getMonth() + 1);
    if (next.getDate() !== targetDate.getDate()) next.setDate(0);
    return this._dateToYMD(next);
  }


  // ══════════════════════════════════════════════════════════════════════════
  // TYPE 2 : STRING LOCALE 'YYYY-MM-DD'
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * 'YYYY-MM-DD' → objet Date à minuit LOCAL (pas UTC).
   * C'est LA fonction de base à utiliser pour tout ce qui vient d'un <input type="date">
   * ou d'un LocalDate Java sérialisé en JSON.
   */
  static parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d); // local minuit, cohérent avec new Date(annee, mois, jour)
  }

  /**
   * 'YYYY-MM-DD' → 'YYYY-MM' sans aucun risque de fuseau horaire.
   * À utiliser à la place de getYearMonth() quand tu as déjà une string 'YYYY-MM-DD'.
   * Ex: getYearMonthFromInput('2026-07-01') → '2026-07'
   */
  static getYearMonthFromInput(dateStr: string): string {
    return dateStr.slice(0, 7);
  }

  /**
   * 'YYYY-MM-DD' → timestamp en SECONDES pour l'API Dolibarr / backend Spring Boot.
   * Ex: inputToTimestamp('2026-07-01') → 1751292000 (minuit local en secondes)
   */
  static inputToTimestamp(dateStr: string): number {
    return Math.floor(this.parseLocalDate(dateStr).getTime() / 1000);
  }

  /**
   * 'YYYY-MM-DD' → 'JJ/MM/AAAA' pour l'affichage, sans passer par un timestamp.
   * Ex: inputToDisplayFormat('2026-07-01') → '01/07/2026'
   */
  static inputToDisplayFormat(dateStr: string): string {
    if (!dateStr) return '-';
    const d = this.parseLocalDate(dateStr);
    return d.toLocaleDateString('fr-FR');
  }

  /**
   * Vérifie si une date (string 'YYYY-MM-DD') tombe dans l'intervalle [datesp, dateep].
   * Utilise pour les jours fériés non récurrents (fixe = 0).
   */
  static isInRange(dateStr: string, datesp: string, dateep: string): boolean {
    const d     = this.parseLocalDate(dateStr);
    const debut = this.parseLocalDate(datesp);
    const fin   = this.parseLocalDate(dateep);
    return d >= debut && d <= fin;
  }

  /**
   * Vérifie si un jour férié RÉCURRENT (fixe = 1 : même mois/jour chaque année)
   * tombe dans l'intervalle [datesp, dateep].
   * Teste chaque année couverte par la période (utile si la période chevauche deux années).
   *
   * @param ferieMonth  mois du férié (0-11, comme Date.getMonth())
   * @param ferieDay    jour du férié (1-31)
   */
  static isFixedHolidayInRange(ferieMonth: number, ferieDay: number, datesp: string, dateep: string): boolean {
    const debut = this.parseLocalDate(datesp);
    const fin   = this.parseLocalDate(dateep);
    for (let annee = debut.getFullYear(); annee <= fin.getFullYear(); annee++) {
      const candidat = new Date(annee, ferieMonth, ferieDay); // local minuit, cohérent
      if (candidat >= debut && candidat <= fin) return true;
    }
    return false;
  }


  // ─── HELPER PRIVÉ ──────────────────────────────────────────────────────────

  private static _dateToYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
