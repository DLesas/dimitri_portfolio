import { useQuery } from "@tanstack/react-query";
import { type SkillRecord } from "@/components/WordCloud/Word";

/**
 * Fetches skills data for the word cloud visualization
 *
 * @param dataUrl - The URL to fetch skills data from (default: "/languages_modules.json")
 * @returns Query result with skills data array
 */
export function useSkillsData(dataUrl: string = "/languages_modules.json") {
  return useQuery<SkillRecord[]>({
    queryKey: ["skills", dataUrl],
    queryFn: async () => {
      const response = await fetch(dataUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch skills data: ${response.status}`);
      }

      const data = await response.json();
      return Object.values(data) as SkillRecord[];
    },
    // Skills data doesn't change frequently, so we can cache it for longer
    staleTime: Infinity, // 30 minutes
    gcTime: Infinity, // 1 hour (formerly cacheTime)
    retry: 2,
  });
}
