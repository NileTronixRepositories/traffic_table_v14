import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointconfigComponent } from './pointconfig.component';

describe('PointconfigComponent', () => {
  let component: PointconfigComponent;
  let fixture: ComponentFixture<PointconfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PointconfigComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointconfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
