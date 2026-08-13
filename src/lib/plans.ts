export type PlanCode = 'free' | 'person' | 'family' | 'team' | 'association' | 'organization';
export type Plan = { code: PlanCode; name: string; audience: string; monthlyPriceNok: number | null; featured?: boolean; features: string[] };
export const plans: Plan[] = [
  { code: 'free', name: 'Gratis', audience: 'For alle', monthlyPriceNok: 0, features: ['Kronologisk feed', 'Bilder og kommentarer', 'Venner og fellesskap', 'Alle sikkerhetsfunksjoner'] },
  { code: 'person', name: 'Person', audience: 'For enkeltpersoner', monthlyPriceNok: 29, features: ['Alt i Gratis', 'Mer lagringsplass', 'Original bildekvalitet', 'Utvidet privat arkiv'] },
  { code: 'family', name: 'Familie', audience: 'Opptil 6 personer', monthlyPriceNok: 59, featured: true, features: ['Alt i Person', 'Felles familiealbum', 'Familieadministrasjon', 'Foresattverktøy uten pristillegg'] },
  { code: 'team', name: 'Lag', audience: 'Idrettslag og mindre klubber', monthlyPriceNok: 299, features: ['Private medlemsrom', 'Flere administratorer', 'Medlemsadministrasjon', 'Arrangementer'] },
  { code: 'association', name: 'Forening', audience: 'Foreninger med undergrupper', monthlyPriceNok: 599, features: ['Alt i Lag', 'Flere grupper og roller', 'Utvidet moderering', 'Eksport av medlemsoversikt'] },
  { code: 'organization', name: 'Organisasjon', audience: 'Større organisasjoner', monthlyPriceNok: null, features: ['Tilpasset medlemskap', 'Prioritert support', 'Rapportering', 'Tilpasset oppsett'] }
];
