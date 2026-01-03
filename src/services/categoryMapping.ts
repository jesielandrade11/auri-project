import { supabase } from "@/integrations/supabase/client";

export interface CategoryMappingResult {
    categoria_id: string | null;
    confianca: "alta" | "media" | "baixa" | "nenhuma";
}

/**
 * Maps a category from Pluggy/bank API to an internal category in the database
 * @param categoriaOriginal - Original category name from the bank
 * @param userId - User ID for scoped category search
 * @returns CategoryMappingResult with the mapped category ID and confidence level
 */
export async function mapCategoryFromOriginal(
    categoriaOriginal: string | null | undefined,
    userId: string
): Promise<CategoryMappingResult> {
    // Return early if no category name provided
    if (!categoriaOriginal || categoriaOriginal.trim() === "") {
        return { categoria_id: null, confianca: "nenhuma" };
    }

    try {
        // 1. Fetch user's categories
        const { data: categorias, error } = await supabase
            .from("categorias")
            .select("id, nome")
            .eq("user_id", userId)
            .eq("ativo", true);

        if (error || !categorias || categorias.length === 0) {
            return { categoria_id: null, confianca: "nenhuma" };
        }

        const cleanOriginal = categoriaOriginal.trim().toLowerCase();

        // 2. Exact match (case insensitive)
        const exactMatch = categorias.find(
            (c) => c.nome.toLowerCase() === cleanOriginal
        );
        if (exactMatch) {
            return { categoria_id: exactMatch.id, confianca: "alta" };
        }

        // 3. Partial match (contains)
        const partialMatch = categorias.find(
            (c) =>
                c.nome.toLowerCase().includes(cleanOriginal) ||
                cleanOriginal.includes(c.nome.toLowerCase())
        );
        if (partialMatch) {
            return { categoria_id: partialMatch.id, confianca: "media" };
        }

        // 4. Keyword-based mapping
        const keywordMap: Record<string, string[]> = {
            Alimentação: [
                "food",
                "restaurant",
                "mercado",
                "super",
                "aliment",
                "padaria",
                "lanche",
                "café",
                "coffee",
                "groceries",
                "market",
            ],
            Transporte: [
                "uber",
                "transport",
                "99",
                "gas",
                "combustivel",
                "posto",
                "taxi",
                "metro",
                "onibus",
                "parking",
                "estacionamento",
            ],
            Saúde: [
                "farmacia",
                "hospital",
                "medic",
                "health",
                "clinica",
                "droga",
                "consulta",
                "exame",
            ],
            Educação: [
                "escola",
                "universidade",
                "curso",
                "livro",
                "education",
                "escola",
                "faculdade",
            ],
            Lazer: [
                "cinema",
                "teatro",
                "show",
                "ingresso",
                "entretenimento",
                "streaming",
                "netflix",
                "spotify",
            ],
            Moradia: [
                "aluguel",
                "condominio",
                "aluguer",
                "iptu",
                "rent",
                "casa",
                "apartamento",
            ],
            Serviços: [
                "agua",
                "luz",
                "internet",
                "telefone",
                "celular",
                "utilities",
                "conta",
                "energy",
            ],
            Vestuário: [
                "roupa",
                "calcado",
                "sapato",
                "clothing",
                "fashion",
                "moda",
                "loja",
            ],
        };



        for (const [categoriaName, keywords] of Object.entries(keywordMap)) {
            if (keywords.some((kw) => cleanOriginal.includes(kw.toLowerCase()))) {
                const match = categorias.find((c) => c.nome === categoriaName);
                if (match) {
                    return { categoria_id: match.id, confianca: "media" };
                }
            }
        }

        // 5. No match found
        return { categoria_id: null, confianca: "nenhuma" };
    } catch (error) {
        console.error("Error mapping category:", error);
        return { categoria_id: null, confianca: "nenhuma" };
    }
}

/**
 * Batch map multiple categories at once
 * @param categorias - Array of original category names
 * @param userId - User ID
 * @returns Array of mapping results
 */
export async function batchMapCategories(
    categorias: (string | null | undefined)[],
    userId: string
): Promise<CategoryMappingResult[]> {
    const results = await Promise.all(
        categorias.map((cat) => mapCategoryFromOriginal(cat, userId))
    );
    return results;
}
