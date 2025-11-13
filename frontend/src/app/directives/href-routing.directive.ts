import { Directive, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Directive({
  selector: '[mtrHrefRouting]',
})
export class HrefRoutingDirective {
  constructor(private router: Router) {}

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    // Find the closest anchor element
    let target = event.target as Element | null;
    let href = target?.getAttribute('href');
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    
    while (!href && target && attempts < maxAttempts) {
      // Traverse up the DOM tree to find an anchor with href
      target = this.isElement(target.parentNode) ? target.parentNode : null;
      href = target?.getAttribute('href');
      attempts++;
    }
    
    if (!href || !target) {
      return; // No href found, let default behavior proceed
    }
    
    // Handle special cases
    if (href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
      event.preventDefault();
      return;
    }
    
    // Check for external links
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      // Allow external links to proceed normally
      return;
    }
    
    // Prevent default for all internal navigation
    event.preventDefault();
    event.stopPropagation();
    
    const queryParamsAttribute = target.getAttribute('merge-query-params');
    
    if (queryParamsAttribute) {
      try {
        const queryParams = JSON.parse(queryParamsAttribute) as { [key: string]: string };
        this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
      } catch (error) {
        console.error('Failed to parse merge-query-params:', queryParamsAttribute, error);
        // Fallback to simple navigation
        this.router.navigateByUrl(href);
      }
    } else {
      // Simple internal navigation
      this.router.navigateByUrl(href).catch(err => {
        console.error('Navigation failed:', href, err);
      });
    }
  }

  private isElement(obj: any): obj is Element {
    return Boolean((obj as Element | null)?.getAttribute);
  }
}
