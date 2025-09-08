import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  FormArray,
  Validators,
} from '@angular/forms';
import { TemplateService } from 'src/app/services/template.service';
import { Template, TemplatePattern } from 'src/app/model/template';
import { Pattern } from 'src/app/model/pattern';
import { PatternService } from 'src/app/services/pattern.service';
import { TrafficPointConfigService } from 'src/app/services/traffic-point-config.service';
import { interval } from 'rxjs';

@Component({
  selector: 'app-template',
  templateUrl: './template.component.html',
  styleUrls: ['./template.component.css'],
})
export class TemplateComponent implements OnInit {
  // Data
  patterns: Pattern[] = [];
  templates: Template[] = [];
  templatePatterns: TemplatePattern[] = [];

  // State
  selectedPatternId = 0;
  selectedTemplateId = 0;
  currentPatternID = 0;

  // Counters (زي TrafficPointConfig)
  RedCount = 0;
  YellowCount = 0;
  GreenCount = 0;
  run = false;

  // Forms
  patternForm: FormGroup;
  templateForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private patternService: PatternService,
    private templateService: TemplateService,
    private trafficPointConfigService: TrafficPointConfigService
  ) {
    // Pattern editor form
    this.patternForm = this.fb.group({
      patternList: [0, Validators.required],
      name: ['', Validators.required],
      red: [30, [Validators.required, Validators.min(0)]],
      amber: [10, [Validators.required, Validators.min(0)]],
      green: [30, [Validators.required, Validators.min(0)]],
      blink: [false],
    });

    // Template editor form
    this.templateForm = this.fb.group({
      templateList: [0],
      name: ['', Validators.required],
      patterns: this.fb.array([]),
      red: [30],
      yellow: [10],
      green: [30],
    });
  }

  // =================== Getters ===================
  get patternsArray(): FormArray {
    return this.templateForm.get('patterns') as FormArray;
  }
  get patternListControl(): FormControl {
    return this.patternForm.get('patternList') as FormControl;
  }
  get templateListControl(): FormControl {
    return this.templateForm.get('templateList') as FormControl;
  }

  // =================== Lifecycle ===================
  ngOnInit(): void {
    this.loadPatterns();

    this.patternListControl.valueChanges.subscribe((id: number) => {
      const p = this.patterns.find((x) => x.ID === id);
      if (!p) {
        this.currentPatternID = 0;
        this.patternForm.patchValue(
          { name: '', red: 0, amber: 0, green: 0 },
          { emitEvent: false }
        );
        this.RedCount = this.YellowCount = this.GreenCount = 0;
        return;
      }

      const red = p.RedDuration ?? 0;
      const amber = p.AmberDuration ?? 0;
      const green = p.GreenDuration ?? 0;

      this.patternForm.patchValue(
        { name: p.Name, red, amber, green },
        { emitEvent: false }
      );

      this.RedCount = red;
      this.YellowCount = amber;
      this.GreenCount = green;
      this.currentPatternID = p.ID;
    });
  }

  // =================== Load ===================
  private loadAll(): void {
    this.patternService.getPatterns().subscribe((pats) => {
      this.patterns = [
        {
          ID: 0,
          Name: '- New Pattern -',
          RedDuration: 30,
          AmberDuration: 10,
          GreenDuration: 30,
        },
        ...pats,
      ];
    });

    this.templateService.getTemplates().subscribe((temps) => {
      this.templates = [{ ID: 0, Name: '- New Template -' }, ...temps];
    });

    this.templateService.getTemplatePatterns().subscribe((rows) => {
      this.templatePatterns = rows;
    });
  }

  // =================== Template Editor ===================
  private updateTemplateForm(id: number): void {
    this.selectedTemplateId = +id || 0;
    const t = this.templates.find((x) => x.ID === this.selectedTemplateId);
    if (!t) {
      this.resetTemplateForm();
      return;
    }

    this.templateForm.patchValue({ name: t.Name }, { emitEvent: false });

    this.templateService
      .getTemplatePatternsByTemplateId(this.selectedTemplateId)
      .subscribe((rows) => {
        const groups = rows.map((r) =>
          this.fb.group({
            ID: [r.ID],
            TemplateID: [r.TemplateID],
            PatternID: [r.PatternID, Validators.required],
            Name: [
              r.Name ||
                this.patterns.find((p) => p.ID === r.PatternID)?.Name ||
                '',
            ],
            StartFrom: [this.toHhMm(r.StartFrom), Validators.required],
            FinishBy: [this.toHhMm(r.FinishBy), Validators.required],
          })
        );
        this.templateForm.setControl('patterns', this.fb.array(groups));
      });
  }

  addPatternToTemplate(): void {
    const v = this.patternForm.value;
    const selectedPattern = this.patterns.find((p) => p.ID === v.patternList);
    const templateID = this.templateForm.value.templateList;

    if (!selectedPattern || !templateID || selectedPattern.ID === 0) {
      console.warn('Please select a valid pattern and template');
      return;
    }

    this.patternsArray.push(
      this.fb.group({
        PatternID: [selectedPattern.ID, Validators.required],
        Name: [selectedPattern.Name],
        StartFrom: ['00:00:00'],
        FinishBy: ['23:59:00'],
      })
    );
  }

  removePatternFromTemplate(i: number): void {
    this.patternsArray.removeAt(i);
  }

  saveTemplate(): void {
    const v = this.templateForm.value;
    const template: Template = { ID: v.templateList, Name: v.name };

    const rows: TemplatePattern[] = this.patternsArray.value.filter(
      (p: TemplatePattern) => p.PatternID && p.PatternID > 0
    );

    this.templateService.saveTemplate(template, rows).subscribe({
      next: () => {
        alert('Template saved successfully!');
        this.loadTemplates();
      },
      error: (err) => {
        console.error('Save template failed:', err);
        alert('Failed to save template!');
      },
    });
  }
  loadTemplates(): void {
    this.templateService.getTemplates().subscribe({
      next: (data) => {
        this.templates = data;
        if (this.templates.length > 0) {
          this.templateForm.get('templateList')?.setValue(this.templates[0].ID);
        }
      },
      error: (err) => {
        console.error('Failed to load templates:', err);
      },
    });
  }

  private resetTemplateForm(): void {
    this.templateForm.reset({ templateList: 0, name: '' });
    this.patternsArray.clear();
  }

  // =================== Delete Template ===================
  deleteTemplate(): void {
    const template: Template = { ID: this.selectedTemplateId * -1, Name: '' };
    this.templateService
      .saveTemplate(template, [])
      .subscribe(() => this.loadAll());
  }

  // =================== Utils ===================
  private toHhMm(t: string): string {
    if (!t) return '00:00';
    const [h, m] = t.split(':');
    return `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`;
  }

  private ensureHhMmSs(t: string): string {
    if (!t) return '00:00:00';
    const parts = t.split(':');
    if (parts.length === 2)
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    return `${parts[0].padStart(2, '0')}:${(parts[1] ?? '00').padStart(
      2,
      '0'
    )}:${(parts[2] ?? '00').padStart(2, '0')}`;
  }

  play(): void {
    if (!this.run) return;

    if (this.GreenCount > 0) {
      this.GreenCount--;
      return;
    }
    if (this.YellowCount > 0) {
      this.YellowCount--;
      return;
    }
    if (this.RedCount > 0) {
      this.RedCount--;
      return;
    }
  }
  // =================== Pattern Editor ===================
  private updatePatternForm(id: number): void {
    this.selectedPatternId = +id || 0;
    const p = this.patterns.find((x) => x.ID === this.selectedPatternId);

    if (p) {
      this.patternForm.patchValue(
        {
          name: p.Name,
          red: p.RedDuration ?? 30,
          amber: p.AmberDuration ?? 10,
          green: p.GreenDuration ?? 30,
        },
        { emitEvent: false }
      );
    } else {
      this.resetPatternForm();
    }
  }

  savePattern() {
    const p = this.patternForm.value;
    this.patternService.savePattern(p).subscribe({
      next: () => {
        alert('Pattern saved successfully!');
        this.loadPatterns();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to save pattern!');
      },
    });
  }

  private loadPatterns(): void {
    this.patternService.getPatterns().subscribe({
      next: (res) => {
        this.patterns = [
          {
            ID: 0,
            Name: '- New Pattern -',
            RedDuration: 30,
            AmberDuration: 10,
            GreenDuration: 30,
          },
          ...res,
        ];
      },
      error: (err) => console.error('Error loading patterns:', err),
    });
  }

  private resetPatternForm(): void {
    this.patternForm.reset({
      patternList: 0,
      name: '',
      red: 30,
      amber: 10,
      green: 30,
      blink: false,
    });
  }
  deletePattern() {
    const id = this.patternForm.value.patternList;
    if (!id) return;

    this.patternService.deletePattern(id).subscribe({
      next: (res) => {
        console.log('Pattern deleted', res);
        this.loadPatterns();
        this.patternForm.reset();
      },
      error: (err) => console.error(err),
    });
  }
}
