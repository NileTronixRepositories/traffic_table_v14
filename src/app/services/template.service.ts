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

  /** Save or Delete Template */
  saveTemplate(
    template: Template,
    patterns: TemplatePattern[]
  ): Observable<any> {
    // ⚡ delete = ID * -1
    const payload = {
      ID: template.ID,
      Name: template.Name,
      Patterns: patterns.map((p) => ({
        LightPatternID: p.PatternID,
        StartFrom: this.ensureHhMmSs(p.StartFrom),
        FinishBy: this.ensureHhMmSs(p.FinishBy),
      })),
    };
    return this.http.post(`${this.baseUrl}/Template/Set`, payload, {
      responseType: 'text',
    });
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
      `${this.baseUrl}/SelectTemplatePattern/${templateID}`
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
