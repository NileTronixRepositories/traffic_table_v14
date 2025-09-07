import { Component, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TrafficPointConfigService } from 'src/app/services/traffic-point-config.service';
import { Pattern } from 'src/app/model/pattern';
@Component({
  selector: 'app-traffic-point-config',
  templateUrl: './traffic-point-config.component.html',
  styleUrls: ['./traffic-point-config.component.css'],
})
export class TrafficPointConfigComponent implements OnInit {
  form!: FormGroup;

  governorates: any[] = [];
  areas: any[] = [];
  locations: any[] = [];
  templates: any[] = [];
  patterns: any[] = [];
  templatePatterns: any[] = [];

  currentSignID = 0;
  currentTempID = 0;
  currentLightPatternID = 0;
  currentPatternID = 0;

  // runtime
  run = false;
  red = 0;
  yellow = 0;
  green = 0;
  currentColor = '';

  // blink
  isActive = true;
  lastOutputChangeTime = 0;
  lastOutputCheckTime = 0;
  blinkInterval = 500; // ms
  SECOND = 1000;

  // blink states
  blinkRedActive = true;
  blinkAmberActive = true;
  blinkGreenActive = true;

  constructor(
    private fb: FormBuilder,
    private trafficService: TrafficPointConfigService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      governorate: [null],
      area: [null],
      name: [''],
      latitude: [''],
      longitude: [''],
      ipAddress: [''],
      template: [0],
      pattern: [0],
      red: [30],
      yellow: [10],
      green: [30],
      blinkRed: [false],
      blinkYellow: [false],
      blinkGreen: [false],
      toggleMain: [false],
    });

    this.loadServerData();

    interval(200).subscribe(() => {
      if (this.run) this.play();
    });
  }

  loadServerData() {
    this.trafficService
      .getGovernorates()
      .subscribe((g) => (this.governorates = g));
    this.trafficService.getAreas().subscribe((a) => (this.areas = a));
    this.trafficService.getLocations().subscribe((l) => (this.locations = l));
    this.trafficService.getTemplates().subscribe((t) => (this.templates = t));
    this.trafficService.getPatterns().subscribe((p) => (this.patterns = p));
    console.log('Patterns:', this.patterns);
    this.trafficService
      .getTemplatePatterns()
      .subscribe((tp) => (this.templatePatterns = tp));
  }

  runCommand() {
    this.red = this.form.value.red;
    this.yellow = this.form.value.yellow;
    this.green = this.form.value.green;
    this.run = true;
    this.isActive = true;
    this.lastOutputChangeTime = Date.now();
    this.lastOutputCheckTime = Date.now();
  }

  play() {
    if (!this.run) return;

    const now = Date.now();

    if (this.green === 0 && this.yellow === 0 && this.red === 0) {
      // restart cycle
      this.red = this.form.value.red;
      this.yellow = this.form.value.yellow;
      this.green = this.form.value.green;
      this.isActive = true;
    }

    // handle blink toggle
    if (now - this.lastOutputCheckTime >= this.blinkInterval) {
      if (this.form.value.blinkRed) {
        this.blinkRedActive = !this.blinkRedActive;
      }
      if (this.form.value.blinkYellow) {
        this.blinkAmberActive = !this.blinkAmberActive;
      }
      if (this.form.value.blinkGreen) {
        this.blinkGreenActive = !this.blinkGreenActive;
      }
      this.lastOutputCheckTime = now;
    }

    // countdown
    if (this.green > 0) {
      this.currentColor = 'GREEN';
      if (now - this.lastOutputChangeTime >= this.SECOND) {
        this.green--;
        this.lastOutputChangeTime = now;
      }
    } else if (this.yellow > 0) {
      this.currentColor = 'YELLOW';
      if (now - this.lastOutputChangeTime >= this.SECOND) {
        this.yellow--;
        this.lastOutputChangeTime = now;
      }
    } else if (this.red > 0) {
      this.currentColor = 'RED';
      if (now - this.lastOutputChangeTime >= this.SECOND) {
        this.red--;
        this.lastOutputChangeTime = now;
      }
    }
  }

  applyChanges() {
    const formValue = this.form.value;

    const obj: any = {
      ID: this.currentSignID,
      GovernerateName:
        this.governorates.find((g) => g.ID === formValue.governorate)?.Name ||
        '',
      AreaName: this.areas.find((a) => a.ID === formValue.area)?.Name || '',
      AreaID: formValue.area,
      Name: formValue.name,
      Longitude: formValue.longitude,
      Latitude: formValue.latitude,
      IPAddress: formValue.ipAddress,
      TemplateID: this.currentTempID,
      LightPatternID: this.currentLightPatternID,
      R: formValue.red,
      A: formValue.yellow,
      G: formValue.green,
      BlinkRed: formValue.blinkRed,
      BlinkAmber: formValue.blinkYellow,
      BlinkGreen: formValue.blinkGreen,
      ChangeMain: formValue.toggleMain,
    };

    this.trafficService.updateLocation(obj).subscribe({
      next: (res: any) => {
        if (res === 'Ok') {
          this.loadServerData();
        }
      },
      error: (err: any) => console.error('Error updating location', err),
    });
  }

  // when template dropdown changes
  onPatternChange(patternID: number) {
    if (patternID == 0) {
      this.form.patchValue({ red: 0, yellow: 0, green: 0 });
      this.currentPatternID = 0;
      return;
    }
    console.log('Selected Pattern ID:', patternID);
    const selectedPattern = this.patterns.find((p) => p.ID === patternID);
    if (!selectedPattern) return;

    this.form.patchValue({
      red: selectedPattern.RedDuration,
      yellow: selectedPattern.AmberDuration,
      green: selectedPattern.GreenDuration,
    });

    this.currentPatternID = selectedPattern.ID;
  }
}
