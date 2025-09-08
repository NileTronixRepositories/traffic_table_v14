import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Template, TemplatePattern } from '../model/template';

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  private baseUrl = 'http://192.168.1.43/TLC/api';

  constructor(private http: HttpClient) {}

  // ============== Templates ==============
  getTemplates(): Observable<Template[]> {
    return this.http.get<Template[]>(`${this.baseUrl}/Template/list`);
  }

  saveTemplate(template: Template, rows: TemplatePattern[]): Observable<any> {
    const params = new URLSearchParams();
    params.set('ID', template.ID.toString());
    params.set('Name', template.Name);

    rows.forEach((r, i) => {
      params.set(
        `Patterns[${i}].LightPatternID`,
        r.PatternID?.toString() ?? ''
      );
      params.set(`Patterns[${i}].StartFrom`, this.ensureHhMmSs(r.StartFrom));
      params.set(`Patterns[${i}].FinishBy`, this.ensureHhMmSs(r.FinishBy));
    });

    const url = `${this.baseUrl}/Template/Set?${params.toString()}`;
    return this.http.post(url, null);
  }

  // ============== Template Patterns (Schedules) ==============
  getTemplatePatterns(): Observable<TemplatePattern[]> {
    return this.http.get<TemplatePattern[]>(
      `${this.baseUrl}/TemplatePattern/list`
    );
  }

  getTemplatePatternsByTemplateId(
    templateID: number
  ): Observable<TemplatePattern[]> {
    return this.http.get<TemplatePattern[]>(
      `${this.baseUrl}/SelectTemplatePattern?id=${templateID}`
    );
  }

  // ============== Helpers ==============
  private ensureHhMmSs(t: string): string {
    if (!t) return '00:00:00';
    const parts = t.split(':');
    if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
    return t;
  }
}
