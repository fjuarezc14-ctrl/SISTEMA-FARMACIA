/**
 * VALETEC PHARMA - CLIENTE DE COMUNICACIÓN API (Frontend <-> Backend)
 * Capa de integración HTTP REST que conecta el Frontend con el Servidor Node.js y PostgreSQL 16
 */

class ValetecApiClient {
  constructor() {
    // Si corre en Docker con Nginx proxy, o directo contra el puerto 4000:
    this.baseUrl = window.VALETEC_API_URL || 'http://localhost:4000/api';
    this.isConnected = false;
    this.lastHealthData = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

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
        throw new Error(data.message || `Error HTTP ${response.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API ERROR] ${endpoint}:`, err.message);
      throw err;
    }
  }

  // 1. Chequeo de Salud y Conectividad con Backend y Postgres
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

  // 2. Catálogo de Medicamentos desde PostgreSQL
  async getProducts() {
    return await this.request('/products');
  }

  // 3. Recepción de Lotes / Stock en Kardex (PostgreSQL)
  async addStock(stockData) {
    return await this.request('/products/receive', {
      method: 'POST',
      body: JSON.stringify(stockData)
    });
  }

  // 4. Personal y Perfiles de Turno
  async getUsers() {
    return await this.request('/users');
  }

  // 5. Libro DIGEMID & Recetas Médicas
  async getRecipes() {
    return await this.request('/recipes');
  }

  async updateRecipeStatus(folio, status) {
    return await this.request(`/recipes/${folio}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // 6. Turno Activo y Arqueo de Caja Chica
  async getCashShift() {
    return await this.request('/cash/current');
  }

  async addCashMovement(movementData) {
    return await this.request('/cash/movement', {
      method: 'POST',
      body: JSON.stringify(movementData)
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
