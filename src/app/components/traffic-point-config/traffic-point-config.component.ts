import { Component, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TrafficPointConfigService, SetLocationRequest } from 'src/app/services/traffic-point-config.service';

interface NamedEntity { ID: number; Name: string; }
interface Pattern extends NamedEntity {
  Red?: number; Amber?: number; Green?: number;
  RedDuration?: number; AmberDuration?: number; GreenDuration?: number;
}

@Component({
  selector: 'app-traffic-point-config',
  templateUrl: './traffic-point-config.component.html',
  styleUrls: ['./traffic-point-config.component.css'],
})
export class TrafficPointConfigComponent implements OnInit {
  form!: FormGroup;

  governorates: NamedEntity[] = [];
  areas: NamedEntity[] = [];
  locations: any[] = [];
  templates: any[] = [];
  patterns: Pattern[] = [];
  templatePatterns: any[] = [];

  // للعرض فقط
  GreenCount = 0; RedCount = 0; YellowCount = 0;

  // selections خارجية/من Grid
  currentSignID = 0;
  currentTempID = 0;
  currentPatternID = 0;

  // runtime (اختياري)
  run = false; red = 0; yellow = 0; green = 0;

  constructor(private fb: FormBuilder, private svc: TrafficPointConfigService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      governorate: [null as NamedEntity | null], // ← object binding
      area: [null as NamedEntity | null],        // ← object binding
      name: [''],
      latitude: [0],
      longitude: [0],
      ipAddress: [''],

      template: [0],
      pattern: [null as Pattern | null],

      red: [30],
      yellow: [10],
      green: [30],

      blinkRed: [false],
      blinkYellow: [false],
      blinkGreen: [false],
      blinkMs: [500],

      toggleMain: [false],

      useTcp: [false],
      tcpPort: [502],
      deviceId: [null],
    });

    this.loadServerData();

    // ربط الديوراشنز بالـ pattern
    this.form.get('pattern')!.valueChanges.subscribe((p: Pattern | null) => {
      if (!p) {
        this.currentPatternID = 0;
        this.form.patchValue({ red: 0, yellow: 0, green: 0 }, { emitEvent: false });
        this.RedCount = this.YellowCount = this.GreenCount = 0;
        return;
      }
      const red   = p.RedDuration   ?? p.Red   ?? 0;
      const amber = p.AmberDuration ?? p.Amber ?? 0;
      const green = p.GreenDuration ?? p.Green ?? 0;

      this.form.patchValue({ red, yellow: amber, green }, { emitEvent: false });
      this.RedCount = red; this.YellowCount = amber; this.GreenCount = green;
      this.currentPatternID = p.ID;
    });

    // محاكي عدّ تنازلي (اختياري)
    interval(200).subscribe(() => { if (this.run) this.play(); });
  }

  loadServerData() {
    this.svc.getGovernorates().subscribe(g => (this.governorates = g));
    this.svc.getAreas().subscribe(a => (this.areas = a));
    this.svc.getLocations().subscribe(l => (this.locations = l));
    this.svc.getTemplates().subscribe(t => (this.templates = t));
    this.svc.getPatterns().subscribe(p => (this.patterns = p as Pattern[]));
    this.svc.getTemplatePatterns().subscribe(tp => (this.templatePatterns = tp));
  }

  runCommand() {
    const v = this.form.value;
    this.red = Number(v.red) || 0;
    this.yellow = Number(v.yellow) || 0;
    this.green = Number(v.green) || 0;
    this.run = true;
  }
  play() {
    if (!this.run) return;
    if (this.green > 0) { this.green--; return; }
    if (this.yellow > 0) { this.yellow--; return; }
    if (this.red > 0) { this.red--; return; }
    this.run = false;
  }

  applyChanges() {
    const v = this.form.value;

    const req: SetLocationRequest = {
      ID: this.currentSignID || null,

      AreaID: v.area?.ID ?? null,
      AreaName: v.area?.Name ?? '',

      GovernerateID: v.governorate?.ID ?? null,
      GovernerateName: v.governorate?.Name ?? '',

      Name: v.name ?? '',
      IPAddress: v.ipAddress ?? '',

      Latitude: Number(v.latitude) || 0,
      Longitude: Number(v.longitude) || 0,

      R: Number(v.red) || 0,
      A: Number(v.yellow) || 0,
      G: Number(v.green) || 0,

      BlinkRed: !!v.blinkRed,
      BlinkAmber: !!v.blinkYellow,
      BlinkGreen: !!v.blinkGreen,
      BlinkMs: v.blinkMs != null ? Number(v.blinkMs) : null,

      ChangeMain: !!v.toggleMain,

      TemplateID: Number(this.currentTempID) || 0,
      LightPatternID: Number(this.currentPatternID) || 0,

      UseTcp: !!v.useTcp,
      TcpPort: Number(v.tcpPort) || 502,
      DeviceId: v.deviceId != null ? Number(v.deviceId) : null,
    };

    console.log('POST Set payload:', req); // Debug مفيد

    this.svc.setLocation(req).subscribe({
      next: (res) => {
        if (res === 'Ok' || res === 'OK' || (res as any)?.status === 'Ok') {
          // success logic
        } else {
          console.log('Server response:', res);
        }
      },
      error: (err) => console.error('Error Set', err),
    });
  }
}
