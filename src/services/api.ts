import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, AuthResponse, User, AuthRequest } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Ajouter l'intercepteur pour le JWT
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur de réponse pour gérer les erreurs
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        // Si 401 (non autorisé) et ce n'est pas déjà une tentative de refresh
        if (error.response?.status === 401 && !originalRequest?.headers?.['X-Retry']) {
          if (this.refreshToken) {
            try {
              const response = await this.refreshAccessToken();
              this.setTokens(response.accessToken, response.refreshToken);
              
              // Refaire la requête originale avec le nouveau token
              originalRequest!.headers['Authorization'] = `Bearer ${response.accessToken}`;
              originalRequest!.headers['X-Retry'] = 'true';
              return this.client(originalRequest!);
            } catch (refreshError) {
              // Refresh failed, logout
              this.logout();
              window.location.href = '/connexion';
              return Promise.reject(refreshError);
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  private async refreshAccessToken(): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>(
      '/auth/refresh',
      { refreshToken: this.refreshToken }
    );
    return response.data.data!;
  }

  // ========================================================================
  // AUTH ENDPOINTS
  // ========================================================================

  async registerPatient(data: any): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>(
      '/auth/register/patient',
      data
    );
    if (response.data.data) {
      this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    }
    return response.data.data!;
  }

  async registerDoctor(data: any): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>(
      '/auth/register/doctor',
      data
    );
    if (response.data.data) {
      this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    }
    return response.data.data!;
  }

  async login(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    if (response.data.data) {
      this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    }
    return response.data.data!;
  }

  async verify2FA(userId: number, code: string): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>(
      '/auth/2fa/verify',
      { userId, code }
    );
    if (response.data.data) {
      this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    }
    return response.data.data!;
  }

  async logout(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('user');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  }

  async forgotPassword(phone: string): Promise<{ message: string }> {
    const response = await this.client.post<ApiResponse<{ message: string }>>(
      '/auth/forgot-password',
      { phone }
    );
    return response.data.data!;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.client.post<ApiResponse<{ message: string }>>(
      '/auth/reset-password',
      { token, newPassword }
    );
    return response.data.data!;
  }

  // ========================================================================
  // PATIENT ENDPOINTS
  // ========================================================================

  async getPatientProfile(): Promise<any> {
    const response = await this.client.get('/patients/profile');
    return response.data.data;
  }

  async updatePatientProfile(data: any): Promise<any> {
    const response = await this.client.put('/patients/profile', data);
    return response.data.data;
  }

  async getPatientRecord(): Promise<any> {
    const response = await this.client.get('/patients/record');
    return response.data.data;
  }

  async generateQRCode(): Promise<{ qrCode: string; expiresIn: number }> {
    const response = await this.client.post('/patients/qr', {});
    return response.data.data;
  }

  async grantAccessToDoctor(doctorId: number, durationHours: number): Promise<any> {
    const response = await this.client.post('/patients/access/grant', {
      doctorId,
      durationHours,
    });
    return response.data.data;
  }

  async revokeAccessFromDoctor(doctorId: number): Promise<any> {
    const response = await this.client.post('/patients/access/revoke', { doctorId });
    return response.data.data;
  }

  async getNearbyHospitals(latitude: number, longitude: number, radius?: number): Promise<any[]> {
    const response = await this.client.get('/patients/hospitals/nearby', {
      params: { latitude, longitude, radius },
    });
    return response.data.data;
  }

  async rateHospital(hospitalId: number, rating: number, comment?: string): Promise<any> {
    const response = await this.client.post(`/patients/hospitals/${hospitalId}/rate`, {
      rating,
      comment,
    });
    return response.data.data;
  }

  async getPatientConsents(): Promise<any[]> {
    const response = await this.client.get('/patients/consents');
    return response.data.data;
  }

  // ========================================================================
  // DOCTOR ENDPOINTS
  // ========================================================================

  async getDoctorProfile(): Promise<any> {
    const response = await this.client.get('/doctors/profile');
    return response.data.data;
  }

  async updateDoctorProfile(data: any): Promise<any> {
    const response = await this.client.put('/doctors/profile', data);
    return response.data.data;
  }

  async getDoctorAppointments(date?: string): Promise<any[]> {
    const response = await this.client.get('/doctors/appointments', {
      params: { date },
    });
    return response.data.data;
  }

  async accessPatientRecord(patientQRCode: string): Promise<any> {
    const response = await this.client.post('/doctors/record/access', { patientQRCode });
    return response.data.data;
  }

  async createConsultation(data: any): Promise<any> {
    const response = await this.client.post('/doctors/consultation', data);
    return response.data.data;
  }

  async createPrescription(data: any): Promise<any> {
    const response = await this.client.post('/doctors/prescription', data);
    return response.data.data;
  }

  async queryAI(question: string, context?: string): Promise<{ response: string }> {
    const response = await this.client.post('/doctors/ai/query', { question, context });
    return response.data.data;
  }

  async getDoctorPatients(): Promise<any[]> {
    const response = await this.client.get('/doctors/patients');
    return response.data.data;
  }

  async getDoctorStats(): Promise<any> {
    const response = await this.client.get('/doctors/stats');
    return response.data.data;
  }

  // ========================================================================
  // HOSPITAL ENDPOINTS
  // ========================================================================

  async getHospitals(filters?: any): Promise<any[]> {
    const response = await this.client.get('/hospitals', { params: filters });
    return response.data.data;
  }

  async getHospital(id: number): Promise<any> {
    const response = await this.client.get(`/hospitals/${id}`);
    return response.data.data;
  }

  async createHospital(data: any): Promise<any> {
    const response = await this.client.post('/hospitals', data);
    return response.data.data;
  }

  async updateHospital(id: number, data: any): Promise<any> {
    const response = await this.client.put(`/hospitals/${id}`, data);
    return response.data.data;
  }

  async getNearbyHospitalsPublic(latitude: number, longitude: number, radius?: number): Promise<any[]> {
    const response = await this.client.get('/hospitals/nearby', {
      params: { latitude, longitude, radius },
    });
    return response.data.data;
  }

  async getHospitalStatistics(): Promise<any> {
    const response = await this.client.get('/hospitals/statistics');
    return response.data.data;
  }

  // ========================================================================
  // PAYMENT ENDPOINTS
  // ========================================================================

  async createInvoice(data: any): Promise<any> {
    const response = await this.client.post('/payments/invoice', data);
    return response.data.data;
  }

  async payInvoice(invoiceId: string, method: string): Promise<any> {
    const response = await this.client.post('/payments/pay', { invoiceId, method });
    return response.data.data;
  }

  async refundInvoice(invoiceId: string, reason?: string): Promise<any> {
    const response = await this.client.post(`/payments/refund/${invoiceId}`, { reason });
    return response.data.data;
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    const response = await this.client.get(`/payments/status/${paymentId}`);
    return response.data.data;
  }

  async transferFunds(amount: number, recipient: string): Promise<any> {
    const response = await this.client.post('/payments/transfer', { amount, recipient });
    return response.data.data;
  }

  async getWalletBalance(): Promise<{ balanceXof: number; balanceSats: number }> {
    const response = await this.client.get('/payments/balance');
    return response.data.data;
  }

  async convertCurrency(amount: number, from: string, to: string): Promise<{ result: number }> {
    const response = await this.client.post('/payments/convert', { amount, from, to });
    return response.data.data;
  }

  async getInvoices(): Promise<any[]> {
    const response = await this.client.get('/payments/invoices');
    return response.data.data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    const response = await this.client.get(`/payments/invoice/${invoiceId}`);
    return response.data.data;
  }

  // ========================================================================
  // BLOOD ENDPOINTS
  // ========================================================================

  async registerBloodDonation(data: any): Promise<any> {
    const response = await this.client.post('/blood/donate', data);
    return response.data.data;
  }

  async getBloodDonationHistory(): Promise<any[]> {
    const response = await this.client.get('/blood/history');
    return response.data.data;
  }

  async sendBloodAlert(bloodType: string, location: string): Promise<any> {
    const response = await this.client.post('/blood/alert', { bloodType, location });
    return response.data.data;
  }

  async getBloodDonors(bloodType: string): Promise<any[]> {
    const response = await this.client.get('/blood/donors', { params: { bloodType } });
    return response.data.data;
  }

  async getBloodStatistics(): Promise<any> {
    const response = await this.client.get('/blood/statistics');
    return response.data.data;
  }

  async getNearbyBloodDonors(latitude: number, longitude: number, bloodType: string): Promise<any[]> {
    const response = await this.client.get('/blood/donors/nearby', {
      params: { latitude, longitude, bloodType },
    });
    return response.data.data;
  }

  // ========================================================================
  // TONTINE ENDPOINTS
  // ========================================================================

  async getTontines(): Promise<any[]> {
    const response = await this.client.get('/tontines');
    return response.data.data;
  }

  async getTontine(id: number): Promise<any> {
    const response = await this.client.get(`/tontines/${id}`);
    return response.data.data;
  }

  async createTontine(data: any): Promise<any> {
    const response = await this.client.post('/tontines', data);
    return response.data.data;
  }

  async joinTontine(tontineId: number): Promise<any> {
    const response = await this.client.post(`/tontines/${tontineId}/join`, {});
    return response.data.data;
  }

  async contributeTontine(tontineId: number, amount: number): Promise<any> {
    const response = await this.client.post(`/tontines/${tontineId}/contribute`, { amount });
    return response.data.data;
  }

  async requestTontineWithdrawal(tontineId: number, amount: number, purpose: string): Promise<any> {
    const response = await this.client.post(`/tontines/${tontineId}/withdrawal`, {
      amount,
      purpose,
    });
    return response.data.data;
  }

  // ========================================================================
  // NOTIFICATION ENDPOINTS
  // ========================================================================

  async getNotifications(): Promise<any[]> {
    const response = await this.client.get('/notifications');
    return response.data.data;
  }

  async markNotificationAsRead(notificationId: number): Promise<any> {
    const response = await this.client.put(`/notifications/${notificationId}/read`, {});
    return response.data.data;
  }

  async markAllNotificationsAsRead(): Promise<any> {
    const response = await this.client.put('/notifications/read-all', {});
    return response.data.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
