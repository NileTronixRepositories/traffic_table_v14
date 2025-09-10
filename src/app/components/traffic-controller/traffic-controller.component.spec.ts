import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrafficControllerComponent } from './traffic-controller.component';

describe('TrafficControllerComponent', () => {
  let component: TrafficControllerComponent;
  let fixture: ComponentFixture<TrafficControllerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TrafficControllerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrafficControllerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
