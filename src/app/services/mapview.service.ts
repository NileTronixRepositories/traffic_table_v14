import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapviewService {
  private baseUrl = 'http://192.168.1.43/TLC/api';

  constructor(private http: HttpClient) {}

  getGovernorates(): Observable<any[]> {
    return this.http.get<any[]>(
      'http://192.168.1.43/TLC/api/Governorates/list'
    );
  }

  getAreas(govId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `http://192.168.1.43/TLC/api/Areas/list?governorateId=${govId}`
    );
  }

  getLocations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get/control-box`);
  }

  setLocation(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Locations/Set`, data);
  }

  deleteLocation(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Locations/Delete/${id}`);
  }

  getPatterns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Pattern/list`);
  }

  getTemplatePatterns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/TemplatePattern/list`);
  }

  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Template/list`);
  }
}
