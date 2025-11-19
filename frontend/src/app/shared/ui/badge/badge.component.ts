import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeSize = 'sm' | 'md';

@Component({
    selector: 'mtr-badge',
    templateUrl: './badge.component.html',
    styleUrls: ['./badge.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
    @Input() variant: BadgeVariant = 'primary';
    @Input() size: BadgeSize = 'md';
}
