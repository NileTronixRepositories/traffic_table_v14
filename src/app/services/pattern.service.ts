import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Pattern } from '../model/pattern';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PatternService {
  private baseUrl = `${environment.baseUrl}/api`;
  constructor(private http: HttpClient) {}

  getPatterns(): Observable<Pattern[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Pattern/list`).pipe(
      map((rows) =>
        rows.map((r) => ({
          ID: r.ID,
          Name: r.Name,
          RedDuration: r.RedDuration ?? r.R ?? 0,
          AmberDuration: r.AmberDuration ?? r.A ?? 0,
          GreenDuration: r.GreenDuration ?? r.G ?? 0,
        }))
      )
    );
  }

  savePattern(p: any) {
    let params = new HttpParams()
      .set('ID', p.patternList ?? 0)
      .set('Name', p.name ?? '')
      .set('R', p.red ?? 0)
      .set('A', p.amber ?? 0)
      .set('G', p.green ?? 0);

    return this.http.get(`${this.baseUrl}/Pattern/Set`, {
      params,
      responseType: 'text',
    });
  }

  deletePattern(id: number): Observable<any> {
    const params: any = {
      ID: -id,
      Name: '',
      R: 0,
      A: 0,
      G: 0,
    };
    return this.http.get(`${this.baseUrl}/Pattern/Set`, {
      params,
      responseType: 'text',
    });
  }
  updatePattern(pattern: any): Observable<any> {
    if (pattern.ID && pattern.ID > 0) {
      return this.http.put(`${this.baseUrl}/Pattern/Set`, pattern);
    } else {
      return this.http.post(`${this.baseUrl}/Pattern/Set`, pattern);
    }
  }
}
