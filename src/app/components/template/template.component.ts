import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface PatternVm {
  id: number;
  name: string;
  green: number;
  amber: number;
  red: number;
}
interface TemplateVm {
  id: number;
  name: string;
}
interface TemplateRow {
  lightPatternID: number;
  startFrom: string; // "HH:mm" للعرض
  finishBy: string; // "HH:mm" للعرض
  displayName?: string;
}
interface UpdateTemplatePattern {
  lightPatternID: number;
  startFrom: string; // "HH:mm:ss"
  finishBy: string; // "HH:mm:ss"
}
interface UpdateTemplateReq {
  id: number;
  name: string;
  patterns: UpdateTemplatePattern[];
}

/** DTO راجع من /api/TemplatePattern/list */
interface TemplatePatternDto {
  ID: number;
  TemplateID: number;
  PetternID: number; // (اسم العمود فيه typo في الداتابيز)
  StartFrom: string; // غالبًا "HH:mm:ss"
  FinishBy: string; // غالبًا "HH:mm:ss"
}

@Component({
  selector: 'app-template',
  templateUrl: './template.component.html',
  styleUrls: ['./template.component.css'],
})
export class TemplateComponent implements OnInit {
  private baseUrl = environment.baseUrl;

  // يسار: Light Pattern
  patterns: PatternVm[] = [];
  selectedPatternId = 0;
  patternForm: FormGroup;

