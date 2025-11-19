import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
    label: string;
    value: any;
}

@Component({
    selector: 'mtr-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectComponent),
            multi: true,
        },
    ],
})
export class SelectComponent implements ControlValueAccessor {
    @Input() label?: string;
    @Input() options: SelectOption[] = [];
    @Input() placeholder = 'Select an option';
    @Input() disabled = false;
    @Input() error?: string;
    @Input() id = `select-${Math.random().toString(36).substr(2, 9)}`;

    @Output() selectionChange = new EventEmitter<any>();

    value: any = null;
    onChange: any = () => { };
    onTouch: any = () => { };

    writeValue(value: any): void {
        this.value = value;
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouch = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onSelectChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        // Convert back to original type if possible (simple implementation)
        // For complex objects, we'd need a better approach (e.g., index based)
        this.value = value;
        this.onChange(value);
        this.selectionChange.emit(value);
    }
}
