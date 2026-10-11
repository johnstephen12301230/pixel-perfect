export type BuildingStyle = "glass-headquarters" | "corporate-skyscraper" | "technology-campus";

export interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  buildingStyle: BuildingStyle;
  accentColor: string;
  /** Height in floors. */
  floors: number;
  lotId: string;
  slotId: string;
  technologies: string[];
  departments: string[];
  features: string[];
  liveUrl: string | null;
  repositoryUrl: string | null;
  screenshots: string[];
  publicationStatus: "published" | "draft" | "demo";
}
