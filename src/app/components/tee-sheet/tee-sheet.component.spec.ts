import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeeSheetComponent } from './tee-sheet.component';

describe('TeeSheetComponent', () => {
  let component: TeeSheetComponent;
  let fixture: ComponentFixture<TeeSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeeSheetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeeSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
