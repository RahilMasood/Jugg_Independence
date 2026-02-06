const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://juggernautuserauth-production.up.railway.app/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('auth_token', token); // Also set for compatibility
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      // Check both 'auth_token' and 'accessToken' for compatibility
      this.token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        // If unauthorized, clear token
        if (response.status === 401) {
          this.setToken(null);
        }
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Engagement API methods
export const engagementApi = {
  // Get engagements for independence tool (partner/manager only)
  getEngagementsForIndependenceTool: async () => {
    const response = await apiClient.get<Array<any>>('/engagements/for-independence-tool');
    return response.data || [];
  },

  // Get engagement by ID
  getEngagement: async (id: string) => {
    const response = await apiClient.get<any>(`/engagements/${id}`);
    return response.data;
  },

  // Get engagement by ID for independence tool (team members filtered by independence_tool=true)
  getEngagementForIndependenceTool: async (id: string) => {
    const response = await apiClient.get<any>(`/engagements/${id}/for-independence-tool`);
    return response.data;
  },

  // Get users with main access for an engagement
  getUsersWithMainAccess: async (engagementId: string) => {
    const response = await apiClient.get<{ users: Array<any> }>(`/engagements/${engagementId}/users/main-access`);
    return response.data?.users || [];
  },

  // Add user to independence tool
  addUserToIndependenceTool: async (engagementId: string, userId: string) => {
    const response = await apiClient.post(`/engagements/${engagementId}/users/${userId}/independence-tool`);
    return response.data;
  },

  // Add multiple users to independence tool (batch)
  addUsersToIndependenceTool: async (engagementId: string, userIds: string[]) => {
    const response = await apiClient.post(`/engagements/${engagementId}/users/independence-tool`, {
      user_ids: userIds
    });
    return response.data;
  },
};

// Independence API methods (Pending/Submitted tabs)
export const independenceApi = {
  getMyPendingEngagements: async () => {
    const response = await apiClient.get<{ engagements: Array<any> }>(`/independence/my-pending-engagements`);
    return response.data?.engagements || [];
  },
  getMySubmittedEngagements: async () => {
    const response = await apiClient.get<{ engagements: Array<any> }>(`/independence/my-submitted-engagements`);
    return response.data?.engagements || [];
  },
  getResponsesFile: async (engagementId: string) => {
    const response = await apiClient.get<{ json: any }>(`/independence/engagements/${engagementId}/responses-file`);
    return response.data?.json || {};
  },
  submitFromTool: async (engagementId: string, responses: any[]) => {
    const response = await apiClient.post(`/independence/engagements/${engagementId}/submit-from-tool`, {
      responses
    });
    return response.data;
  }
};

