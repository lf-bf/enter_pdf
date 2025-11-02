/**
 * Extrai apenas as chaves (esqueleto) do schema de extração,
 * removendo valores e mantendo a estrutura hierárquica
 */
export const extractSchemaSkeleton = (schema: any): any => {
    if (Array.isArray(schema)) {
        return [];
    } else if (typeof schema === 'object' && schema !== null) {
        const skeleton: any = {};
        for (const key in schema) {
            if (schema.hasOwnProperty(key)) {
                skeleton[key] = extractSchemaSkeleton(schema[key]);
            }
        }
        return skeleton;
    } else {
        return "";
    }
};
