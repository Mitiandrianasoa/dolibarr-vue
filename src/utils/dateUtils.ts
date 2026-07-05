// src/utils/dateUtils.ts

/**
 * Classe utilitaire pour gérer les dates entre Dolibarr et Vue.js.
 * Dolibarr renvoie et utilise souvent des timestamps en secondes.
 * Afin d'éviter les décalages de fuseau horaire (les dates qui basculent à la veille à 23h),
 * nous ajoutons systématiquement un offset de 12 heures (43200 secondes).
 */
export class DateUtils {
  private static SAFE_OFFSET = 43200;

  /**
   * Formate un timestamp (secondes ou millisecondes) au format 'JJ/MM/AAAA'
   */
  static toDisplayFormat(timestamp: string | number | null | undefined): string {
    if (!timestamp) return '-';
    const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp as string, 10);
    if (isNaN(ts) || ts <= 0) return '-';
    
    if (ts < 10000000000) {
      return new Date((ts + this.SAFE_OFFSET) * 1000).toLocaleDateString('fr-FR');
    }
    return new Date(ts).toLocaleDateString('fr-FR');
  }

  /**
   * Convertit un timestamp en chaîne 'YYYY-MM-DD' (exigée par <input type="date">)
   */
  static toInputFormat(timestamp: string | number | null | undefined): string {
    if (!timestamp) return '';
    const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp as string, 10);
    if (isNaN(ts) || ts <= 0) return '';
    
    const d = ts < 10000000000 ? new Date((ts + this.SAFE_OFFSET) * 1000) : new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Extrait l'année et le mois 'YYYY-MM' d'un timestamp (utile pour les regroupements)
   */
  static getYearMonth(timestamp: string | number | null | undefined): string | null {
    if (!timestamp) return null;
    const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp as string, 10);
    if (isNaN(ts) || ts <= 0) return null;
    
    const d = ts < 10000000000 ? new Date((ts + this.SAFE_OFFSET) * 1000) : new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Retourne une nouvelle Date correspondant au mois suivant
   * @param date Date de départ (objet Date, string 'YYYY-MM-DD' ou timestamp)
   * @returns Date du mois suivant en format 'YYYY-MM-DD'
   */
  static getNextMonth(date: Date | string | number): string {
    let targetDate: Date;

    if (date instanceof Date) {
      targetDate = new Date(date);
    } else if (typeof date === 'string') {
      targetDate = new Date(date);
    } else if (typeof date === 'number') {
      targetDate = date < 10000000000 ? new Date((date + this.SAFE_OFFSET) * 1000) : new Date(date);
    } else {
      throw new Error("Paramètre invalide : veuillez fournir un objet Date, une chaîne de caractères ou un timestamp valide.");
    }

    if (isNaN(targetDate.getTime())) {
      throw new Error("Paramètre invalide : la date n'est pas valide.");
    }

    const nextMonthDate = new Date(targetDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    if (nextMonthDate.getDate() !== targetDate.getDate()) {
      nextMonthDate.setDate(0);
    }

    const year = nextMonthDate.getFullYear();
    const month = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextMonthDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
