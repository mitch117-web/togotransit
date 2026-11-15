/**
 * Estimation du prix d'un colis enregistré depuis l'application mobile, avant son dépôt en agence.
 * C'est la même règle que celle que l'application affiche (« Estimation tarifaire ») : elle est recalculée
 * ici pour que le prix enregistré ne dépende jamais de ce qu'envoie le téléphone. Le tarif définitif est fixé
 * par l'agent au dépôt, après la pesée.
 */
export function estimerPrixColis(poidsKg: number, categorie: string): number {
  if (categorie === 'DOCUMENTS') return 1000
  let prix = 1500
  if (poidsKg > 1) prix += (poidsKg - 1) * 500
  if (categorie === 'FRAGILE') prix += 1000
  return Math.round(prix)
}
