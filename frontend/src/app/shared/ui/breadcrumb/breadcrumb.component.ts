import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface BreadcrumbItem {
    label: string;
    url?: string;
}

@Component({
    selector: 'mtr-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
    @Input() items: BreadcrumbItem[] = [];
}
