import { Directive, ElementRef, HostListener, Input, Renderer2, OnDestroy } from '@angular/core';

@Directive({
    selector: '[mtrTooltip]'
})
export class TooltipDirective implements OnDestroy {
    @Input('mtrTooltip') tooltipText = '';
    @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

    private tooltipElement: HTMLElement | null = null;
    private showTimeout: any;

    constructor(private el: ElementRef, private renderer: Renderer2) { }

    @HostListener('mouseenter') onMouseEnter() {
        if (!this.tooltipText) return;
        this.showTimeout = setTimeout(() => {
            this.showTooltip();
        }, 200);
    }

    @HostListener('mouseleave') onMouseLeave() {
        this.hideTooltip();
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
    }

    private showTooltip() {
        if (this.tooltipElement) return;

        this.tooltipElement = this.renderer.createElement('div');
        this.renderer.addClass(this.tooltipElement, 'mtr-tooltip');
        this.renderer.addClass(this.tooltipElement, `mtr-tooltip-${this.tooltipPosition}`);
        const text = this.renderer.createText(this.tooltipText);
        this.renderer.appendChild(this.tooltipElement, text);

        this.renderer.appendChild(document.body, this.tooltipElement);

        const hostPos = this.el.nativeElement.getBoundingClientRect();
        const tooltipPos = this.tooltipElement!.getBoundingClientRect();

        let top, left;

        switch (this.tooltipPosition) {
            case 'top':
                top = hostPos.top - tooltipPos.height - 8;
                left = hostPos.left + (hostPos.width - tooltipPos.width) / 2;
                break;
            case 'bottom':
                top = hostPos.bottom + 8;
                left = hostPos.left + (hostPos.width - tooltipPos.width) / 2;
                break;
            case 'left':
                top = hostPos.top + (hostPos.height - tooltipPos.height) / 2;
                left = hostPos.left - tooltipPos.width - 8;
                break;
            case 'right':
                top = hostPos.top + (hostPos.height - tooltipPos.height) / 2;
                left = hostPos.right + 8;
                break;
        }

        this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
        this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
        this.renderer.addClass(this.tooltipElement, 'show');
    }

    private hideTooltip() {
        if (this.tooltipElement) {
            this.renderer.removeChild(document.body, this.tooltipElement);
            this.tooltipElement = null;
        }
    }

    ngOnDestroy() {
        this.hideTooltip();
    }
}
