export interface Location {
  ID: number;
  GovernerateID: number;
  AreaID: number;
  Name: string;
  Latitude: string;
  Longitude: string;
  IPAddress: string;
  TemplateID?: number;
  LightPatternID?: number;
  Red?: number;
  Amber?: number;
  Green?: number;
}
