import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SetLocationRequest {
  ID: number | null;

  AreaID: number | null;
  AreaName: string;

  GovernerateID: number | null;
  GovernerateName: string;

  Name: string;
  IPAddress: string;

  Latitude: number;
  Longitude: number;

  R: number; // red seconds
  A: number; // amber
  G: number; // green

  BlinkRed: boolean | null;
  BlinkAmber: boolean | null;
  BlinkGreen: boolean | null;
  BlinkMs: number | null;

  ChangeMain: boolean | null;

  TemplateID: number;
  LightPatternID: number;

  UseTcp: boolean;
  TcpPort: number;
  DeviceId: number | null;
}

@Injectable({ providedIn: 'root' })
export class TrafficPointConfigService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  getGovernorates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/Governorates/list`);
  }
  getAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/Areas/list`);
  }
  getLocations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/Locations`);
  }
  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/Template/list`);
  }
  getPatterns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/Pattern/list`);
  }
  getTemplatePatterns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/TemplatePattern/list`);
  }

  /** POST → يطابق Set([FromBody] SetLocationRequest req) في Web API */
  setLocation(req: SetLocationRequest): Observable<string> {
    // لو عندك فعليًا /api/api/ بدّل إلى `${this.baseUrl}/api/Locations/Set` بعد تعديل baseUrl
    return this.http.post(`${this.baseUrl}/api/Locations/Set`, req, {
      responseType: 'text',
    });
  }
}
