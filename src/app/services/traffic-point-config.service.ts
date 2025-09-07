import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TrafficPointConfigService {
  private baseUrl = 'http://192.168.1.43/TLC/api';

  constructor(private http: HttpClient) {}

  getGovernorates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Governorates/list`);
  }

  getAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Areas/list`);
  }

  getLocations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Locations`);
  }

  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Template/list`);
  }

  getPatterns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Pattern/list`);
  }

  getTemplatePatterns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/TemplatePattern/list`);
  }

  updateLocation(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Locations/Set`, data);
  }
}
