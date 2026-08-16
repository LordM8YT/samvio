export type PlanCode = 'free' | 'person' | 'family' | 'team' | 'association' | 'organization';
export type PersonalPlanCode = 'free' | 'person' | 'family';
export type Plan = {
  code: PlanCode;
  name: string;
  audience: string;
  monthlyPriceNok: number | null;
  featured?: boolean;
  purchaseReady?: boolean;
  features: string[];
};

export const personalPlanEntitlements: Record<PersonalPlanCode, {
  originalImageQuality: boolean;
  fullArchive: boolean;
  storageLimitBytes: number;
}> = {
  free: { originalImageQuality: false, fullArchive: false, storageLimitBytes: 1024 * 1024 * 1024 },
  person: { originalImageQuality: true, fullArchive: true, storageLimitBytes: 5 * 1024 * 1024 * 1024 },
  family: { originalImageQuality: true, fullArchive: true, storageLimitBytes: 5 * 1024 * 1024 * 1024 }
};

export const plans: Plan[] = [
  { code: 'free', name: 'Gratis', audience: 'For alle', monthlyPriceNok: 0, features: ['Kronologisk feed', 'Bilder og kommentarer', 'Venner og fellesskap', '1 GB lagring for innlegg', 'Alle sikkerhetsfunksjoner'] },
  { code: 'person', name: 'Person', audience: 'For enkeltpersoner', monthlyPriceNok: 29, purchaseReady: true, features: ['Alt i Gratis', '5 GB lagring for innlegg', 'Original bildekvalitet', 'Hele det private arkivet'] },
  { code: 'family', name: 'Familie', audience: 'Opptil 6 personer', monthlyPriceNok: 59, featured: true, features: ['Alt i Person', 'Felles familiealbum', 'Familieadministrasjon', 'Foresattverktøy uten pristillegg'] },
  { code: 'team', name: 'Lag', audience: 'Idrettslag og mindre klubber', monthlyPriceNok: 299, features: ['Private medlemsrom', 'Flere administratorer', 'Medlemsadministrasjon', 'Arrangementer'] },
  { code: 'association', name: 'Forening', audience: 'Foreninger med undergrupper', monthlyPriceNok: 599, features: ['Alt i Lag', 'Flere grupper og roller', 'Utvidet moderering', 'Eksport av medlemsoversikt'] },
  { code: 'organization', name: 'Organisasjon', audience: 'Større organisasjoner', monthlyPriceNok: null, features: ['Tilpasset medlemskap', 'Prioritert support', 'Rapportering', 'Tilpasset oppsett'] }
];
