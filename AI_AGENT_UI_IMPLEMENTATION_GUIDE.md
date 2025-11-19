# AI Agent Instructions: Implementing YourCar API into a User Interface

## Overview

This guide provides step-by-step instructions for an AI agent to implement the YourCar API into a user interface. The API provides vehicle information, articles, parts, labor operations, and maintenance schedules through a proxy service.

## Prerequisites

- Understanding of REST APIs and HTTP requests
- Knowledge of frontend frameworks (React, Vue, Angular, or vanilla JavaScript)
- Familiarity with async/await or Promises
- Basic understanding of state management

## API Overview

**Base URL:** `https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy`

**Key Characteristics:**
- No authentication required (handled server-side)
- All endpoints return JSON except:
  - Article content: HTML (text/html)
  - Graphics: Binary image data
  - XML: application/xml
- CORS enabled for web applications
- Standard HTTP status codes

## Implementation Strategy

### Phase 1: Core Infrastructure

#### Step 1: Create API Client Module

Create a centralized API client module that handles all HTTP requests. This provides:
- Consistent error handling
- Request/response logging
- Base URL management
- Type safety (if using TypeScript)

**Implementation Pattern:**

```javascript
// api-client.js
const BASE_URL = 'https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      if (endpoint.includes('/graphic/')) {
        return await response.blob();
      }
      
      if (endpoint.includes('/article/') && !endpoint.includes('/title')) {
        return await response.text();
      }
      
      if (endpoint.includes('/xml/')) {
        return await response.text();
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Vehicle endpoints
  async getYears() {
    const data = await this.request('/api/years');
    return data.data || data;
  }

  async getMakes(year) {
    const data = await this.request(`/api/year/${year}/makes`);
    return data.data || data;
  }

  async getModels(year, make) {
    const data = await this.request(`/api/year/${year}/make/${make}/models`);
    return data.data || data;
  }

  async getVehicles(contentSource, vehicleIds) {
    return await this.request(`/api/source/${contentSource}/vehicles`, {
      method: 'POST',
      body: JSON.stringify({ vehicleIds }),
    });
  }

  // Search endpoints
  async searchArticles(contentSource, vehicleId, searchTerm = '', motorVehicleId = '') {
    const params = new URLSearchParams();
    if (searchTerm) params.append('searchTerm', searchTerm);
    if (motorVehicleId) params.append('motorVehicleId', motorVehicleId);
    
    const query = params.toString();
    const endpoint = `/api/source/${contentSource}/vehicle/${vehicleId}/articles/v2${query ? `?${query}` : ''}`;
    
    return await this.request(endpoint);
  }

  // Article endpoints
  async getArticle(contentSource, vehicleId, articleId) {
    return await this.request(`/api/source/${contentSource}/vehicle/${vehicleId}/article/${articleId}`);
  }

  async getArticleTitle(contentSource, vehicleId, articleId) {
    const data = await this.request(`/api/source/${contentSource}/vehicle/${vehicleId}/article/${articleId}/title`);
    return data.data || data;
  }

  async getGraphic(contentSource, graphicId) {
    return await this.request(`/api/source/${contentSource}/graphic/${graphicId}`);
  }

  // Parts endpoints
  async getParts(contentSource, vehicleId, motorVehicleId = '') {
    const params = motorVehicleId ? `?motorVehicleId=${motorVehicleId}` : '';
    return await this.request(`/api/source/${contentSource}/vehicle/${vehicleId}/parts${params}`);
  }

  // Labor endpoints
  async getLabor(contentSource, vehicleId, articleId) {
    return await this.request(`/api/source/${contentSource}/vehicle/${vehicleId}/labor/${articleId}`);
  }

  // Maintenance endpoints
  async getMaintenanceSchedulesByFrequency(contentSource, vehicleId) {
    return await this.request(`/api/source/${contentSource}/vehicle/${vehicleId}/maintenanceSchedules/frequency`);
  }

  async getMaintenanceSchedulesByInterval(contentSource, vehicleId) {
    return await this.request(`/api/source/${contentSource}/vehicle/${vehicleId}/maintenanceSchedules/intervals`);
  }

  // Health check
  async getHealth() {
    return await this.request('/health', { baseUrl: 'https://motorproxy-erohrfg7qa-uc.a.run.app' });
  }
}

export default new ApiClient();
```

