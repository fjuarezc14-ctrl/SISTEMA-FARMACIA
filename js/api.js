/**
 * VALETEC PHARMA - CLIENTE DE COMUNICACIÓN API (Frontend <-> Backend)
 * Capa de integración HTTP REST que conecta el Frontend con el Servidor Node.js y PostgreSQL 16
 * Incluye Autenticación JWT y Control de Accesos por Rol (RBAC)
 */

class ValetecApiClient {
  constructor() {
    this.baseUrl = window.VALETEC_API_URL || (window.location.protocol.startsWith('http') ? '/api' : 'http://localhost:4000/api');
    this.token = localStorage.getItem('valetec_token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('valetec_user') || 'null');
    this.isConnected = false;
    this.lastHealthData = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Adjuntar token de autenticación JWT si existe
    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      });

      const data = await response.json();
      if (!response.ok) {
        // Si el token expiró o fue rechazado, limpiar sesión local
        if (response.status === 401 && endpoint !== '/auth/login') {
          this.logout();
        }
        throw new Error(data.message || `Error HTTP ${response.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API ERROR] ${endpoint}:`, err.message);
      throw err;
    }
  }

  // 1. Autenticación Real con JWT
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.token) {
      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('valetec_token', data.token);
      localStorage.setItem('valetec_user', JSON.stringify(data.user));
    }

    return data;
  }

  async getMe() {
    if (!this.token) return null;
    try {
      const data = await this.request('/auth/me');
      if (data && data.user) {
        this.currentUser = data.user;
        localStorage.setItem('valetec_user', JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (err) {
      this.logout();
      return null;
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('valetec_token');
    localStorage.removeItem('valetec_user');
  }

  // 2. Chequeo de Salud y Conectividad con Backend y Postgres
  async checkHealth() {
    try {
      const data = await this.request('/health');
      this.isConnected = true;
      this.lastHealthData = data;
      this.updateConnectionBadge(true, data);
      return data;
    } catch (err) {
      this.isConnected = false;
      this.updateConnectionBadge(false);
      return null;
    }
  }

  // 3. Catálogo de Medicamentos desde PostgreSQL
  async getProducts() {
    return await this.request('/products');
  }

  async getProductById(id) {
    return await this.request(`/products/${id}`);
  }

  async createProduct(productData) {
    return await this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  async updateProduct(id, productData) {
    return await this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  async toggleProductStatus(id) {
    return await this.request(`/products/${id}/toggle`, {
      method: 'PATCH'
    });
  }

  // 3.1 Gestión de Categorías Farmacéuticas (Módulo 2)
  async getCategories() {
    return await this.request('/categories');
  }

  async createCategory(categoryData) {
    return await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  }

  async updateCategory(id, categoryData) {
    return await this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
  }

  async deleteCategory(id) {
    return await this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  }

  async reassignCategory(sourceCategoryId, targetCategoryId) {
    return await this.request('/categories/reassign', {
      method: 'POST',
      body: JSON.stringify({ sourceCategoryId, targetCategoryId })
    });
  }

  // 3.2 Gestión de Laboratorios Farmacéuticos (Módulo 2)
  async getLaboratories() {
    return await this.request('/laboratories');
  }

  async createLaboratory(labData) {
    return await this.request('/laboratories', {
      method: 'POST',
      body: JSON.stringify(labData)
    });
  }

  async updateLaboratory(id, labData) {
    return await this.request(`/laboratories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(labData)
    });
  }

  async deleteLaboratory(id) {
    return await this.request(`/laboratories/${id}`, {
      method: 'DELETE'
    });
  }

  async reassignLaboratory(sourceLabName, targetLabName) {
    return await this.request('/laboratories/reassign', {
      method: 'POST',
      body: JSON.stringify({ sourceLabName, targetLabName })
    });
  }

  // 4. Recepción de Lotes / Stock en Kardex (PostgreSQL)
  async addStock(stockData) {
    return await this.request('/products/receive', {
      method: 'POST',
      body: JSON.stringify(stockData)
    });
  }

  // 4.1 Lotes FEFO, Vencimientos y Ajustes de Stock (Módulo 3)
  async getExpiringLots() {
    return await this.request('/products/lots/expiring');
  }

  async adjustStock(adjustmentData) {
    return await this.request('/products/adjust-stock', {
      method: 'POST',
      body: JSON.stringify(adjustmentData)
    });
  }

  async createProductLot(productId, lotData) {
    return await this.request(`/products/${productId}/lots`, {
      method: 'POST',
      body: JSON.stringify(lotData)
    });
  }

  // 4.2 Kardex Físico y Valorizado (Módulo 4)
  async getProductKardex(productId) {
    return await this.request(`/reports/kardex/${productId}`);
  }

  async getKardexSummary() {
    return await this.request('/reports/kardex-summary');
  }

  // 4.3 Directorio y Padrón de Clientes DNI / RUC (Módulo 5)
  async getClients() {
    return await this.request('/clients');
  }

  async searchClients(query) {
    return await this.request(`/clients/search?query=${encodeURIComponent(query)}`);
  }

  async getClientById(id) {
    return await this.request(`/clients/${id}`);
  }

  async createClient(clientData) {
    return await this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  }

  async updateClient(id, clientData) {
    return await this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData)
    });
  }

  // 5. Personal y Perfiles de Turno
  async getUsers() {
    return await this.request('/users');
  }

  // 6. Libro DIGEMID & Recetas Médicas
  async getRecipes(params = '') {
    return await this.request(`/recipes${params ? '?' + params : ''}`);
  }

  async createRecipe(recipeData) {
    return await this.request('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipeData)
    });
  }

  async updateRecipeStatus(folio, status) {
    return await this.request(`/recipes/${folio}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async getSanitaryBalance() {
    return await this.request('/recipes/balance');
  }

  // 7. Turno Activo y Arqueo de Caja Chica
  async getCashShift() {
    return await this.request('/cash/current');
  }

  async addCashMovement(movementData) {
    return await this.request('/cash/movement', {
      method: 'POST',
      body: JSON.stringify(movementData)
    });
  }

  async closeZShift(closeData) {
    return await this.request('/cash/close-z', {
      method: 'POST',
      body: JSON.stringify(closeData)
    });
  }

  async openCashShift(openData) {
    return await this.request('/cash/open', {
      method: 'POST',
      body: JSON.stringify(openData)
    });
  }

  // 8. Métricas y Estadísticas Financieras en Tiempo Real
  async getDashboardStats() {
    return await this.request('/reports/dashboard');
  }

  // 8. Motor Transaccional de Ventas & Descuento FEFO (PostgreSQL)
  async createSale(saleData) {
    return await this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData)
    });
  }

  async getSales(limit = 50) {
    return await this.request(`/sales?limit=${limit}`);
  }

  async getSaleById(id) {
    return await this.request(`/sales/${id}`);
  }

  async cancelSale(id) {
    return await this.request(`/sales/${id}/cancel`, {
      method: 'PATCH'
    });
  }

  // Indicador visual en la barra superior del Frontend
  updateConnectionBadge(isOnline, data = null) {
    const badge = document.getElementById('liveApiStatusBadge');
    if (!badge) return;

    if (isOnline && data) {
      badge.className = 'valetec-live-badge online';
      badge.innerHTML = `
        <span class="dot"></span>
        <span><strong>Conectado:</strong> Frontend ↔ Backend:4000 ↔ <strong>PostgreSQL 16</strong> (${data.database.latencyMs}ms)</span>
      `;
    } else {
      badge.className = 'valetec-live-badge offline';
      badge.innerHTML = `
        <span class="dot"></span>
        <span><strong>Desconectado:</strong> Esperando Backend Node.js en :4000...</span>
      `;
    }
  }
}

// Instancia global disponible en toda la aplicación
window.api = new ValetecApiClient();
