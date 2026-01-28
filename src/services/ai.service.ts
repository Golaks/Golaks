import { authService } from './auth.service';
import { BASE_API_URL } from '../constants/ApiConfig';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  message: string;
  language: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | { code?: string; message: string };
  code?: string;
}

class AIService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await authService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers as Record<string, string>),
      };

      const response = await fetch(`${BASE_API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || data.error || 'Bir hata oluştu',
          code: data.error?.code || data.code,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Bağlantı hatası',
        code: 'NETWORK_ERROR',
      };
    }
  }

  async sendChatMessage(
    message: string,
    conversationHistory: ChatMessage[]
  ): Promise<ApiResponse<AIChatResponse>> {
    return this.makeRequest<AIChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory,
        language: 'tr',
      }),
    });
  }
}

export const aiService = new AIService();