  // يمين: Templates
  templates: TemplateVm[] = [];
  selectedTemplateId = 0;
  templateNameCtrl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(200)],
  });
  templateRows: TemplateRow[] = [];
  readonly MAX_ROWS = 4;

  // كل الـ TemplatePatterns (نجيبهم مرة ونفلتر)
  allTemplatePatterns: TemplatePatternDto[] = [];

  loading = false;
  errorMsg = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.patternForm = this.fb.group({
      id: [0, [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      green: [
        30,
        [Validators.required, Validators.min(0), Validators.max(1000)],
      ],
      amber: [
        10,
        [Validators.required, Validators.min(0), Validators.max(1000)],
      ],
      red: [30, [Validators.required, Validators.min(0), Validators.max(1000)]],
    });
    this.patternForm = this.fb.group({
      id: [0, [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      green: [
        30,
        [Validators.required, Validators.min(0), Validators.max(1000)],
      ],
      amber: [
        10,
        [Validators.required, Validators.min(0), Validators.max(1000)],
      ],
      red: [{ value: 30, disabled: true }, [Validators.required]],
    });
  }

  ngOnInit(): void {
    // روابط التحميل زي ما هي
    this.loadPatterns(() => {
      this.loadTemplates(() => {
        this.loadTemplatePatterns(() => {
          this.onTemplateChanged(0);
        });
      });
    });

    this.patternForm
      .get('green')
      ?.valueChanges.subscribe(() => this.updateRed());
    this.patternForm
      .get('amber')
      ?.valueChanges.subscribe(() => this.updateRed());

    this.updateRed();
  }
  private updateRed() {
    const g = Number(this.patternForm.get('green')?.value ?? 0);
    const a = Number(this.patternForm.get('amber')?.value ?? 0);
    this.patternForm.get('red')?.setValue(g + a, { emitEvent: false });
  }

  // ================= Utils =================
  private toTimeSpan(v: string): string {
    // "HH:mm" -> "HH:mm:ss"
    if (!v) return '00:00:00';
    const [hh = '00', mm = '00', ss = '00'] = v.split(':');
    return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${(
      ss ?? '00'
    ).padStart(2, '0')}`;
  }
  private fromTimeSpan(v: any): string {
    // يحوّل أي شكل محتمل لواجهة عرض "HH:mm"
    if (!v) return '00:00';
    // ممكن ييجي "HH:mm:ss"
    if (typeof v === 'string' && v.includes(':')) {
      const parts = v.split(':'); // ["HH","mm","ss?"]
      return `${(parts[0] ?? '00').padStart(2, '0')}:${(
        parts[1] ?? '00'
      ).padStart(2, '0')}`;
    }
    // fallback
    return '00:00';
  }
  private getPatternNameById(id: number) {
    return this.patterns.find((p) => p.id === id)?.name ?? '';
  }
  private handleError(e: any, fallback = 'Unexpected error.') {
    console.error(e);
    this.errorMsg =
      typeof e?.error === 'string' ? e.error : e?.message ?? fallback;
  }

  // ================= Loaders =================
  loadPatterns(done?: () => void): void {
    this.loading = true;
    this.http.get<any[]>(`${this.baseUrl}/api/Pattern/list`).subscribe({
      next: (res) => {
        const mapped: PatternVm[] = (res ?? []).map((x) => ({
          id: Number(x.ID ?? x.id ?? 0),
          name: String(x.Name ?? x.name ?? ''),
          green: Number(x.Green ?? x.green ?? 0),
          amber: Number(x.Amber ?? x.amber ?? 0),
          red: Number(x.Red ?? x.red ?? 0),
        }));
        const newItem: PatternVm = {
          id: 0,
          name: '- New Pattern -',
          green: 30,
          amber: 10,
          red: 30,
        };
        this.patterns = [newItem, ...mapped];
        this.onPatternChanged(0);
        this.loading = false;
        done?.();
      },
      error: (err) => {
        this.loading = false;
        this.handleError(err);
        done?.();
      },
    });
  }

  loadTemplates(done?: () => void): void {
    this.loading = true;
    this.http.get<any[]>(`${this.baseUrl}/api/Template/list`).subscribe({
      next: (res) => {
        const mapped: TemplateVm[] = (res ?? []).map((x) => ({
          id: Number(x.ID ?? x.id ?? 0),
          name: String(x.Name ?? x.name ?? ''),
        }));
        const newTemplate: TemplateVm = { id: 0, name: '- New Template -' };
        this.templates = [newTemplate, ...mapped];
        this.loading = false;
        done?.();
      },
      error: (err) => {
        this.loading = false;
        this.handleError(err);
        done?.();
      },
    });
  }

  loadTemplatePatterns(done?: () => void): void {
    this.loading = true;
    this.http
      .get<TemplatePatternDto[]>(`${this.baseUrl}/api/TemplatePattern/list`)
      .subscribe({
        next: (res) => {
          this.allTemplatePatterns = res ?? [];
          this.loading = false;
          done?.();
        },
        error: (err) => {
          this.loading = false;
          this.handleError(err);
          done?.();
        },
      });
  }

  // ================= Pattern section =================
  onPatternDropdownChange(val: number | string) {
    this.onPatternChanged(Number(val));
  }
  private onPatternChanged(id: number) {
    this.selectedPatternId = id;
    if (id === 0) {
      this.patternForm.reset({
        id: 0,
        name: '',
        green: 30,
        amber: 10,
        red: 0,
      });
      return;
    }
    const p = this.patterns.find((x) => x.id === id);
    if (p) {
      this.patternForm.patchValue({
        id: p.id,
        name: p.name,
        green: p.green,
        amber: p.amber,
        red: p.red,
      });
    }
  }

  savePattern() {
    if (this.patternForm.invalid) {
      this.patternForm.markAllAsTouched();
      return;
    }
    this.errorMsg = '';

    const v = this.patternForm.value;
    const id = Number(v.id ?? 0);

    if (id === 0) {
      const params = new HttpParams()
        .set('name', String(v.name ?? ''))
        .set('red', String(v.red ?? 0))
        .set('amber', String(v.amber ?? 0))
        .set('green', String(v.green ?? 0));

      this.loading = true;
      this.http
        .get(`${this.baseUrl}/api/add/pattern`, {
          params,
          responseType: 'text',
        })
        .subscribe({
          next: (_) => {
            this.loading = false;
            this.loadPatterns(() => {
              const newPat = this.patterns.find((p) => p.name === v.name);
              // if (newPat) this.onPatternChanged(newPat.id);
            });
            alert('Pattern added successfully.');
          },
          error: (err) => {
            this.loading = false;
            this.handleError(err);
          },
        });

      return;
    }

    const params = new HttpParams()
      .set('ID', String(id))
      .set('Name', String(v.name ?? ''))
      .set('R', String(v.red ?? 0))
      .set('A', String(v.amber ?? 0))
      .set('G', String(v.green ?? 0));

    this.loading = true;
    this.http
      .get(`${this.baseUrl}/api/Pattern/Set`, { params, responseType: 'text' })
      .subscribe({
        next: (_) => {
          this.loading = false;
          this.loadPatterns(() => this.onPatternChanged(id));
          alert('Pattern updated successfully.');
        },
        error: (err) => {
          this.loading = false;
          this.handleError(err);
        },
      });
  }

  deletePattern() {
    const id = Number(this.patternForm.value.id ?? 0);
    if (!id || id <= 0) {
      alert('Select an existing pattern to delete.');
      return;
    }
    const v = this.patternForm.value;

    const params = new HttpParams()
      .set('ID', String(-Math.abs(id)))
      .set('Name', String(v.name ?? ''))
      .set('R', String(v.red ?? 0))
      .set('A', String(v.amber ?? 0))
      .set('G', String(v.green ?? 0));

    this.loading = true;
    this.http
      .get(`${this.baseUrl}/api/Pattern/Set`, { params, responseType: 'text' })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.loadPatterns();
          alert(res || 'Delete successfully');
        },
        error: (err) => {
          this.loading = false;
          this.handleError(err);
        },
      });
  }

  addPatternRow() {
    if (this.selectedPatternId <= 0) {
      alert('Select a valid light pattern.');
      return;
    }
    if (this.templateRows.length >= this.MAX_ROWS) {
      alert(`MAX patterns [${this.MAX_ROWS}] per template`);
      return;
    }
    if (
      this.templateRows.some((r) => r.lightPatternID === this.selectedPatternId)
    ) {
      alert('Pattern already added.');
      return;
    }
    this.templateRows = [
      ...this.templateRows,
      {
        lightPatternID: this.selectedPatternId,
        startFrom: '00:00',
        finishBy: '23:59',
        displayName: this.getPatternNameById(this.selectedPatternId),
      },
    ];
  }
  removePatternRow(id: number) {
    this.templateRows = this.templateRows.filter(
      (r) => r.lightPatternID !== id
    );
  }

  // ================= Template section =================
  onTemplateDropdownChange(val: number | string) {
    this.onTemplateChanged(Number(val));
  }

  private onTemplateChanged(id: number) {
    this.selectedTemplateId = id;

    if (id === 0) {
      // template جديد
      this.templateNameCtrl.setValue('');
      this.templateRows = [];
      return;
    }

    // عبّي الاسم من القائمة
    const t = this.templates.find((x) => x.id === id);
    if (t) this.templateNameCtrl.setValue(t.name);

    // فلترة الـ rows لهذا الـ template من الـ cache
    const rows = (this.allTemplatePatterns ?? []).filter(
      (tp) => Number(tp.TemplateID) === id && Number(tp.PetternID) > 0
    );

    // حوّل DTO -> TemplateRow (مع أسماء الـ patterns)
    this.templateRows = rows.map((tp) => {
      const pid = Number(tp.PetternID);
      return {
        lightPatternID: pid,
        startFrom: this.fromTimeSpan(tp.StartFrom),
        finishBy: this.fromTimeSpan(tp.FinishBy),
        displayName: this.getPatternNameById(pid),
      };
    });

    // (اختياري) لو عندك Patterns لسه متحمّلتش وقت أول فتح الصفحة، اتأكد
    if (!this.patterns.length)
      this.loadPatterns(() => {
        this.templateRows = this.templateRows.map((r) => ({
          ...r,
          displayName: this.getPatternNameById(r.lightPatternID),
        }));
      });
  }

  saveTemplate() {
    if (this.templateNameCtrl.invalid) {
      this.templateNameCtrl.markAsTouched();
      return;
    }
    this.errorMsg = '';
    const patterns: UpdateTemplatePattern[] = this.templateRows.map((r) => ({
      lightPatternID: r.lightPatternID,
      startFrom: this.toTimeSpan(r.startFrom),
      finishBy: this.toTimeSpan(r.finishBy),
    }));
    const body: UpdateTemplateReq = {
      id: Number(this.selectedTemplateId || 0),
      name: this.templateNameCtrl.value ?? '',
      patterns,
    };
    this.loading = true;
    this.http
      .post(`${this.baseUrl}/api/Template/Set`, body, { responseType: 'text' })
      .subscribe({
        next: (_) => {
          this.loading = false;
          // بعد الحفظ.. حدّث القوائم و اقرأ template-patterns من جديد
          this.loadTemplates(() => {
            this.loadTemplatePatterns(() =>
              this.onTemplateChanged(this.selectedTemplateId)
            );
          });
          alert('Template saved.');
        },
        error: (err) => {
          this.loading = false;
          this.handleError(err);
        },
      });
  }

  deleteTemplate() {
    if (!this.selectedTemplateId || this.selectedTemplateId <= 0) {
      alert('Select existing template to delete.');
      return;
    }
    const body: UpdateTemplateReq = {
      id: -Math.abs(this.selectedTemplateId),
      name: this.templateNameCtrl.value ?? '',
      patterns: [],
    };
    this.loading = true;
    this.http
      .post(`${this.baseUrl}/api/Template/Set`, body, { responseType: 'text' })
      .subscribe({
        next: (_) => {
          this.loading = false;
          this.loadTemplates(() => {
            this.loadTemplatePatterns(() => this.onTemplateChanged(0));
          });
          alert('Template deleted.');
        },
        error: (err) => {
          this.loading = false;
          this.handleError(err);
        },
      });
  }

  trackByPatternId = (_: number, item: TemplateRow) => item.lightPatternID;
}
