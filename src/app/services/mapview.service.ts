import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MapviewService {
  private baseUrl = `${environment.baseUrl}/api`;

  constructor(private http: HttpClient) {}

  getGovernorates(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.baseUrl}/api/Governorates/list`
    );
  }

  getAreas(govId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.baseUrl}/api/Areas/list?governorateId=${govId}`
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
  getTemplatePatternById(templateId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/SelectTemplatePattern?id=${templateId}`
    );
  }
}