#### Step 2: Implement State Management

Choose a state management approach based on your framework:

**For React (with hooks):**
```javascript
// hooks/useVehicleData.js
import { useState, useEffect } from 'react';
import apiClient from '../api-client';

export function useVehicleData() {
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getYears();
      setYears(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMakes = async (year) => {
    if (!year) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getMakes(year);
      setMakes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async (year, make) => {
    if (!year || !make) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getModels(year, make);
      setModels(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    years,
    makes,
    models,
    loading,
    error,
    loadYears,
    loadMakes,
    loadModels,
  };
}
```

**For Vue (Composition API):**
```javascript
// composables/useVehicleData.js
import { ref } from 'vue';
import apiClient from '../api-client';

export function useVehicleData() {
  const years = ref([]);
  const makes = ref([]);
  const models = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const loadYears = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await apiClient.getYears();
      years.value = data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  // Similar for loadMakes and loadModels...

  return {
    years,
    makes,
    models,
    loading,
    error,
    loadYears,
    loadMakes,
    loadModels,
  };
}
```

### Phase 2: Vehicle Selection UI

#### Step 3: Build Year/Make/Model Selector

Create a cascading dropdown component that follows this flow:
1. User selects Year → Load Makes
2. User selects Make → Load Models
3. User selects Model → Load Vehicle Details

**React Component Example:**

```jsx
// components/VehicleSelector.jsx
import React, { useState, useEffect } from 'react';
import { useVehicleData } from '../hooks/useVehicleData';

export function VehicleSelector({ onVehicleSelected }) {
  const { years, makes, models, loading, loadYears, loadMakes, loadModels } = useVehicleData();
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    loadYears();
  }, []);

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMake('');
    setSelectedModel('');
    if (year) loadMakes(year);
  };

  const handleMakeChange = (make) => {
    setSelectedMake(make);
    setSelectedModel('');
    if (make && selectedYear) loadModels(selectedYear, make);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    if (model && onVehicleSelected) {
      onVehicleSelected({
        year: selectedYear,
        make: selectedMake,
        model: model,
      });
    }
  };

  return (
    <div className="vehicle-selector">
      <select 
        value={selectedYear} 
        onChange={(e) => handleYearChange(e.target.value)}
        disabled={loading}
      >
        <option value="">Select Year</option>
        {years.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>

      <select 
        value={selectedMake} 
        onChange={(e) => handleMakeChange(e.target.value)}
        disabled={!selectedYear || loading}
      >
        <option value="">Select Make</option>
        {makes.map(make => (
          <option key={make} value={make}>{make}</option>
        ))}
      </select>

      <select 
        value={selectedModel} 
        onChange={(e) => handleModelChange(e.target.value)}
        disabled={!selectedMake || loading}
      >
        <option value="">Select Model</option>
        {models.map((model, index) => (
          <option key={index} value={model.model}>{model.model}</option>
        ))}
      </select>

      {loading && <div className="loading">Loading...</div>}
    </div>
  );
}
```

**Key Implementation Notes:**
- Reset dependent dropdowns when parent selection changes
- Disable dependent dropdowns until parent is selected
- Show loading state during API calls
- Handle errors gracefully

### Phase 3: Search and Article Display

#### Step 4: Implement Search Interface

Create a search component that:
- Accepts a search term
- Calls the search API
- Displays results with filter tabs
- Handles pagination if needed

```jsx
// components/SearchInterface.jsx
import React, { useState } from 'react';
import apiClient from '../api-client';

export function SearchInterface({ contentSource, vehicleId, motorVehicleId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!vehicleId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.searchArticles(
        contentSource || 'Motor',
        vehicleId,
        searchTerm,
        motorVehicleId
      );
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-interface">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search articles..."
        />
        <button type="submit" disabled={loading || !vehicleId}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results && (
        <div className="search-results">
          {/* Filter Tabs */}
          {results.filterTabs && (
            <div className="filter-tabs">
              {results.filterTabs.map(tab => (
                <button key={tab.id} className="filter-tab">
                  {tab.name} ({tab.count})
                </button>
              ))}
            </div>
          )}

          {/* Article List */}
          <div className="article-list">
            {results.articleDetails?.map(article => (
              <div key={article.id} className="article-item">
                <h3>{article.title}</h3>
                {article.description && <p>{article.description}</p>}
                <button onClick={() => loadArticle(article.id)}>
                  View Article
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Step 5: Create Article Viewer

Build a component to display article content:

```jsx
// components/ArticleViewer.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api-client';

