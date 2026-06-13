/**
 * Simple fuzzy search implementation for product filtering
 */

export interface SearchResult<T> {
  item: T;
  score: number;
}

function calculateFuzzyScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 1000;

  // Starts with query
  if (textLower.startsWith(queryLower)) return 500;

  // Contains query as substring
  if (textLower.includes(queryLower)) return 300;

  // Fuzzy matching: check if all characters in query appear in order in text
  let queryIdx = 0;
  let score = 0;
  let lastIdx = -1;

  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      score += 100 - (i - lastIdx); // Closer matches score higher
      lastIdx = i;
      queryIdx++;
    }
  }

  // Return 0 if not all characters were found
  return queryIdx === queryLower.length ? score : 0;
}

export function fuzzySearch<T>(
  query: string,
  items: T[],
  getSearchText: (item: T) => string | string[]
): SearchResult<T>[] {
  if (!query.trim()) return items.map((item) => ({ item, score: 0 }));

  const results = items
    .map((item) => {
      const searchTexts = Array.isArray(getSearchText(item))
        ? (getSearchText(item) as string[])
        : [getSearchText(item) as string];

      const maxScore = Math.max(...searchTexts.map((text: string) => calculateFuzzyScore(query, text)));

      return { item, score: maxScore };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);

  return results;
}

// Bug #10 fix: safe JSON parse so malformed tag strings never crash the search
function safeParseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function fuzzySearchProducts(
  query: string,
  products: any[]
): any[] {
  return fuzzySearch(query, products, (product) => {
    const tags = safeParseTags(product.tags);
    return [
      product.name,
      product.description || '',
      ...tags,
    ];
  }).map((result) => result.item);
}
