export const CATEGORY_RULES: Record<string, string[]> = {
    'Alimentação': ['ifood', 'uber eats', 'restaurante', 'padaria', 'mercado', 'supermercado', 'mc donalds', 'burger king'],
    'Transporte': ['uber', '99', 'posto', 'combustivel', 'estacionamento', 'pedagio'],
    'Saúde': ['farmacia', 'drogaria', 'hospital', 'clinica', 'medico', 'dentista'],
    'Lazer': ['netflix', 'spotify', 'cinema', 'teatro', 'show', 'steam', 'playstation', 'xbox'],
    'Serviços': ['aws', 'google', 'adobe', 'internet', 'vivo', 'claro', 'tim', 'oi'],
    'Educação': ['curso', 'udemy', 'alura', 'escola', 'faculdade'],
    'Compras': ['amazon', 'mercadolivre', 'shopee', 'shein', 'magalu'],
};

export function categorizeTransaction(description: string): string | null {
    const lowerDesc = description.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        if (keywords.some(keyword => lowerDesc.includes(keyword))) {
            return category;
        }
    }

    return null;
}