export function ArticleViewer({ contentSource, vehicleId, articleId }) {
  const [articleContent, setArticleContent] = useState(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!articleId) return;

    const loadArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load title and content in parallel
        const [titleData, content] = await Promise.all([
          apiClient.getArticleTitle(contentSource, vehicleId, articleId),
          apiClient.getArticle(contentSource, vehicleId, articleId),
        ]);

        setArticleTitle(titleData);
        setArticleContent(content);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [contentSource, vehicleId, articleId]);

  if (loading) return <div className="loading">Loading article...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!articleContent) return null;

  return (
    <div className="article-viewer">
      <h1>{articleTitle}</h1>
      <div 
        className="article-content"
        dangerouslySetInnerHTML={{ __html: articleContent }}
      />
    </div>
  );
}
```

**Important:** When rendering HTML content:
- Sanitize HTML to prevent XSS attacks (use DOMPurify or similar)
- Handle embedded images (they may need to be proxied)
- Style the content appropriately

#### Step 6: Handle Graphics/Images

Create a component to display graphics:

```jsx
// components/GraphicViewer.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api-client';

export function GraphicViewer({ contentSource, graphicId }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!graphicId) return;

    const loadGraphic = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await apiClient.getGraphic(contentSource, graphicId);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGraphic();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [contentSource, graphicId]);

  if (loading) return <div className="loading">Loading image...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!imageUrl) return null;

  return (
    <div className="graphic-viewer">
      <img src={imageUrl} alt="Vehicle diagram" />
    </div>
  );
}
```

### Phase 4: Additional Features

#### Step 7: Implement Parts List

```jsx
// components/PartsList.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api-client';

export function PartsList({ contentSource, vehicleId, motorVehicleId }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vehicleId) return;

    const loadParts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getParts(contentSource, vehicleId, motorVehicleId);
        setParts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadParts();
  }, [contentSource, vehicleId, motorVehicleId]);

  if (loading) return <div className="loading">Loading parts...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="parts-list">
      <h2>Parts</h2>
      <table>
        <thead>
          <tr>
            <th>Part Number</th>
            <th>Description</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part, index) => (
            <tr key={part.id || index}>
              <td>{part.partNumber}</td>
              <td>{part.description}</td>
              <td>{part.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Step 8: Implement Maintenance Schedules

```jsx
// components/MaintenanceSchedules.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api-client';

export function MaintenanceSchedules({ contentSource, vehicleId }) {
  const [schedules, setSchedules] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('frequency'); // 'frequency' | 'interval' | 'indicators'

  useEffect(() => {
    if (!vehicleId) return;

    const loadSchedules = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (viewMode === 'frequency') {
          data = await apiClient.getMaintenanceSchedulesByFrequency(contentSource, vehicleId);
        } else if (viewMode === 'interval') {
          data = await apiClient.getMaintenanceSchedulesByInterval(contentSource, vehicleId);
        } else {
          data = await apiClient.getMaintenanceSchedulesByIndicators(contentSource, vehicleId);
        }
        setSchedules(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [contentSource, vehicleId, viewMode]);

  return (
    <div className="maintenance-schedules">
      <div className="view-mode-selector">
        <button 
          onClick={() => setViewMode('frequency')}
          className={viewMode === 'frequency' ? 'active' : ''}
        >
          By Frequency
        </button>
        <button 
          onClick={() => setViewMode('interval')}
          className={viewMode === 'interval' ? 'active' : ''}
        >
          By Interval
        </button>
        <button 
          onClick={() => setViewMode('indicators')}
          className={viewMode === 'indicators' ? 'active' : ''}
        >
          By Indicators
        </button>
      </div>

      {loading && <div className="loading">Loading schedules...</div>}
      {error && <div className="error">Error: {error}</div>}
      {schedules && (
        <div className="schedules-content">
          {/* Render schedules based on viewMode */}
          <pre>{JSON.stringify(schedules, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

#### Step 9: Implement Labor Operations

```jsx
// components/LaborOperations.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api-client';

export function LaborOperations({ contentSource, vehicleId, articleId }) {
  const [labor, setLabor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!articleId) return;

    const loadLabor = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getLabor(contentSource, vehicleId, articleId);
        setLabor(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLabor();
  }, [contentSource, vehicleId, articleId]);

  if (loading) return <div className="loading">Loading labor information...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!labor?.mainOperation) return null;

  return (
    <div className="labor-operations">
      <h2>Labor Information</h2>
      <div className="labor-details">
        <p><strong>Operation:</strong> {labor.mainOperation.description}</p>
        <p><strong>Labor Time:</strong> {labor.mainOperation.laborTime} hours</p>
      </div>
    </div>
  );
}
```

### Phase 5: Error Handling and UX

#### Step 10: Implement Comprehensive Error Handling

```javascript
// utils/errorHandler.js
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function handleApiError(error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication failed. Please try again.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An error occurred.';
    }
  }
  
  if (error.message.includes('fetch')) {
    return 'Network error. Please check your connection.';
  }
  
  return error.message || 'An unexpected error occurred.';
}
```

#### Step 11: Add Loading States and Skeletons

```jsx
// components/LoadingSkeleton.jsx
export function LoadingSkeleton({ type = 'text', lines = 3 }) {
  if (type === 'text') {
    return (
      <div className="skeleton-text">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton-line" />
        ))}
      </div>
    );
  }
  
  if (type === 'image') {
    return <div className="skeleton-image" />;
  }
  
  return <div className="skeleton" />;
}
```

#### Step 12: Implement Retry Logic

```javascript
// utils/retry.js
export async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// Usage
const data = await retry(() => apiClient.getYears());
```

### Phase 6: Performance Optimization

#### Step 13: Implement Caching

```javascript
// utils/cache.js
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

