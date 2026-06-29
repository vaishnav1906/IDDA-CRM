// Represents one parsed CSV row before validation.
// Header names are normalised to camelCase in the parser.
export type MedleadsImportRowDto = {
  clinicName?: string;
  doctorName?: string;
  phone?: string;
  address?: string;
  town?: string;
  city?: string;
  state?: string;
  category?: string;
  specialization?: string;
  rating?: string;
  reviews?: string;
  website?: string;
  mapsUrl?: string;
  source?: string;
  importedAt?: string;
  extractedAt?: string;
};

// A row that passed validation, with types resolved.
export type MedleadsValidatedRowDto = {
  clinicName: string;
  doctorName: string | null;
  phone: string | null;
  address: string | null;
  town: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  specialization: string | null;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  mapsUrl: string | null;
  source: string | null;
  importedAt: Date | null;
  extractedAt: Date | null;
};

// A row that failed validation, returned in the summary.
export type MedleadsFailedRowDto = {
  rowIndex: number;
  rawRow: Record<string, string>;
  reason: string;
};
