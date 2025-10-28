export interface StrictHttpResponse<T> {
  body: T;
  headers: any;
  status: number;
  statusText: string;
  url: string;
}

