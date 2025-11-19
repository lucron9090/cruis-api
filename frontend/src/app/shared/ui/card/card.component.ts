import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'mtr-card',
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
    @Input() title?: string;
    @Input() subtitle?: string;
    @Input() padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
}
