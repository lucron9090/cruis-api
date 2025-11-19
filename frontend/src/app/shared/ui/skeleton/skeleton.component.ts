import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'mtr-skeleton',
    template: `
    <div 
      class="skeleton" 
      [style.width]="width" 
      [style.height]="height" 
      [style.border-radius]="borderRadius"
      [class.circle]="shape === 'circle'"
      [class.rect]="shape === 'rect'">
    </div>
  `,
    styles: [`
    .skeleton {
      background-color: var(--neutral-200);
      animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .circle {
      border-radius: 50%;
    }

    .rect {
      border-radius: var(--radius-md);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .5; }
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
    @Input() width = '100%';
    @Input() height = '1rem';
    @Input() shape: 'text' | 'circle' | 'rect' = 'text';
    @Input() borderRadius = '4px';
}
