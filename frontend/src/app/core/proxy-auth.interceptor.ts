import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Routes all Motor API requests through authenticated proxy
 * 
 * Flow: Motor API <- Authenticated Proxy <- Frontend
 * 
 * - Proxy authenticates automatically with card 1001600244772
 * - Single session shared by all users
 * - No frontend authentication needed
 * - No credentials exposed to client
 */
@Injectable()
export class ProxyAuthInterceptor implements HttpInterceptor {
  // Use direct Firebase function URL for production, or full URL for external proxy
  private readonly PROXY_URL = environment.production ? 'https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy' : `${environment.proxyUrl}/api/motor-proxy`;
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip ONLY local assets and files - NOT API endpoints
    if (req.url.startsWith('http') ||
        req.url.startsWith('assets/') ||
        req.url.startsWith('./assets/') ||
        (req.url.endsWith('.js') && !req.url.startsWith('api/')) ||
        (req.url.endsWith('.css') && !req.url.startsWith('api/')) ||
        (req.url.endsWith('.woff') && !req.url.startsWith('api/')) ||
        (req.url.endsWith('.woff2') && !req.url.startsWith('api/')) ||
        req.url.includes('favicon') ||
        req.url.startsWith('./')) {
      return next.handle(req);
    }

    // Route Motor API calls through authenticated proxy
    // Ensure exactly one slash between the proxy root and the relative path
    const relativePath = req.url.replace(/^\//, '');
    const proxiedReq = req.clone({
      url: `${this.PROXY_URL}/${relativePath}`
    });

    return next.handle(proxiedReq);
  }
}

