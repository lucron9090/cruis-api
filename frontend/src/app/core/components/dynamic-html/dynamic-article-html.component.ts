import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnDestroy, Renderer2 } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'mtr-dynamic-article-html',
  templateUrl: './dynamic-article-html.component.html',
  styleUrls: ['./dynamic-article-html.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicArticleHtmlComponent implements AfterViewInit, OnDestroy {
  @Input() html$!: Observable<string | undefined>;
  @Input() error$!: Observable<any>;

  private destroy$ = new Subject<void>();

  constructor(
    private eleRef: ElementRef,
    private renderer: Renderer2,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    // Wait for HTML to render before configuring links
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.configureInternalLinks();
      }, 100);
    });

    // Re-configure links when HTML changes
    this.html$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.configureInternalLinks();
        }, 100);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private configureInternalLinks(): void {
    try {
      const internalLinks = (this.eleRef.nativeElement as HTMLElement).querySelectorAll('.internal-link');
      
      for (const internalLink of Array.from(internalLinks)) {
        const link = this.renderer.createElement('a') as HTMLAnchorElement;
        this.renderer.setProperty(link, 'href', '#');
        this.renderer.setAttribute(link, 'data-target-id', internalLink.id);
        this.renderer.setAttribute(link, 'title', internalLink.getAttribute('title') ?? '');
        this.renderer.setAttribute(link, 'class', 'internal-link-anchor');
        
        // Preserve inner HTML
        this.renderer.setProperty(link, 'innerHTML', internalLink.innerHTML);

        const parent = internalLink.parentElement;
        if (parent) {
          this.renderer.insertBefore(parent, link, internalLink);
          this.renderer.removeChild(parent, internalLink);
        }

        this.renderer.listen(link, 'click', (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          const targetId = (event.currentTarget as HTMLElement).dataset.targetId;
          if (targetId) {
            this.scrollTo(targetId);
          }
        });
      }
    } catch (error) {
      console.error('Error configuring internal links:', error);
    }
  }

  private scrollTo(idOrName: string): void {
    try {
      // Escape special characters in the ID
      const escapedId = CSS.escape(idOrName);
      
      // Check if we're in a modal context
      const modalDiv = document.getElementById('articleModalBody');
      const searchContext = modalDiv || document;
      
      // Try multiple selection strategies
      let element = searchContext.querySelector(`#${escapedId}`) as HTMLElement;
      
      if (!element) {
        element = searchContext.querySelector(`[name="${idOrName}"]`) as HTMLElement;
      }
      
      if (!element) {
        element = searchContext.querySelector(`[id="${idOrName}"]`) as HTMLElement;
      }
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        
        // Add visual feedback
        element.style.transition = 'background-color 0.5s ease';
        element.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 1500);
      } else {
        console.warn(`Element not found for scroll target: ${idOrName}`);
      }
    } catch (error) {
      console.error('Error scrolling to element:', idOrName, error);
    }
  }
}
