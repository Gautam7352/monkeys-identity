export interface MonkeysIAMConfig {
  baseUrl: string;
  token?: string;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  user_id: string;
}

export interface CheckPermissionResponse {
  allowed: boolean;
  reason?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string;
  organization_id: string;
}

export class MonkeysIAMClient {
  private config: MonkeysIAMConfig;

  constructor(config: MonkeysIAMConfig) {
    this.config = config;
  }

  public setToken(token: string) {
    this.config.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (this.config.token) {
      headers.set('Authorization', `Bearer ${this.config.token}`);
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    return json.data as T;
  }

  public async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    this.setToken(response.token);
    return response;
  }

  public async checkPermission(action: string, resource: string): Promise<CheckPermissionResponse> {
    return this.request<CheckPermissionResponse>('/authz/check', {
      method: 'POST',
      body: JSON.stringify({ action, resource })
    });
  }

  public async getUserProfile(userId: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${userId}/profile`, {
      method: 'GET'
    });
  }
}
