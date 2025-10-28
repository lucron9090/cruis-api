export interface LogEntry {
  message?: string;
  level?: string;
  timestamp?: string;
  body?: any;
  subject?: string;
  extendedProperties?: any[];
}

