import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface TabItem {
    id: string | number;
    label: string;
    count?: number;
    disabled?: boolean;
}

@Component({
    selector: 'mtr-tabs',
    templateUrl: './tabs.component.html',
    styleUrls: ['./tabs.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
    @Input() tabs: TabItem[] = [];
    @Input() activeTabId: string | number | null = null;
    @Output() tabChange = new EventEmitter<string | number>();

    onTabClick(tab: TabItem): void {
        if (!tab.disabled) {
            this.tabChange.emit(tab.id);
        }
    }
}
