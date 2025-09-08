export interface Template {
  ID: number;
  Name: string;
}
export interface TemplatePattern {
  ID: number;
  TemplateID: number;
  Name?: string;
  PatternID: number;
  PetternID?: number;
  StartFrom: string;
  FinishBy: string;
}