export function setCached(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Usage in API client
async getYears() {
  const cacheKey = 'years';
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await this.request('/api/years');
  setCached(cacheKey, data);
  return data;
}
```

#### Step 14: Implement Request Debouncing

```javascript
// utils/debounce.js
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage for search
const debouncedSearch = debounce((searchTerm) => {
  performSearch(searchTerm);
}, 300);
```

### Phase 7: Complete UI Integration

#### Step 15: Create Main Application Component

```jsx
// App.jsx
import React, { useState } from 'react';
import { VehicleSelector } from './components/VehicleSelector';
import { SearchInterface } from './components/SearchInterface';
import { ArticleViewer } from './components/ArticleViewer';
import { PartsList } from './components/PartsList';
import { MaintenanceSchedules } from './components/MaintenanceSchedules';

export default function App() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [contentSource] = useState('Motor');

  return (
    <div className="app">
      <header>
        <h1>YourCar Vehicle Information</h1>
      </header>

      <main>
        <section className="vehicle-selection">
          <h2>Select Vehicle</h2>
          <VehicleSelector 
            onVehicleSelected={setSelectedVehicle}
          />
        </section>

        {selectedVehicle && (
          <>
            <section className="search">
              <SearchInterface
                contentSource={contentSource}
                vehicleId={selectedVehicle.id}
                motorVehicleId={selectedVehicle.motorVehicleId}
                onArticleSelected={setSelectedArticle}
              />
            </section>

            <section className="content">
              {selectedArticle && (
                <ArticleViewer
                  contentSource={contentSource}
                  vehicleId={selectedVehicle.id}
                  articleId={selectedArticle.id}
                />
              )}

              <PartsList
                contentSource={contentSource}
                vehicleId={selectedVehicle.id}
                motorVehicleId={selectedVehicle.motorVehicleId}
              />

              <MaintenanceSchedules
                contentSource={contentSource}
                vehicleId={selectedVehicle.id}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
```

## Implementation Checklist

Use this checklist to ensure complete implementation:

### Core Infrastructure
- [ ] Create API client module
- [ ] Implement error handling
- [ ] Set up state management
- [ ] Add loading states
- [ ] Implement error boundaries

### Vehicle Selection
- [ ] Year selector dropdown
- [ ] Make selector dropdown (depends on year)
- [ ] Model selector dropdown (depends on make)
- [ ] Vehicle details display
- [ ] Motor vehicle selection (if applicable)

### Search & Articles
- [ ] Search input field
- [ ] Search results display
- [ ] Filter tabs implementation
- [ ] Article list/grid view
- [ ] Article content viewer
- [ ] HTML content sanitization
- [ ] Image/graphic handling

### Additional Features
- [ ] Parts list display
- [ ] Labor operations display
- [ ] Maintenance schedules (all three views)
- [ ] Bookmark functionality
- [ ] Track change reports

### UX Enhancements
- [ ] Loading skeletons
- [ ] Error messages
- [ ] Empty states
- [ ] Responsive design
- [ ] Accessibility (ARIA labels, keyboard navigation)

### Performance
- [ ] Request caching
- [ ] Debounced search
- [ ] Lazy loading
- [ ] Image optimization

## Common Patterns and Best Practices

### 1. Data Flow Pattern
```
User Action → State Update → API Call → Response Handling → UI Update
```

### 2. Error Handling Pattern
```javascript
try {
  const data = await apiCall();
  // Handle success
} catch (error) {
  // Log error
  console.error(error);
  // Show user-friendly message
  showError(handleApiError(error));
  // Optionally retry
  if (shouldRetry(error)) {
    retry(apiCall);
  }
}
```

### 3. Loading State Pattern
```javascript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await apiCall();
    setData(result);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};
```

### 4. Conditional Rendering Pattern
```jsx
{loading && <LoadingSpinner />}
{error && <ErrorMessage error={error} />}
{data && <DataDisplay data={data} />}
{!loading && !error && !data && <EmptyState />}
```

## Testing Recommendations

1. **Unit Tests**: Test API client methods
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user flows
4. **Error Scenarios**: Test error handling
5. **Loading States**: Test loading behavior
6. **Edge Cases**: Test empty data, invalid inputs

## Security Considerations

1. **HTML Sanitization**: Always sanitize HTML content from articles
2. **XSS Prevention**: Use DOMPurify or similar
3. **CORS**: Already handled by API
4. **Input Validation**: Validate user inputs before API calls
5. **Error Messages**: Don't expose sensitive information in errors

## Accessibility Requirements

1. **ARIA Labels**: Add appropriate ARIA labels
2. **Keyboard Navigation**: Ensure all interactions work with keyboard
3. **Screen Readers**: Test with screen readers
4. **Focus Management**: Manage focus appropriately
5. **Color Contrast**: Ensure sufficient contrast ratios

## Deployment Considerations

1. **Environment Variables**: Use env vars for API base URL
2. **Build Optimization**: Optimize bundle size
3. **CDN**: Serve static assets from CDN
4. **Monitoring**: Add error tracking (Sentry, etc.)
5. **Analytics**: Track user interactions

## Troubleshooting Guide

### Issue: CORS Errors
**Solution**: API already handles CORS. Check if you're using the correct base URL.

### Issue: 401 Unauthorized
**Solution**: This shouldn't happen with automatic auth. Check health endpoint to verify server authentication.

### Issue: Images Not Loading
**Solution**: Ensure you're handling blob responses correctly and creating object URLs.

### Issue: HTML Content Not Rendering
**Solution**: Check if HTML sanitization is blocking content. Adjust sanitization rules if needed.

### Issue: Slow Performance
**Solution**: Implement caching, debouncing, and lazy loading.

## Additional Resources

- **API Documentation**: See `API_DOCUMENTATION.md`
- **OpenAPI Schema**: See `API_SCHEMA.yaml`
- **Health Check**: `GET /health` to verify API status

## Final Notes

1. **Start Simple**: Begin with basic vehicle selection, then add features incrementally
2. **Test Early**: Test each component as you build it
3. **Handle Errors**: Always implement proper error handling
4. **User Feedback**: Provide clear loading and error states
5. **Performance**: Optimize for real-world usage patterns
6. **Accessibility**: Make the UI accessible from the start

Good luck with your implementation!

