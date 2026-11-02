export type BuildingStyle = "glass-headquarters" | "corporate-skyscraper" | "technology-campus";

export type TechnologyCategory = "Frontend" | "Backend" | "Database" | "Infrastructure" | "Other";

export interface TechnologyEntry {
  name: string;
  category: TechnologyCategory;
  responsibility: string;
}

/** published: bundled in source; local-draft: saved only in this browser; demo: fictional sample. */
export type PublicationStatus = "published" | "local-draft" | "draft" | "demo";

export interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  logoUrl?: string | null;
  buildingStyle: BuildingStyle;
  accentColor: string;
  /** Height in floors. */
  floors: number;
  lotId: string;
  slotId: string;
  /** Technology names; drive interior departments and employees. */
  technologies: string[];
  /** Optional richer stack data (category + responsibility per technology). */
  technologyDetails?: TechnologyEntry[];
  departments: string[];
  features: string[];
  liveUrl: string | null;
  repositoryUrl: string | null;
  documentationUrl?: string | null;
  demoUrl?: string | null;
  screenshots: string[];
  publicationStatus: PublicationStatus;
  createdAt?: string;
  schemaVersion?: number;
}
