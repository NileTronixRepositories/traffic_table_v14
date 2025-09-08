import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Pattern } from '../model/pattern';

@Injectable({
  providedIn: 'root',
})
export class PatternService {
  private baseUrl = 'http://192.168.1.43/TLC/api';
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

  updatePattern(p: Pattern): Observable<any> {
    const params: any = {
      ID: p.ID,
      Name: p.Name,
      R: p.RedDuration,
      A: p.AmberDuration,
      G: p.GreenDuration,
    };

    return this.http.get(`${this.baseUrl}/Pattern/Set`, {
      params,
      responseType: 'text',
    });
  }
}
