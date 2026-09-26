/**
 * VALETEC PHARMA - SISTEMA DE GESTIÓN FARMACÉUTICA V2
 * Arquitectura: JavaScript Modular / Clean Architecture
 * Módulos: Autenticación & Login, UserWay Nativo (Accesibilidad), Cockpit Gerencial, Mostrador, Caja, Almacén, DIGEMID y Equipo
 */

// =============================================================
// 0. UTILIDADES DE SEGURIDAD GLOBAL
// =============================================================

/**
 * Escapa caracteres HTML peligrosos para prevenir ataques XSS (Stored & Reflected).
 * Debe usarse en TODA interpolación de datos de usuario dentro de innerHTML.
 * Hotfix: V-05, V-06, V-07 — QA Monkey Testing 2026-09-24
 * @param {*} str - Valor a sanitizar (se convierte a string automáticamente)
 * @returns {string} - String con caracteres HTML escapados de forma segura
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// =============================================================
// 1. DATASET DE PRUEBA: MEDICAMENTOS CON EQUIVALENCIAS DCI
// =============================================================
let testPharmacyCatalog = [
  {
    id: 1,
    name: "Valetec-Dol Forte 500mg",
    genericDci: "Paracetamol 500mg + Cafeína 30mg",
    laboratory: "Laboratorios Farmatec S.A.",
    category: "dolor",
    location: "Pasillo 1 • Anaquel A-1",
    boxPrice: 28.00,
    blisterPrice: 3.00,
    unitPrice: 0.35,
    unitsPerBox: 100,
    unitsPerBlister: 10,
    stockBoxes: 4,
    stockBlisters: 14,
    stockUnits: 140,
    prescriptionType: "free",
    barcode: "7750990001",
    lotNumber: "L-24098",
    expireDate: "2027-08-30",
    fefoStatus: "good",
    genericAlt: {
      id: 7,
      name: "Paracetamol 500mg DCI Genérico",
      boxPrice: 12.50,
      savingPercent: 55
    }
  },
  {
    id: 2,
    name: "Bio-Amoxil 500mg Cápsulas",
    genericDci: "Amoxicilina Trihidrato",
    laboratory: "MedPharma Labs",
    category: "antibioticos",
    location: "Zona Refrigerada • Gaveta B-1",
    boxPrice: 26.00,
    blisterPrice: 2.80,
    unitPrice: 0.30,
    unitsPerBox: 100,
    unitsPerBlister: 10,
    stockBoxes: 2,
    stockBlisters: 8,
    stockUnits: 80,
    prescriptionType: "required", // Requiere CMP
    barcode: "7750990002",
    lotNumber: "L-24115",
    expireDate: "2026-11-15", // Vence en <90 días (Alerta Canje)
    fefoStatus: "warning",
    genericAlt: null
  },
  {
    id: 3,
    name: "Farma-Naprox 550mg Tabletas",
    genericDci: "Naproxeno Sódico 550mg",
    laboratory: "BioFarma Perú",
    category: "dolor",
    location: "Pasillo 1 • Anaquel A-2",
    boxPrice: 42.00,
    blisterPrice: 4.50,
    unitPrice: 0.55,
    unitsPerBox: 80,
    unitsPerBlister: 8,
    stockBoxes: 5,
    stockBlisters: 10,
    stockUnits: 64,
    prescriptionType: "free",
    barcode: "7750990003",
    lotNumber: "L-23980",
    expireDate: "2028-02-28",
    fefoStatus: "good",
    genericAlt: {
      id: 8,
      name: "Naproxeno 550mg Genérico Andina",
      boxPrice: 16.00,
      savingPercent: 62
    }
  },
  {
    id: 4,
    name: "Gastro-Bismut 262mg Masticables",
    genericDci: "Subsalicilato de Bismuto 262mg",
    laboratory: "Droguería Andina S.A.C.",
    category: "digestivos",
    location: "Pasillo 2 • Anaquel C-4",
    boxPrice: 34.00,
    blisterPrice: 3.60,
    unitPrice: 0.40,
    unitsPerBox: 100,
    unitsPerBlister: 10,
    stockBoxes: 3,
    stockBlisters: 11,
    stockUnits: 110,
    prescriptionType: "free",
    barcode: "7750990004",
    lotNumber: "L-24310",
    expireDate: "2027-10-15",
    fefoStatus: "good",
    genericAlt: null
  },
  {
    id: 5,
    name: "Sedafarma 2mg Ranuradas",
    genericDci: "Clonazepam (Psicotrópico Lista IV)",
    laboratory: "MedPharma Labs",
    category: "controlados",
    location: "Caja Fuerte Psicotrópicos (Custodia Q.F.)",
    boxPrice: 52.00,
    blisterPrice: 5.50,
    unitPrice: 0.65,
    unitsPerBox: 100,
    unitsPerBlister: 10,
    stockBoxes: 1,
    stockBlisters: 2,
    stockUnits: 25,
    prescriptionType: "retained", // Receta Retenida en Libro Oficial
    barcode: "7750990005",
    lotNumber: "L-23842",
    expireDate: "2027-05-20",
    fefoStatus: "good",
    genericAlt: null
  },
  {
    id: 6,
    name: "C-Vit Zinc Efervescente",
    genericDci: "Ácido Ascórbico 1000mg + Zinc 10mg",
    laboratory: "BioFarma Perú",
    category: "vitaminas",
    location: "Pasillo 3 • Anaquel D-1",
    boxPrice: 32.00,
    blisterPrice: 3.50,
    unitPrice: 1.40,
    unitsPerBox: 30,
    unitsPerBlister: 10,
    stockBoxes: 0,
    stockBlisters: 0,
    stockUnits: 0, // Agotado
    prescriptionType: "free",
    barcode: "7750990006",
    lotNumber: "L-22990",
    expireDate: "2026-04-10",
    fefoStatus: "expired",
    genericAlt: null
  },
  {
    id: 7,
    name: "Paracetamol 500mg DCI Genérico",
    genericDci: "Paracetamol D.C.I.",
    laboratory: "Laboratorios Farmatec S.A.",
    category: "dolor",
    location: "Pasillo 1 • Anaquel A-1",
    boxPrice: 12.50,
    blisterPrice: 1.40,
    unitPrice: 0.18,
    unitsPerBox: 100,
    unitsPerBlister: 10,
    stockBoxes: 8,
    stockBlisters: 20,
    stockUnits: 200,
    prescriptionType: "free",
    barcode: "7750990007",
    lotNumber: "L-24891",
    expireDate: "2028-06-18",
    fefoStatus: "good",
    genericAlt: null
  }
];

// =============================================================
// 2. DATASET DE PERFILES Y ROLES DE TRABAJO
// =============================================================
let mockStaffProfiles = {
  admin: {
    name: "Ing. Juan Pérez",
    roleLabel: "Dueño / Gerente General",
    avatar: "👑",
    email: "gerencia@valetec.pe",
    allowedViews: ["viewCounter", "viewCash", "viewWarehouse", "viewDigemid", "viewStaff", "viewManagement"],
    defaultView: "viewManagement"
  },
  qf: {
    name: "Dra. Elena Vega",
    roleLabel: "Química Farmacéutica (Regente)",
    avatar: "🔬",
    email: "regencia@valetec.pe",
    allowedViews: ["viewCounter", "viewCash", "viewWarehouse", "viewDigemid", "viewStaff", "viewManagement"],
    defaultView: "viewDigemid"
  },
  tech: {
    name: "Carlos Mendoza",
    roleLabel: "Técnico de Mostrador",
    avatar: "🩺",
    email: "mostrador@valetec.pe",
    allowedViews: ["viewCounter", "viewWarehouse", "viewDigemid"],
    defaultView: "viewCounter"
  },
  cashier: {
    name: "Rodrigo Soto",
    roleLabel: "Cajero de Turno",
    avatar: "💵",
    email: "caja@valetec.pe",
    allowedViews: ["viewCounter", "viewCash", "viewWarehouse", "viewDigemid"],
    defaultView: "viewCash"
  }
};

let staffMembersList = [
  { name: "Carlos Mendoza", role: "Técnico de Mostrador", terminal: "Terminal 01", shift: "Mañana (08:00 - 16:00)", permissions: "Dispensación, Consulta Stock", status: "active", target: "S/ 1,500.00" },
  { name: "Dra. Elena Vega", role: "Directora Técnica / Regente", terminal: "Regencia Q.F.", shift: "Completo (08:00 - 18:00)", permissions: "Auditoría, DIGEMID, Lotes", status: "active", target: "Cumplimiento BPA" },
  { name: "Rodrigo Soto", role: "Cajero Principal", terminal: "Caja 01", shift: "Mañana (08:00 - 16:00)", permissions: "Cobro POS, Arqueo, Egresos", status: "active", target: "S/ 3,500.00" },
  { name: "Mariana Silva", role: "Técnico de Turno Tarde", terminal: "Terminal 02", shift: "Tarde (14:00 - 22:00)", permissions: "Dispensación, Consulta Stock", status: "pending", target: "S/ 1,200.00" },
  { name: "Ing. Juan Pérez", role: "Gerente General", terminal: "Acceso Remoto Cloud", shift: "Supervisión 24/7", permissions: "Control Total, Finanzas, Compras", status: "active", target: "Rentabilidad 35%" }
];

let digemidMockRecords = [
  {
    folio: "REC-2026-0041",
    patientName: "Paciente Demo Uno",
    patientDni: "10293847",
    doctorName: "Dr. Manuel Ramos",
    doctorCmp: "CMP-48291",
    medication: "Bio-Amoxil 500mg Cápsulas (21 unidades)",
    dateIssued: "18/09/2026",
    status: "approved",
    notes: "Receta archivada en expediente de antibióticos."
  },
  {
    folio: "REC-2026-0040",
    patientName: "Paciente Demo Dos",
    patientDni: "44839201",
    doctorName: "Dra. Rosa Benítez",
    doctorCmp: "CMP-59102",
    medication: "Sedafarma 2mg Ranuradas (30 unidades)",
    dateIssued: "18/09/2026",
    status: "retained",
    notes: "Receta retenida en Libro Oficial de Psicotrópicos Lista IV."
  },
  {
    folio: "REC-2026-0039",
    patientName: "Paciente Demo Tres",
    patientDni: "08291834",
    doctorName: "Dr. Alberto Vega",
    doctorCmp: "CMP-33201",
    medication: "Azitromicina 500mg (3 unidades)",
    dateIssued: "17/09/2026",
    status: "dispensed",
    notes: "Dispensación completada y balance cerrado."
  }
];

// =============================================================
// 3. GESTOR DE AUTENTICACIÓN & LOGIN (AUTH MANAGER CON JWT Y BCRYPT)
// =============================================================
class AuthManager {
  constructor() {
    this.selectedRole = 'admin';
    this.loginScreen = document.getElementById('loginScreen');
    this.appScreen = document.getElementById('appScreen');
    this.usernameInput = document.getElementById('loginUsername');
    this.passwordInput = document.getElementById('loginPassword');

    // Cargar clave inicial por defecto para agilizar pruebas
    if (this.passwordInput && !this.passwordInput.value) {
      this.passwordInput.value = 'admin123';
    }
  }

  selectQuickProfile(roleKey) {
    this.selectedRole = roleKey;
    document.querySelectorAll('.profile-card-btn').forEach(btn => {
      if (btn.dataset.role === roleKey) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const passwordMap = {
      admin: 'admin123',
      qf: 'qf123',
      tech: 'tech123',
      cashier: 'cashier123'
    };

    const profile = mockStaffProfiles[roleKey];
    if (profile && this.usernameInput) {
      this.usernameInput.value = profile.email;
    }
    if (this.passwordInput && passwordMap[roleKey]) {
      this.passwordInput.value = passwordMap[roleKey];
    }
  }

  async login(e) {
    if (e) e.preventDefault();
    const email = this.usernameInput?.value.trim();
    const password = this.passwordInput?.value;

    if (!email || !password) {
      showValetecToast("Por favor, ingresa tu correo y contraseña.", "warning");
      return;
    }

    const submitBtn = document.querySelector('.btn-login-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Validando en PostgreSQL...`;
    }

    try {
      // Petición real al backend con validación bcrypt y firma JWT
      const res = await window.api.login(email, password);

      if (this.loginScreen) this.loginScreen.classList.add('d-none');
      if (this.appScreen) this.appScreen.classList.remove('d-none');

      const roleSelect = document.getElementById('appRoleSelector');
      if (roleSelect) {
        roleSelect.value = res.user.roleKey;
        roleSelect.disabled = (res.user.roleKey !== 'admin');
        const pill = roleSelect.closest('.role-selector-pill');
        if (pill) {
          pill.style.opacity = (res.user.roleKey === 'admin') ? '1' : '0.7';
          pill.title = (res.user.roleKey === 'admin')
            ? 'Simulador de perfiles activo (Modo Administrador)'
            : `Rol activo: ${res.user.roleLabel} (Bloqueado por política RBAC)`;
        }
      }
      appNav.applyRolePermissions(res.user.roleKey);

      showValetecToast(`¡Sesión autorizada por JWT! Bienvenido, ${res.user.name}.`, "success");
    } catch (err) {
      showValetecToast(err.message || "Error al autenticar credenciales.", "danger");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-box-arrow-in-right"></i> 🚀 Ingresar al Sistema`;
      }
    }
  }

  updateQuickProfileCards(profiles) {
    if (!profiles) return;
    document.querySelectorAll('.profile-card-btn').forEach(btn => {
      const role = btn.dataset.role;
      const prof = profiles[role];
      if (prof) {
        const strong = btn.querySelector('.prof-text strong');
        const small = btn.querySelector('.prof-text small');
        if (strong && prof.roleLabel) {
          strong.innerText = prof.roleLabel;
        }
        if (small) {
          const parts = small.innerText.split('•');
          const desc = parts.length > 1 ? parts[1].trim() : '';
          small.innerText = desc ? `${prof.name} • ${desc}` : prof.name;
        }
      }
    });
  }

  async checkActiveSession() {
    try {
      const user = await window.api.getMe();
      if (user) {
        if (this.loginScreen) this.loginScreen.classList.add('d-none');
        if (this.appScreen) this.appScreen.classList.remove('d-none');

        const roleSelect = document.getElementById('appRoleSelector');
        if (roleSelect) {
          roleSelect.value = user.roleKey;
          roleSelect.disabled = (user.roleKey !== 'admin');
          const pill = roleSelect.closest('.role-selector-pill');
          if (pill) {
            pill.style.opacity = (user.roleKey === 'admin') ? '1' : '0.7';
            pill.title = (user.roleKey === 'admin')
              ? 'Simulador de perfiles activo (Modo Administrador)'
              : `Rol activo: ${user.roleLabel} (Bloqueado por política RBAC)`;
          }
        }
        appNav.applyRolePermissions(user.roleKey);

        showValetecToast(`Sesión activa recuperada por JWT: ${user.name}.`, "info");
      }
    } catch (e) {
      // Sesión no activa, permanece en login
    }
  }

  logout() {
    if (confirm("¿Seguro que deseas cerrar la sesión de tu turno actual?")) {
      window.api.logout();
      if (this.appScreen) this.appScreen.classList.add('d-none');
      if (this.loginScreen) this.loginScreen.classList.remove('d-none');
      const roleSelect = document.getElementById('appRoleSelector');
      if (roleSelect) {
        roleSelect.disabled = false;
        roleSelect.value = 'admin';
        const pill = roleSelect.closest('.role-selector-pill');
        if (pill) {
          pill.style.opacity = '1';
          pill.title = 'Toca aquí para cambiar de perfil y ver cómo trabaja cada colaborador';
        }
      }
      showValetecToast("Sesión cerrada y token JWT invalidado.", "info");
    }
  }
}

// =============================================================
// 4. WIDGET NATIVO DE ACCESIBILIDAD UNIVERSAL (USERWAY ENGINE)
// =============================================================
class AccessibilityEngine {
  constructor() {
    this.drawer = document.getElementById('userwayDrawer');
    this.btnOpen = document.getElementById('btnOpenUserway');
    this.btnClose = document.getElementById('btnCloseUserway');
    this.body = document.getElementById('appBody') || document.body;

    this.fontSize = 'normal';
    this.isDark = false;
    this.isDyslexia = false;
    this.isSpaced = false;
    this.isLinksHighlight = false;

    this.init();
    this.loadSavedSettings();
  }

  init() {
    if (this.btnOpen) {
      this.btnOpen.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        this.toggleDrawer();
      });
    }

    if (this.btnClose) {
      this.btnClose.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        e.stopPropagation();
        this.closeDrawer();
      });
    }

    // Cerrar al hacer clic fuera del panel
    document.addEventListener('click', (e) => {
      if (this.drawer && this.btnOpen) {
        if (!this.drawer.contains(e.target) && !this.btnOpen.contains(e.target)) {
          this.closeDrawer();
        }
      }
    });

    // Cerrar al presionar tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drawer?.classList.contains('active')) {
        this.closeDrawer();
      }
    });
  }

  loadSavedSettings() {
    try {
      const saved = localStorage.getItem('valetec_accessibility_settings');
      if (saved) {
        const cfg = JSON.parse(saved);
        if (cfg.fontSize && cfg.fontSize !== 'normal') {
          this.setFontSize(cfg.fontSize);
        }
        if (cfg.isDark) this.toggleDarkMode(true);
        if (cfg.isDyslexia) this.toggleDyslexia(true);
        if (cfg.isSpaced) this.toggleSpacedText(true);
        if (cfg.isLinksHighlight) this.toggleHighlightLinks(true);
      }
    } catch (e) {
      console.warn("Error cargando configuración de accesibilidad:", e);
    }
  }

  saveSettings() {
    try {
      const cfg = {
        fontSize: this.fontSize,
        isDark: this.isDark,
        isDyslexia: this.isDyslexia,
        isSpaced: this.isSpaced,
        isLinksHighlight: this.isLinksHighlight
      };
      localStorage.setItem('valetec_accessibility_settings', JSON.stringify(cfg));
    } catch (e) {
      console.warn("Error guardando configuración de accesibilidad:", e);
    }
  }

  toggleDrawer() {
    if (!this.drawer) return;
    const isActive = this.drawer.classList.toggle('active');
    if (this.btnOpen) {
      this.btnOpen.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    }
  }

  closeDrawer() {
    if (!this.drawer) return;
    this.drawer.classList.remove('active');
    if (this.btnOpen) {
      this.btnOpen.setAttribute('aria-expanded', 'false');
    }
  }

  setFontSize(size, el) {
    this.fontSize = size || 'normal';
    this.body.classList.remove('uw-font-lg', 'uw-font-xl');
    const btns = document.querySelectorAll('.btn-uw-ctrl');
    btns.forEach(b => b.classList.remove('active'));

    if (this.fontSize === 'lg') {
      this.body.classList.add('uw-font-lg');
      if (el) el.classList.add('active');
      else btns[1]?.classList.add('active');
    } else if (this.fontSize === 'xl') {
      this.body.classList.add('uw-font-xl');
      if (el) el.classList.add('active');
      else btns[2]?.classList.add('active');
    } else {
      if (el) el.classList.add('active');
      else btns[0]?.classList.add('active');
    }
    this.saveSettings();
    showValetecToast(`Tamaño de texto: ${this.fontSize.toUpperCase()}`, "info");
  }

  toggleDarkMode(forceState) {
    this.isDark = typeof forceState === 'boolean' ? forceState : !this.isDark;
    this.body.classList.toggle('uw-dark-mode', this.isDark);
    document.getElementById('btnToggleDarkMode')?.classList.toggle('active', this.isDark);
    this.saveSettings();
    showValetecToast(`Modo Oscuro ${this.isDark ? 'Activado' : 'Desactivado'}`, "info");
  }

  toggleDyslexia(forceState) {
    this.isDyslexia = typeof forceState === 'boolean' ? forceState : !this.isDyslexia;
    this.body.classList.toggle('uw-dyslexia', this.isDyslexia);
    document.getElementById('btnToggleDyslexia')?.classList.toggle('active', this.isDyslexia);
    this.saveSettings();
    showValetecToast(`Lectura Fácil ${this.isDyslexia ? 'Activada' : 'Desactivada'}`, "info");
  }

  toggleSpacedText(forceState) {
    this.isSpaced = typeof forceState === 'boolean' ? forceState : !this.isSpaced;
    this.body.classList.toggle('uw-spaced-text', this.isSpaced);
    document.getElementById('btnToggleSpacedText')?.classList.toggle('active', this.isSpaced);
    this.saveSettings();
    showValetecToast(`Espaciado de Texto ${this.isSpaced ? 'Activado' : 'Desactivado'}`, "info");
  }

  toggleHighlightLinks(forceState) {
    this.isLinksHighlight = typeof forceState === 'boolean' ? forceState : !this.isLinksHighlight;
    this.body.classList.toggle('uw-highlight-links', this.isLinksHighlight);
    document.getElementById('btnToggleHighlightLinks')?.classList.toggle('active', this.isLinksHighlight);
    this.saveSettings();
    showValetecToast(`Resaltado de Botones ${this.isLinksHighlight ? 'Activado' : 'Desactivado'}`, "info");
  }

  resetAll() {
    this.body.classList.remove(
      'uw-font-lg',
      'uw-font-xl',
      'uw-dark-mode',
      'uw-dyslexia',
      'uw-spaced-text',
      'uw-highlight-links'
    );
    this.fontSize = 'normal';
    this.isDark = false;
    this.isDyslexia = false;
    this.isSpaced = false;
    this.isLinksHighlight = false;

    document.querySelectorAll('.btn-uw-feature').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.btn-uw-ctrl').forEach((b, i) => b.classList.toggle('active', i === 0));

    try {
      localStorage.removeItem('valetec_accessibility_settings');
    } catch (e) { }

    showValetecToast("Accesibilidad restablecida a modo estándar.", "success");
  }
}

// =============================================================
// 5. CONTROLADOR DE ROLES Y NAVEGACIÓN (SPA CONTROLLER)
// =============================================================
class NavigationController {
  constructor() {
    this.tabs = document.querySelectorAll('.nav-tab-btn');
    this.views = document.querySelectorAll('.app-view-panel');
    this.roleSelect = document.getElementById('appRoleSelector');
    this.currentRole = this.roleSelect?.value || 'admin';
    this.currentViewId = 'viewManagement';

    this.initSidebarState();
    this.initEvents();
    this.startClock();

    if (this.roleSelect) {
      this.applyRolePermissions(this.currentRole);
    }
  }

  initSidebarState() {
    const isCollapsed = localStorage.getItem('valetec_sidebar_collapsed') === 'true';
    if (window.innerWidth > 1024 && isCollapsed) {
      document.getElementById('appNavBar')?.classList.add('sidebar-collapsed');
      document.querySelector('.app-content-wrapper')?.classList.add('sidebar-collapsed');
    }
  }

  toggleSidebarDesktop() {
    const navBar = document.getElementById('appNavBar');
    const contentWrapper = document.querySelector('.app-content-wrapper');
    if (!navBar) return;
    const isNowCollapsed = navBar.classList.toggle('sidebar-collapsed');
    if (contentWrapper) {
      contentWrapper.classList.toggle('sidebar-collapsed', isNowCollapsed);
    }
    localStorage.setItem('valetec_sidebar_collapsed', isNowCollapsed ? 'true' : 'false');
    showValetecToast(isNowCollapsed ? "Menú lateral compactado (76px)" : "Menú lateral expandido (260px)", "info");
  }

  initEvents() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.dataset.view;
        this.navigateTo(targetView);
      });
    });

    if (this.roleSelect) {
      this.roleSelect.addEventListener('change', (e) => {
        this.currentRole = e.target.value;
        this.applyRolePermissions(this.currentRole);
      });
    }

    const btnMobile = document.getElementById('btnMobileMenuToggle');
    const btnSidebarClose = document.getElementById('btnSidebarClose');
    const navBar = document.getElementById('appNavBar');
    const backdrop = document.getElementById('sidebarBackdrop');

    const toggleSidebar = (open) => {
      if (window.innerWidth > 1024) {
        this.toggleSidebarDesktop();
        return;
      }

      if (!navBar) return;
      if (typeof open === 'boolean') {
        if (open) {
          navBar.classList.add('mobile-open');
          backdrop?.classList.add('active');
        } else {
          navBar.classList.remove('mobile-open');
          backdrop?.classList.remove('active');
        }
      } else {
        const isOpen = navBar.classList.toggle('mobile-open');
        if (isOpen) backdrop?.classList.add('active');
        else backdrop?.classList.remove('active');
      }
    };

    if (btnMobile) btnMobile.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      toggleSidebar();
    });
    if (btnSidebarClose) btnSidebarClose.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      toggleSidebar(false);
    });
    if (backdrop) backdrop.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      toggleSidebar(false);
    });

    window.addEventListener('keydown', (e) => {
      // Guarda de protección estricta: No interceptar atajos si el usuario está escribiendo en campos de formulario
      const activeEl = document.activeElement;
      const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || (activeEl && activeEl.isContentEditable);
      if (isEditable) return;

      if (e.key === 'F1') {
        e.preventDefault();
        showValetecToast("⌨️ Atajos: [F1] Ayuda | [F2] Mostrador | [F3] Almacén | [F4] Cobrar / DIGEMID | [F6] Torre Control | [F7] Ventas / Personal | [F8] Limpiar Pedido | [F9] Caja", "info");
      }
      if (e.key === 'F2') {
        e.preventDefault();
        this.navigateTo('viewCounter');
        setTimeout(() => { document.getElementById('fastProductSearch')?.focus(); }, 100);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (this.canAccessView('viewWarehouse')) {
          this.navigateTo('viewWarehouse');
        } else {
          showValetecToast("Tu rol actual no tiene permiso para ingresar a Almacén.", "warning");
        }
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (this.currentViewId === 'viewCounter') {
          document.getElementById('btnCheckoutOrder')?.click();
        } else if (this.canAccessView('viewDigemid')) {
          this.navigateTo('viewDigemid');
        } else {
          showValetecToast("Tu rol actual no tiene permiso para ingresar a DIGEMID.", "warning");
        }
      }
      if (e.key === 'F6') {
        e.preventDefault();
        if (this.canAccessView('viewManagement')) {
          this.navigateTo('viewManagement');
        } else {
          showValetecToast("Acceso restringido: Solo Gerencia y Regencia tienen acceso a Torre de Control.", "warning");
        }
      }
      if (e.key === 'F7') {
        e.preventDefault();
        if (this.currentViewId === 'viewCounter') {
          if (typeof counterApp !== 'undefined' && counterApp) {
            counterApp.toggleSalesHistoryModal(true);
            counterApp.loadSalesHistory();
          }
        } else if (this.canAccessView('viewStaff')) {
          this.navigateTo('viewStaff');
        } else {
          showValetecToast("Acceso restringido: Solo Gerencia y Regencia tienen acceso a Gestión de Personal.", "warning");
        }
      }
      if (e.key === 'F8') {
        if (this.currentViewId === 'viewCounter') {
          e.preventDefault();
          document.getElementById('btnCancelOrder')?.click();
        }
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (this.canAccessView('viewCash')) {
          this.navigateTo('viewCash');
        } else {
          showValetecToast("Tu rol actual no tiene permiso para ingresar a Caja.", "warning");
        }
      }
    });

    document.getElementById('btnOpenShortcuts')?.addEventListener('click', () => {
      showValetecToast("⌨️ Atajos: [F1] Ayuda | [F2] Mostrador | [F3] Almacén | [F4] Cobrar / DIGEMID | [F6] Torre Control | [F7] Ventas / Personal | [F8] Limpiar Pedido | [F9] Caja", "info");
    });
  }

  canAccessView(viewId) {
    const profile = mockStaffProfiles[this.currentRole];
    return profile ? profile.allowedViews.includes(viewId) : false;
  }

  applyRolePermissions(roleKey) {
    this.currentRole = roleKey;
    let profile = mockStaffProfiles[roleKey];
    if (!profile) return;

    if (roleKey === 'admin' || roleKey === 'qf') {
      profile.allowedViews = ["viewCounter", "viewCash", "viewWarehouse", "viewDigemid", "viewStaff", "viewManagement"];
    } else if (roleKey === 'cashier') {
      profile.allowedViews = ["viewCounter", "viewCash", "viewWarehouse", "viewDigemid"];
    } else if (roleKey === 'tech') {
      profile.allowedViews = ["viewCounter", "viewWarehouse", "viewDigemid"];
    }

    const avatarEl = document.getElementById('activeUserAvatar');
    const nameEl = document.getElementById('activeUserName');
    const roleEl = document.getElementById('activeUserRole');

    if (avatarEl) avatarEl.innerText = profile.avatar;
    if (nameEl) nameEl.innerText = profile.name;
    if (roleEl) roleEl.innerText = profile.roleLabel;

    this.tabs.forEach(tab => {
      const viewId = tab.dataset.view;
      if (profile.allowedViews.includes(viewId)) {
        tab.classList.remove('d-none');
        tab.removeAttribute('disabled');
      } else {
        tab.classList.add('d-none');
        tab.setAttribute('disabled', 'true');
      }
    });

    // Auto-redirección si la vista actual no está permitida para el nuevo rol
    if (!profile.allowedViews.includes(this.currentViewId)) {
      this.navigateTo(profile.defaultView);
      showValetecToast(`Acceso restringido para ${profile.roleLabel}. Vista redirigida.`, "warning");
    } else {
      showValetecToast(`Perfil activo: ${profile.roleLabel}`, "info");
    }
  }

  navigateTo(viewId) {
    if (!this.canAccessView(viewId)) {
      showValetecToast("Tu rol actual no tiene permiso para ingresar a esta sección.", "warning");
      return;
    }

    // Hotfix V-04: Forzar cierre de todos los modales flotantes activos antes de cambiar de vista.
    // Previene modales huérfanos con overlay bloqueante cuando el cajero usa atajos F-Key.
    try {
      if (typeof counterApp !== 'undefined' && counterApp) {
        counterApp.toggleReceiptModal?.(false);
        counterApp.toggleSalesHistoryModal?.(false);
      }
      if (typeof cashApp !== 'undefined' && cashApp) {
        cashApp.toggleZModal?.(false);
        cashApp.toggleModal?.(false);
        cashApp.toggleOpenShiftModal?.(false);
      }
      if (typeof digemidApp !== 'undefined' && digemidApp) {
        digemidApp.toggleModal?.(false);
        digemidApp.toggleNewRecipeModal?.(false);
        digemidApp.toggleBalanceModal?.(false);
      }
      if (typeof warehouseApp !== 'undefined' && warehouseApp) {
        warehouseApp.toggleModal?.(false);
        warehouseApp.closeAdjustmentModal?.();
        warehouseApp.closeKardexModal?.();
        warehouseApp.closeMedicineModal?.();
      }
      if (typeof window.clientsApp !== 'undefined' && window.clientsApp) {
        window.clientsApp.closeQuickModal?.();
        window.clientsApp.closeDirectoryModal?.();
      }
    } catch (modalErr) {
      // No interrumpir la navegación si algún modal ya no existe en el DOM
      console.warn('[V-04 Fix] Error cerrando modal al navegar:', modalErr.message);
    }

    // Cerrar sidebar en dispositivos móviles al navegar
    if (window.innerWidth <= 1024) {
      document.getElementById('appNavBar')?.classList.remove('mobile-open');
      document.getElementById('sidebarBackdrop')?.classList.remove('active');
    }

    const targetElement = document.getElementById(viewId);
    if (!targetElement) return;

    this.views.forEach(v => v.classList.remove('active'));
    targetElement.classList.add('active');

    this.tabs.forEach(t => {
      if (t.dataset.view === viewId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    this.currentViewId = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewId === 'viewCounter') {
      setTimeout(() => { document.getElementById('fastProductSearch')?.focus(); }, 100);
    }
    if (viewId === 'viewManagement' && window.managementApp) {
      setTimeout(() => {
        window.managementApp.renderSales();
        window.managementApp.renderTopProducts();
      }, 60);
    }
  }

  startClock() {
    const clock = document.getElementById('liveAppClock');
    if (!clock) return;
    setInterval(() => {
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      clock.innerText = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} • ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }, 1000);
  }
}

// =============================================================
// 6. MÓDULO MOSTRADOR & DISPENSACIÓN RÁPIDA
// =============================================================
class CounterModule {
  constructor() {
    this.order = [];
    this.currentCat = 'all';
    this.searchQuery = '';
    this.currentPaymentMethod = 'cash';
    this.cachedSalesList = [];

    this.cacheDom();
    this.initEvents();
    this.loadCartFromStorage();
    this.renderProducts();
    this.updateUi();
  }

  saveCartToStorage() {
    try {
      if (!this.order || this.order.length === 0) {
        localStorage.removeItem('valetec_active_cart');
      } else {
        localStorage.setItem('valetec_active_cart', JSON.stringify(this.order));
      }
    } catch (e) {
      console.warn("Error guardando carrito en localStorage:", e);
    }
  }

  loadCartFromStorage() {
    try {
      const saved = localStorage.getItem('valetec_active_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.order = parsed;
          return true;
        }
      }
    } catch (e) {
      console.warn("Error cargando carrito de localStorage:", e);
    }
    return false;
  }

  cacheDom() {
    this.searchInput = document.getElementById('fastProductSearch');
    this.autocomplete = document.getElementById('searchAutocompleteDropdown');
    this.grid = document.getElementById('counterProductsContainer');
    this.itemsScroll = document.getElementById('ticketItemsScroll');

    this.patientInput = document.getElementById('patientDocInput');
    this.btnQuery = document.getElementById('btnQueryPatient');
    this.patientStatus = document.getElementById('patientStatusLine');

    this.baseEl = document.getElementById('ticketBaseAmount');
    this.igvEl = document.getElementById('ticketIgvAmount');
    this.totalEl = document.getElementById('ticketTotalAmount');

    this.rxAlert = document.getElementById('prescriptionAlertBox');
    this.docCmpInput = document.getElementById('orderDoctorCmp');

    this.cashInput = document.getElementById('cashReceivedInput');
    this.changeEl = document.getElementById('cashChangeDisplay');
    this.btnExact = document.getElementById('btnCashExact');
    this.btnCancel = document.getElementById('btnCancelOrder');
    this.btnCheckout = document.getElementById('btnCheckoutOrder');

    // Selector táctil de medios de pago
    this.btnPayCash = document.getElementById('btnPayCash');
    this.btnPayYape = document.getElementById('btnPayYape');
    this.btnPayCard = document.getElementById('btnPayCard');
    this.cashPaymentSection = document.getElementById('cashPaymentSection');
    this.digitalPaymentSection = document.getElementById('digitalPaymentSection');
    this.digitalIconTag = document.getElementById('digitalIconTag');
    this.digitalTitleTag = document.getElementById('digitalTitleTag');
    this.digitalHintTag = document.getElementById('digitalHintTag');
    this.digitalExactBadge = document.getElementById('digitalExactBadge');
    this.digitalRefInput = document.getElementById('digitalRefInput');

    // Modal de historial de ventas del turno y anulación
    this.btnOpenSalesHistory = document.getElementById('btnOpenSalesHistory');
    this.salesHistoryModal = document.getElementById('salesHistoryModal');
    this.btnCloseSalesHistoryModal = document.getElementById('btnCloseSalesHistoryModal');
    this.btnCloseSalesHistoryBtn = document.getElementById('btnCloseSalesHistoryBtn');
    this.btnRefreshSalesHistory = document.getElementById('btnRefreshSalesHistory');
    this.salesHistorySearch = document.getElementById('salesHistorySearch');
    this.salesHistoryTableBody = document.getElementById('salesHistoryTableBody');

    // Modal de comprobante de venta térmico (Ticket 80mm)
    this.receiptModal = document.getElementById('receiptModal');
    this.receiptModalBody = document.getElementById('receiptModalBody');
    this.btnCloseReceipt = document.getElementById('btnCloseReceiptModal');
    this.btnCloseReceiptBtn = document.getElementById('btnCloseReceiptBtn');
    this.btnPrintReceiptBtn = document.getElementById('btnPrintReceiptBtn');
  }

  initEvents() {
    document.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentCat = chip.dataset.cat;
        this.renderProducts();
      });
    });

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderProducts();
        this.renderAutocomplete();
      });

      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.searchQuery) {
            const match = testPharmacyCatalog.find(p =>
              p.barcode === this.searchQuery ||
              p.name.toLowerCase().includes(this.searchQuery) ||
              p.genericDci.toLowerCase().includes(this.searchQuery)
            );
            if (match) {
              this.addItem(match.id, 'box');
              this.searchInput.value = '';
              this.searchQuery = '';
              this.renderProducts();
              this.autocomplete.classList.remove('active');
            }
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (!this.searchInput.contains(e.target) && !this.autocomplete.contains(e.target)) {
          this.autocomplete.classList.remove('active');
        }
      });
    }

    if (this.btnQuery) this.btnQuery.addEventListener('click', () => this.lookupPatient());
    if (this.patientInput) {
      this.patientInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.lookupPatient();
        }
      });

      // Auto-selección inteligente de Boleta / Factura según longitud de documento
      this.patientInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length === 11) {
          const facturaRadio = document.querySelector('input[name="orderVoucherType"][value="factura"]');
          if (facturaRadio) facturaRadio.checked = true;
          this.lookupPatient();
        } else if (val.length === 8) {
          const boletaRadio = document.querySelector('input[name="orderVoucherType"][value="boleta"]');
          if (boletaRadio) boletaRadio.checked = true;
          this.lookupPatient();
        }
      });
    }

    // Botones táctiles de Medios de Pago
    if (this.btnPayCash) this.btnPayCash.addEventListener('click', () => this.setPaymentMethod('cash'));
    if (this.btnPayYape) this.btnPayYape.addEventListener('click', () => this.setPaymentMethod('yape'));
    if (this.btnPayCard) this.btnPayCard.addEventListener('click', () => this.setPaymentMethod('card'));

    // Botones de billetes para cálculo rápido de vuelto
    document.querySelectorAll('.btn-cash-bill').forEach(b => {
      if (b.id === 'btnCashExact') return;
      b.addEventListener('click', () => {
        const val = parseFloat(b.dataset.amount);
        if (this.cashInput) {
          this.cashInput.value = val.toFixed(2);
          this.recalcChange();
        }
      });
    });

    if (this.btnExact) {
      this.btnExact.addEventListener('click', () => {
        const total = this.calcTotal();
        if (this.cashInput) {
          this.cashInput.value = total.toFixed(2);
          this.recalcChange();
        }
      });
    }

    if (this.cashInput) {
      this.cashInput.addEventListener('input', () => this.recalcChange());
    }

    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => {
        if (this.order.length === 0) return;
        if (confirm("¿Limpiar y descartar la orden actual de mostrador?")) {
          this.order = [];
          this.updateUi();
          showValetecToast("Orden cancelada.", "info");
        }
      });
    }

    if (this.btnCheckout) {
      this.btnCheckout.addEventListener('click', () => this.checkout());
    }

    // Eventos del modal de comprobante térmico
    if (this.btnCloseReceipt) this.btnCloseReceipt.addEventListener('click', () => this.toggleReceiptModal(false));
    if (this.btnCloseReceiptBtn) this.btnCloseReceiptBtn.addEventListener('click', () => this.toggleReceiptModal(false));
    if (this.btnPrintReceiptBtn) this.btnPrintReceiptBtn.addEventListener('click', () => window.print());

    // Eventos del modal de historial de ventas del turno
    if (this.btnOpenSalesHistory) {
      this.btnOpenSalesHistory.addEventListener('click', () => {
        this.toggleSalesHistoryModal(true);
        this.loadSalesHistory();
      });
    }
    if (this.btnCloseSalesHistoryModal) {
      this.btnCloseSalesHistoryModal.addEventListener('click', () => this.toggleSalesHistoryModal(false));
    }
    if (this.btnCloseSalesHistoryBtn) {
      this.btnCloseSalesHistoryBtn.addEventListener('click', () => this.toggleSalesHistoryModal(false));
    }
    if (this.btnRefreshSalesHistory) {
      this.btnRefreshSalesHistory.addEventListener('click', () => this.loadSalesHistory());
    }
    if (this.salesHistorySearch) {
      this.salesHistorySearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!this.cachedSalesList) return;
        if (!q) {
          this.renderSalesHistoryRows(this.cachedSalesList);
          return;
        }
        const filtered = this.cachedSalesList.filter(s =>
          (s.correlative && s.correlative.toLowerCase().includes(q)) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          (s.customerDoc && s.customerDoc.includes(q)) ||
          (s.paymentMethod && s.paymentMethod.toLowerCase().includes(q))
        );
        this.renderSalesHistoryRows(filtered);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.receiptModal?.classList.contains('active')) {
          this.toggleReceiptModal(false);
        }
        if (this.salesHistoryModal?.classList.contains('active')) {
          this.toggleSalesHistoryModal(false);
        }
        if (window.clientsApp?.quickModal?.classList.contains('active')) {
          window.clientsApp.closeQuickModal();
        }
        if (window.clientsApp?.directoryModal?.classList.contains('active')) {
          window.clientsApp.closeDirectoryModal();
        }
      }
    });
  }

  async lookupPatient() {
    const doc = this.patientInput?.value.trim();
    if (!doc) {
      showValetecToast("Digita un DNI o RUC para consultar.", "warning");
      return;
    }

    try {
      // Consulta estricta y directa al endpoint GET /api/clients/search?query=...
      const res = await window.api.searchClients(doc);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const client = res.data.find(c => c.documentNumber === doc) || res.data[0];
        if (client) {
          this.patientInput.value = client.documentNumber;
          this.patientStatus.innerHTML = `
            <span class="p-name">👤 ${client.fullName}</span>
            <span class="p-points"><i class="bi bi-star-fill text-warning"></i> ${client.pointsBalance || 0} Puntos</span>
          `;
          showValetecToast(`Cliente "${client.fullName}" identificado en padrón.`, "success");
          return;
        }
      }

      // Si el cliente no existe en la base de datos (respuesta vacía)
      showValetecToast(`Documento "${doc}" no registrado en el padrón. Abriendo registro rápido...`, "info");
      if (window.clientsApp) {
        window.clientsApp.openQuickModal(doc);
      }
    } catch (err) {
      console.warn("Cliente no encontrado en backend o error de búsqueda:", err.message);
      // En caso de 404 o fallo de red, invocar obligatoriamente el modal de registro rápido pre-llenando el documento
      showValetecToast(`Documento "${doc}" no registrado. Abriendo registro rápido...`, "info");
      if (window.clientsApp) {
        window.clientsApp.openQuickModal(doc);
      }
    }
  }

  renderProducts() {
    if (!this.grid) return;

    const filtered = testPharmacyCatalog.filter(p => {
      const matchCat = (this.currentCat === 'all' || p.category === this.currentCat);
      const matchSearch = (!this.searchQuery ||
        p.name.toLowerCase().includes(this.searchQuery) ||
        p.genericDci.toLowerCase().includes(this.searchQuery) ||
        p.barcode.includes(this.searchQuery)
      );
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      this.grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 28px; color: var(--text-muted);">
          <i class="bi bi-search" style="font-size: 28px; display: block; margin-bottom: 4px;"></i>
          <strong>No se encontró ningún medicamento.</strong>
          <p style="font-size: 11.5px;">Intenta buscar por principio activo DCI.</p>
        </div>
      `;
      return;
    }

    this.grid.innerHTML = filtered.map(p => {
      const isOut = (p.stockUnits <= 0);
      let rxPill = `<span class="rx-badge free">🟢 Venta Libre</span>`;
      if (p.prescriptionType === 'required') rxPill = `<span class="rx-badge required">📝 Receta CMP</span>`;
      if (p.prescriptionType === 'retained') rxPill = `<span class="rx-badge retained">🔒 Controlado</span>`;

      return `
        <article class="product-staff-card ${isOut ? 'out-stock' : ''}" data-id="${p.id}">
          <div>
            <div class="card-top-badges">
              <span class="shelf-tag"><i class="bi bi-geo-alt-fill"></i> 📍 ${p.location}</span>
              ${rxPill}
            </div>

            <div class="prod-name">${p.name}</div>
            <div class="prod-dci">DCI: ${p.genericDci}</div>

            <div class="prod-stock-strip">
              <span>Stock: <strong>${p.stockBoxes} Cajas</strong> (${p.stockBlisters} blíst.)</span>
              <span style="color: var(--text-muted);">${p.stockUnits} past.</span>
            </div>

            <div class="fraction-pick-row">
              <button type="button" class="btn-frac-pick active" data-frac="box" data-id="${p.id}">📦 Caja</button>
              <button type="button" class="btn-frac-pick" data-frac="blister" data-id="${p.id}">📑 Blíster</button>
              <button type="button" class="btn-frac-pick" data-frac="unit" data-id="${p.id}">💊 Pastilla</button>
            </div>
          </div>

          <div>
            <div class="price-dispense-footer">
              <span class="price-tag" id="prodPriceDisplay_${p.id}">S/ ${p.boxPrice.toFixed(2)}</span>
              <button 
                type="button" 
                class="btn-dispense" 
                onclick="counterApp.dispenseCard(${p.id})"
                ${isOut ? 'disabled' : ''}
              >
                <i class="bi ${isOut ? 'bi-x-circle' : 'bi-plus-lg'}"></i>
                <span>${isOut ? '🚫 Sin Stock' : '➕ Agregar'}</span>
              </button>
            </div>

            ${p.genericAlt ? `
              <button type="button" class="btn-alt-generic" onclick="counterApp.suggestAlt(${p.id})">
                <i class="bi bi-lightbulb-fill"></i>
                <span>💡 Ofrecer Genérico: ${p.genericAlt.name} (-${p.genericAlt.savingPercent}% ahorro)</span>
              </button>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');

    this.grid.querySelectorAll('.btn-frac-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = parseInt(btn.dataset.id, 10);
        const frac = btn.dataset.frac;
        const card = btn.closest('.product-staff-card');
        card.querySelectorAll('.btn-frac-pick').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const prod = testPharmacyCatalog.find(p => p.id === prodId);
        if (!prod) return;

        let price = prod.boxPrice;
        if (frac === 'blister') price = prod.blisterPrice;
        if (frac === 'unit') price = prod.unitPrice;

        const el = document.getElementById(`prodPriceDisplay_${prodId}`);
        if (el) el.innerText = `S/ ${price.toFixed(2)}`;
      });
    });
  }

  renderAutocomplete() {
    if (!this.autocomplete) return;
    if (!this.searchQuery) {
      this.autocomplete.classList.remove('active');
      return;
    }

    const matches = testPharmacyCatalog.filter(p =>
      p.name.toLowerCase().includes(this.searchQuery) ||
      p.genericDci.toLowerCase().includes(this.searchQuery) ||
      p.barcode.includes(this.searchQuery)
    ).slice(0, 5);

    if (matches.length === 0) {
      this.autocomplete.innerHTML = `<div style="padding: 8px 12px; font-size: 11px; color: var(--text-muted);">Sin coincidencias</div>`;
      this.autocomplete.classList.add('active');
      return;
    }

    this.autocomplete.innerHTML = matches.map(p => `
      <div class="suggest-card-row" onclick="counterApp.selectSuggestItem(${p.id})">
        <div>
          <strong style="font-size: 12.5px; color: var(--valetec-navy);">${p.name}</strong><br>
          <small style="font-size: 10.5px; color: var(--text-muted);">${p.genericDci} • Ubic: ${p.location}</small>
        </div>
        <div style="text-align: right;">
          <strong style="font-size: 12.5px; color: var(--valetec-teal-dark);">S/ ${p.boxPrice.toFixed(2)}</strong><br>
          <small style="font-size: 9.5px; color: var(--text-muted);">${p.stockBoxes} cajas</small>
        </div>
      </div>
    `).join('');
    this.autocomplete.classList.add('active');
  }

  selectSuggestItem(prodId) {
    this.autocomplete.classList.remove('active');
    this.addItem(prodId, 'box');
    this.searchInput.value = '';
    this.searchQuery = '';
    this.renderProducts();
  }

  suggestAlt(brandId) {
    const brand = testPharmacyCatalog.find(p => p.id === brandId);
    if (!brand || !brand.genericAlt) return;

    const alt = brand.genericAlt;
    const ok = confirm(`💡 AHORRO PARA EL CLIENTE:\n\nPuedes ofrecerle un genérico más económico:\n• Marca: ${brand.name} (S/ ${brand.boxPrice.toFixed(2)})\n• Genérico DCI: ${alt.name} (S/ ${alt.boxPrice.toFixed(2)})\n• Ahorro: ${alt.savingPercent}%\n\n¿Deseas agregar ${alt.name} al carrito?`);
    if (ok) {
      this.addItem(alt.id, 'box');
      showValetecToast(`Agregado genérico DCI: ${alt.name}`, "success");
    }
  }

  dispenseCard(prodId) {
    const card = document.querySelector(`.product-staff-card[data-id="${prodId}"]`);
    let frac = 'box';
    if (card) {
      const active = card.querySelector('.btn-frac-pick.active');
      if (active) frac = active.dataset.frac;
    }
    this.addItem(prodId, frac);
  }

  addItem(prodId, frac = 'box') {
    const prod = testPharmacyCatalog.find(p => p.id === prodId);
    if (!prod || prod.stockUnits <= 0) {
      showValetecToast("Medicamento sin stock.", "danger");
      return;
    }

    let price = prod.boxPrice;
    let label = "Caja";
    // Calcular el stock máximo disponible según la fracción seleccionada
    let maxQty = prod.stockBoxes || 0;
    if (frac === 'blister') { price = prod.blisterPrice; label = "Blíster"; maxQty = prod.stockBlisters || 0; }
    else if (frac === 'unit') { price = prod.unitPrice; label = "Pastilla"; maxQty = prod.stockUnits || 0; }

    // Hotfix V-01: Bloquear si el stock máximo es 0 para esta fracción
    if (maxQty <= 0) {
      showValetecToast(`Sin stock de ${label} disponible para ${prod.name}.`, "danger");
      return;
    }

    const exist = this.order.find(i => i.product.id === prodId && i.frac === frac);
    if (exist) {
      // Hotfix V-01: Cap de cantidad contra el stock real disponible
      if (exist.qty >= maxQty) {
        showValetecToast(`⚠️ Stock máximo alcanzado: ${maxQty} ${label}(s) disponibles de ${prod.name}.`, "warning");
        return;
      }
      exist.qty += 1;
    } else {
      this.order.push({ product: prod, frac: frac, label: label, price: price, qty: 1, maxQty: maxQty });
    }

    this.updateUi();
    showValetecToast(`Agregado: ${prod.name} (${label})`, "success");
  }

  updateQty(index, delta) {
    if (!this.order[index]) return;
    const item = this.order[index];
    const newQty = item.qty + delta;
    // Hotfix V-01: Bloquear incremento si supera el stock máximo de la fracción
    if (delta > 0 && item.maxQty !== undefined && newQty > item.maxQty) {
      showValetecToast(`⚠️ Stock máximo: ${item.maxQty} ${item.label}(s) disponibles.`, "warning");
      return;
    }
    item.qty = newQty;
    if (item.qty <= 0) this.order.splice(index, 1);
    this.updateUi();
  }


  calcTotal() {
    return this.order.reduce((s, i) => s + (i.price * i.qty), 0);
  }

  setPaymentMethod(method) {
    this.currentPaymentMethod = method;
    document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
    if (method === 'cash') {
      this.btnPayCash?.classList.add('active');
      this.cashPaymentSection?.classList.remove('d-none');
      this.digitalPaymentSection?.classList.add('d-none');
    } else if (method === 'yape') {
      this.btnPayYape?.classList.add('active');
      this.cashPaymentSection?.classList.add('d-none');
      this.digitalPaymentSection?.classList.remove('d-none');
      if (this.digitalIconTag) this.digitalIconTag.innerText = '🟣';
      if (this.digitalTitleTag) this.digitalTitleTag.innerText = 'Pago con Yape / Plin';
      if (this.digitalHintTag) this.digitalHintTag.innerText = 'Pide al cliente escanear el QR o transferir el monto exacto.';
      if (this.digitalRefInput) this.digitalRefInput.placeholder = 'N° de Operación (Ej. 849201)';
    } else if (method === 'card') {
      this.btnPayCard?.classList.add('active');
      this.cashPaymentSection?.classList.add('d-none');
      this.digitalPaymentSection?.classList.remove('d-none');
      if (this.digitalIconTag) this.digitalIconTag.innerText = '💳';
      if (this.digitalTitleTag) this.digitalTitleTag.innerText = 'Pago con Tarjeta POS';
      if (this.digitalHintTag) this.digitalHintTag.innerText = 'Pasa la tarjeta por el POS (Visa, Mastercard, Débito).';
      if (this.digitalRefInput) this.digitalRefInput.placeholder = 'Últimos 4 dígitos o Código de Auth';
    }
    this.recalcChange();
  }

  recalcChange() {
    const total = this.calcTotal();
    if (this.digitalExactBadge) {
      this.digitalExactBadge.innerText = `Monto Exacto: S/ ${total.toFixed(2)}`;
    }
    const rec = parseFloat(this.cashInput?.value || 0);
    const diff = Math.max(0, rec - total);
    if (this.changeEl) this.changeEl.innerText = `S/ ${diff.toFixed(2)}`;
  }

  updateUi() {
    this.saveCartToStorage();
    if (!this.itemsScroll) return;

    if (this.order.length === 0) {
      this.itemsScroll.innerHTML = `
        <div class="empty-ticket-view">
          <span style="font-size: 36px; display:block; margin-bottom:8px;">🛒</span>
          <p><strong>El carrito está vacío.</strong></p>
          <small>Presiona [F2] o toca "Agregar" en una medicina.</small>
        </div>
      `;
      if (this.changeEl) this.changeEl.innerText = "S/ 0.00";
    } else {
      this.itemsScroll.innerHTML = this.order.map((item, index) => `
        <div class="ticket-item-row">
          <div class="item-left-desc">
            <div class="i-name">${item.product.name}</div>
            <div class="i-sub">${item.label} • S/ ${item.price.toFixed(2)}</div>
          </div>
          <div class="item-qty-wrap">
            <button type="button" class="btn-item-qty" onclick="counterApp.updateQty(${index}, -1)" title="Disminuir">➖</button>
            <span class="item-qty-val">${item.qty}</span>
            <button type="button" class="btn-item-qty" onclick="counterApp.updateQty(${index}, 1)" title="Aumentar">➕</button>
          </div>
          <div class="item-subtotal-val">S/ ${(item.price * item.qty).toFixed(2)}</div>
        </div>
      `).join('');
    }

    const total = this.calcTotal();
    const base = total / 1.18;
    const igv = total - base;

    if (this.baseEl) this.baseEl.innerText = `S/ ${base.toFixed(2)}`;
    if (this.igvEl) this.igvEl.innerText = `S/ ${igv.toFixed(2)}`;
    if (this.totalEl) this.totalEl.innerText = `S/ ${total.toFixed(2)}`;

    const needsRx = this.order.some(i => i.product.prescriptionType !== 'free');
    if (this.rxAlert) {
      if (needsRx) this.rxAlert.classList.remove('d-none');
      else this.rxAlert.classList.add('d-none');
    }

    this.recalcChange();
  }

  toggleReceiptModal(open) {
    if (open) this.receiptModal?.classList.add('active');
    else this.receiptModal?.classList.remove('active');
  }

  showReceiptModal(sale) {
    if (!this.receiptModal || !this.receiptModalBody) return;

    const now = new Date(sale.createdAt || Date.now());
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const isFactura = sale.invoiceType === 'factura';
    const isBoleta = sale.invoiceType === 'boleta';
    const voucherLabel = isFactura
      ? 'FACTURA ELECTRÓNICA'
      : (isBoleta ? 'BOLETA DE VENTA ELECTRÓNICA' : 'TICKET DE VENTA');

    const tipoCpeSunat = isFactura ? '01' : (isBoleta ? '03' : '00');
    const series = sale.invoiceSeries || (isFactura ? 'F001' : (isBoleta ? 'B001' : 'T001'));
    const numberStr = String(sale.invoiceNumber || 1).padStart(6, '0');
    const isCancelled = sale.status === 'cancelled';

    let payLabel = 'EFECTIVO';
    if (sale.paymentMethod === 'yape') payLabel = 'YAPE / PLIN';
    else if (sale.paymentMethod === 'card') payLabel = 'TARJETA POS';
    if (sale.paymentReference) {
      payLabel += ` (Ref: ${sale.paymentReference})`;
    }

    const hashVal = sale.cpe?.hash || sale.hashCpe || 'N/A';
    const totalWords = sale.totalInWords || sale.cpe?.totalInWords || '';

    // Determinación de tipo de documento del cliente para QR SUNAT
    const cleanDoc = String(sale.customerDoc || '00000000').trim();
    const docTypeSunat = cleanDoc.length === 11 ? '6' : (cleanDoc.length === 8 ? '1' : '0');

    // Cadena técnica oficial para Código QR SUNAT
    const qrPayload = `20601234567|${tipoCpeSunat}|${series}|${numberStr}|${parseFloat(sale.igv || 0).toFixed(2)}|${parseFloat(sale.total || 0).toFixed(2)}|${isoDate}|${docTypeSunat}|${cleanDoc}|${hashVal}|`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=115x115&margin=2&data=${encodeURIComponent(qrPayload)}`;

    const itemsRows = (sale.items || []).map(item => {
      const fracLabel = item.fractionType === 'box' ? 'CJA' : (item.fractionType === 'blister' ? 'BLI' : 'UND');
      const unitPrice = parseFloat(item.unitPrice || 0).toFixed(2);
      const subtotal = parseFloat(item.subtotal || 0).toFixed(2);
      return `
        <tr>
          <td>
            <div><strong>${item.productName}</strong></div>
            <small style="color: #64748b;">${item.quantity} ${fracLabel} × S/ ${unitPrice} [Lote: ${item.lotNumber || 'FEFO'}]</small>
          </td>
          <td class="text-right" style="font-weight: 700;">
            S/ ${subtotal}
          </td>
        </tr>
      `;
    }).join('');

    this.receiptModalBody.innerHTML = `
      <div class="thermal-receipt" id="printableThermalReceipt">
        ${isCancelled ? `
          <div style="color: #dc2626; font-size: 14px; font-weight: 900; text-align: center; border: 2px dashed #dc2626; padding: 6px; margin-bottom: 10px; border-radius: 4px; background: #fef2f2;">
            ⚠️ *** COMPROBANTE ANULADO ***
          </div>
        ` : ''}

        <div class="receipt-header">
          <div class="receipt-logo-title">🏥 VALETEC PHARMA S.A.C.</div>
          <div class="receipt-meta-line">R.U.C. 20601234567</div>
          <div class="receipt-meta-line">Av. Aviación 2450 • San Borja, Lima</div>
          <div class="receipt-meta-line">Central Telefónica: (01) 500-8900</div>
          <div class="receipt-meta-line">Reg. Sanitario DIGEMID N° 10842-FAR</div>
        </div>

        <div class="receipt-dashed-line"></div>

        <div class="receipt-doc-title">${voucherLabel}</div>
        <div style="text-align: center; font-size: 15px; font-weight: 900; color: #0a2540; margin-bottom: 3px; ${isCancelled ? 'text-decoration: line-through; color: #dc2626;' : ''}">
          ${sale.correlative}
        </div>
        <div style="text-align: center; font-size: 10px; color: #0d9488; font-weight: 800; margin-bottom: 6px;">
          ✓ ESTÁNDAR SUNAT UBL 2.1
        </div>

        <div class="receipt-dashed-line"></div>

        <div class="receipt-info-grid">
          <div class="receipt-info-row">
            <span>Fecha/Hora:</span>
            <strong>${dateStr}</strong>
          </div>
          <div class="receipt-info-row">
            <span>Atendido por:</span>
            <span>${mockStaffProfiles[appNav?.currentRole || 'cashier']?.name || 'Cajero de Turno'}</span>
          </div>
          <div class="receipt-info-row">
            <span>Cliente:</span>
            <strong>${sale.customerName || 'CLIENTE GENERAL'}</strong>
          </div>
          <div class="receipt-info-row">
            <span>Doc. Identidad:</span>
            <span>${cleanDoc}</span>
          </div>
          <div class="receipt-info-row">
            <span>Forma de Pago:</span>
            <span style="font-weight: 700;">${payLabel}</span>
          </div>
          <div class="receipt-info-row">
            <span>Estado:</span>
            <span style="font-weight: 800; color: ${isCancelled ? '#dc2626' : '#166534'};">
              ${isCancelled ? '🔴 ANULADO' : '🟢 EMITIDO'}
            </span>
          </div>
        </div>

        <div class="receipt-dashed-line"></div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>DESCRIPCIÓN</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="receipt-dashed-line"></div>

        <div class="receipt-totals-box">
          <div class="receipt-total-row">
            <span>OP. GRAVADA:</span>
            <span>S/ ${parseFloat(sale.subtotal || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row">
            <span>I.G.V. (18%):</span>
            <span>S/ ${parseFloat(sale.igv || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row grand-total" style="${isCancelled ? 'text-decoration: line-through; color: #dc2626;' : ''}">
            <span>TOTAL A PAGAR:</span>
            <span>S/ ${parseFloat(sale.total || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row">
            <span>IMPORTE RECIBIDO:</span>
            <span>S/ ${parseFloat(sale.amountPaid || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row">
            <span>VUELTO:</span>
            <span style="font-weight: 700; color: #065f46;">S/ ${parseFloat(sale.changeGiven || 0).toFixed(2)}</span>
          </div>
        </div>

        ${totalWords ? `
          <div style="font-size: 10px; font-weight: 700; color: #334155; margin: 6px 0; text-transform: uppercase; line-height: 1.3;">
            SON: ${totalWords}
          </div>
        ` : ''}

        <div class="receipt-dashed-line"></div>

        <!-- Bloque de Firma Digital y Hash SHA-256 (SUNAT) -->
        <div class="receipt-hash-box">
          <div style="font-weight: 700; color: #475569; margin-bottom: 2px;">CÓDIGO HASH SHA-256 (CPE):</div>
          <code style="font-size: 9px; color: #0f172a; word-break: break-all;">${hashVal}</code>
        </div>

        <!-- Código QR Oficial SUNAT -->
        <div class="receipt-qr-box">
          <img 
            src="${qrUrl}" 
            alt="Código QR SUNAT" 
            style="width: 115px; height: 115px; display: block; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; background: #fff;"
          >
          <small style="font-size: 9px; color: #64748b; display: block; margin-top: 3px;">Consulta tu comprobante en www.sunat.gob.pe</small>
        </div>

        <div class="receipt-dashed-line"></div>

        <div class="receipt-footer">
          <div>Representación impresa autorizada de Comprobante de Pago Electrónico.</div>
          <div style="margin-top: 3px;">✅ Generado bajo normativa SUNAT UBL 2.1.</div>
          <div style="margin-top: 3px;">🛡️ Stock gestionado automáticamente por FEFO en PostgreSQL.</div>
          <div style="margin-top: 4px; font-weight: 700;">¡Gracias por cuidar tu salud en VALETEC PHARMA!</div>
        </div>
      </div>
    `;

    this.toggleReceiptModal(true);
  }

  async checkout() {
    // Hotfix V-02: Guard inmediato contra Double Submission (race condition con múltiples clics rápidos)
    if (this._checkoutInProgress) {
      showValetecToast("⚠️ Procesando venta... por favor espera.", "warning");
      return;
    }
    this._checkoutInProgress = true;

    if (this.order.length === 0) {
      this._checkoutInProgress = false;
      showValetecToast("El carrito está vacío. Agrega medicinas antes de cobrar.", "warning");
      return;
    }

    const needsRx = this.order.some(i => i.product.prescriptionType !== 'free');
    if (needsRx) {
      const cmp = this.docCmpInput?.value.trim();
      if (!cmp) {
        this._checkoutInProgress = false;
        showValetecToast("⚠️ ATENCIÓN: Esta orden contiene medicamentos bajo receta. Escribe el CMP médico.", "warning");
        this.docCmpInput?.focus();
        return;
      }
    }

    const total = this.calcTotal();
    const paymentMethod = this.currentPaymentMethod || 'cash';
    let paymentReference = null;
    let amountPaid = total;

    if (paymentMethod === 'cash') {
      const rec = parseFloat(this.cashInput?.value || 0);
      if (rec > 0 && rec < total) {
        this._checkoutInProgress = false;
        showValetecToast(`⚠️ Dinero insuficiente. Total: S/ ${total.toFixed(2)}, Recibido: S/ ${rec.toFixed(2)}. Faltan S/ ${(total - rec).toFixed(2)}.`, "warning");
        return;
      }
      amountPaid = rec > 0 ? rec : total;
    } else {
      paymentReference = this.digitalRefInput ? this.digitalRefInput.value.trim() : null;
      amountPaid = total;
    }


    const invoiceType = document.querySelector('input[name="orderVoucherType"]:checked')?.value || 'ticket';
    const customerDoc = this.patientInput?.value.trim() || '00000000';
    let customerName = 'CLIENTE GENERAL';
    const pNameEl = this.patientStatus?.querySelector('.p-name');
    if (pNameEl && pNameEl.innerText && !pNameEl.innerText.includes('Cliente General')) {
      customerName = pNameEl.innerText.replace('👤', '').trim();
    }

    const items = this.order.map(i => ({
      productId: i.product.id,
      fractionType: i.frac,
      quantity: i.qty,
      unitPrice: i.price
    }));

    const btn = this.btnCheckout;
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Descontando stock en PostgreSQL...`;

    try {
      let saleData;

      if (window.api && window.api.isConnected) {
        // Ejecución real contra el backend Node.js + PostgreSQL 16
        const res = await window.api.createSale({
          items,
          invoiceType,
          customerDoc,
          customerName,
          paymentMethod,
          paymentReference,
          amountPaid
        });

        if (!res || !res.success) {
          throw new Error(res?.message || "No se pudo procesar la venta.");
        }
        saleData = res.data;
      } else {
        // Modo contingencia local si backend no está conectado
        const series = invoiceType === 'factura' ? 'F001' : (invoiceType === 'boleta' ? 'B001' : 'T001');
        const num = Math.floor(1000 + Math.random() * 9000);
        const subtotal = Math.round((total / 1.18) * 100) / 100;
        const igv = Math.round((total - subtotal) * 100) / 100;
        const changeGiven = paymentMethod === 'cash' ? Math.max(0, Math.round((amountPaid - total) * 100) / 100) : 0;

        saleData = {
          saleId: Date.now(),
          correlative: `${series}-${String(num).padStart(6, '0')}`,
          invoiceSeries: series,
          invoiceNumber: num,
          invoiceType,
          customerDoc,
          customerName,
          paymentMethod,
          paymentReference,
          subtotal,
          igv,
          total,
          amountPaid,
          changeGiven,
          items: this.order.map(i => ({
            productName: i.product.name,
            fractionType: i.frac,
            quantity: i.qty,
            unitPrice: i.price,
            subtotal: i.price * i.qty,
            lotNumber: i.product.lotNumber || 'L-DEF'
          })),
          createdAt: new Date().toISOString()
        };
      }

      // Descontar inmediatamente del catálogo en memoria (Optimistic UI update - Fase 90%)
      if (Array.isArray(testPharmacyCatalog) && Array.isArray(this.order)) {
        this.order.forEach(item => {
          const p = testPharmacyCatalog.find(prod => prod.id === item.product.id || prod.name === item.product.name);
          if (p) {
            if (item.frac === 'box') {
              p.stockBoxes = Math.max(0, (p.stockBoxes || 0) - item.qty);
              p.stockUnits = Math.max(0, (p.stockUnits || 0) - (item.qty * (p.unitsPerBox || 20)));
            } else if (item.frac === 'blister') {
              // Hotfix V-03: Se usaba p.blistersPerBox (indefinido → fallback 2, error 5×).
              // Correcto: usar p.unitsPerBlister que sí existe en el catálogo.
              const unitsPerBli = p.unitsPerBlister || (p.unitsPerBox ? Math.round(p.unitsPerBox / 10) : 10);
              p.stockUnits = Math.max(0, (p.stockUnits || 0) - Math.round(item.qty * unitsPerBli));
              p.stockBlisters = Math.floor(p.stockUnits / (p.unitsPerBlister || 10));
              p.stockBoxes = Math.floor(p.stockUnits / (p.unitsPerBox || 100));
            } else {
              p.stockUnits = Math.max(0, (p.stockUnits || 0) - item.qty);
              p.stockBoxes = Math.floor(p.stockUnits / (p.unitsPerBox || 20));
            }
          }
        });
      }

      // Actualizar inmediatamente Almacén y Mostrador en la interfaz
      if (window.warehouseApp) {
        window.warehouseApp.render();
        window.warehouseApp.loadFefoAlerts();
      }

      // Actualizar Módulo de Caja (Efectivo y Auditoría)
      if (window.cashApp) {
        if (paymentMethod === 'cash') {
          cashApp.cashSales = (cashApp.cashSales || 0) + total;
        } else {
          cashApp.digitalSales = (cashApp.digitalSales || 0) + total;
        }
        cashApp.calculateAudit();
      }

      // Actualizar Torre de Control Gerencial (Canvas y KPIs en tiempo real)
      if (window.managementApp) {
        window.managementApp.registerLocalSale(saleData);
      }

      // 1. Mostrar comprobante térmico en pantalla
      this.showReceiptModal(saleData);

      // 2. Limpiar orden y campos de entrada
      this.order = [];
      if (this.cashInput) this.cashInput.value = '';
      if (this.digitalRefInput) this.digitalRefInput.value = '';
      if (this.docCmpInput) this.docCmpInput.value = '';
      if (this.patientInput) this.patientInput.value = '';
      if (this.patientStatus) {
        this.patientStatus.innerHTML = `
          <span class="p-name">👤 Cliente General</span>
          <span class="p-points"><i class="bi bi-star-fill text-warning"></i> 0 Puntos</span>
        `;
      }
      this.setPaymentMethod('cash');
      this.updateUi();

      // 3. Sincronizar nuevo stock FEFO y saldo de caja con PostgreSQL
      if (window.api && window.api.isConnected) {
        await syncWithBackend();
      }

      // 4. Si el historial de ventas está abierto, recargarlo
      if (this.salesHistoryModal?.classList.contains('active')) {
        this.loadSalesHistory();
      }

      showValetecToast(`¡Venta ${saleData.correlative} emitida con éxito!`, "success");
    } catch (err) {
      showValetecToast(`🚨 Error en la venta: ${err.message}`, "error");
      showValetecToast(err.message, "danger");
    } finally {
      // Hotfix V-02: Liberar el flag de protección contra double-submit
      this._checkoutInProgress = false;
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }

  // --- MÉTODOS DEL HISTORIAL DE VENTAS DEL TURNO & ANULACIÓN ---
  toggleSalesHistoryModal(open) {
    if (open) {
      this.salesHistoryModal?.classList.add('active');
    } else {
      this.salesHistoryModal?.classList.remove('active');
    }
  }

  async loadSalesHistory() {
    if (!this.salesHistoryTableBody) return;
    this.salesHistoryTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span> Consultando ventas registradas en PostgreSQL...</span>
        </td>
      </tr>
    `;

    try {
      let sales = [];
      if (window.api && window.api.isConnected) {
        const res = await window.api.getSales(60);
        if (res && res.success) {
          sales = res.data || [];
        }
      }

      this.cachedSalesList = sales;
      this.renderSalesHistoryRows(sales);
    } catch (err) {
      this.salesHistoryTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-3 text-danger">
            Error al consultar ventas: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  renderSalesHistoryRows(sales) {
    if (!this.salesHistoryTableBody) return;

    if (!sales || sales.length === 0) {
      this.salesHistoryTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            No se encontraron comprobantes de venta registrados.
          </td>
        </tr>
      `;
      return;
    }

    this.salesHistoryTableBody.innerHTML = sales.map(s => {
      const isCompleted = s.status === 'completed';
      const statusBadge = isCompleted
        ? `<span class="badge-sale-status completed">🟢 Completado</span>`
        : `<span class="badge-sale-status cancelled">🔴 Anulado</span>`;

      let payIcon = '💵';
      let payLabel = 'Efectivo';
      if (s.paymentMethod === 'yape') {
        payIcon = '🟣';
        payLabel = s.paymentReference ? `Yape (${s.paymentReference})` : 'Yape / Plin';
      } else if (s.paymentMethod === 'card') {
        payIcon = '💳';
        payLabel = s.paymentReference ? `Tarjeta (${s.paymentReference})` : 'Tarjeta POS';
      }

      const totalNum = parseFloat(s.total || 0).toFixed(2);
      const correlativeStr = s.correlative || `${s.invoiceSeries}-${String(s.invoiceNumber).padStart(6, '0')}`;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; ${!isCompleted ? 'background: #fff5f5; color: #94a3b8;' : ''}">
          <td style="padding: 10px 12px;">
            <strong style="${!isCompleted ? 'text-decoration: line-through;' : ''}">${escHtml(correlativeStr)}</strong>
            <span style="font-size: 10.5px; display: block; color: #64748b; text-transform: uppercase;">${escHtml(s.invoiceType)}</span>
          </td>
          <td style="padding: 10px 8px; white-space: nowrap;">
            <small>${escHtml(s.createdAt || 'Hoy')}</small>
          </td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: 600; color: #1e293b;">${escHtml(s.customerName || 'CLIENTE GENERAL')}</div>
            <small class="text-muted">${escHtml(s.customerDoc || '00000000')}</small>
          </td>
          <td style="padding: 10px 8px;">
            <span>${payIcon} ${escHtml(payLabel)}</span>
          </td>
          <td style="padding: 10px 12px; text-align: right;">
            <strong style="font-size: 13px; color: ${isCompleted ? '#0f172a' : '#94a3b8'}; ${!isCompleted ? 'text-decoration: line-through;' : ''}">
              S/ ${totalNum}
            </strong>
          </td>
          <td style="padding: 10px 8px; text-align: center;">
            ${statusBadge}
          </td>
          <td style="padding: 10px 12px; text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button 
                type="button" 
                class="btn-action-outline" 
                style="padding: 3px 8px; font-size: 11.5px;" 
                onclick="counterApp.reprintSale(${s.id})" 
                title="Ver e imprimir ticket térmico"
              >
                🖨️ Ticket
              </button>
              ${isCompleted ? `
                <button 
                  type="button" 
                  class="btn-action-outline" 
                  style="padding: 3px 8px; font-size: 11.5px; border-color: #fca5a5; color: #dc2626;" 
                  onclick="counterApp.cancelHistoricalSale(${s.id}, '${correlativeStr}', ${s.total})" 
                  title="Anular comprobante y devolver medicamentos a almacén"
                >
                  ❌ Anular
                </button>
              ` : `
                <button 
                  type="button" 
                  class="btn-action-outline" 
                  style="padding: 3px 8px; font-size: 11.5px; opacity: 0.4; cursor: not-allowed;" 
                  disabled 
                  title="Comprobante ya fue anulado"
                >
                  🚫 Anulado
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async reprintSale(saleId) {
    try {
      let saleData = null;
      if (window.api && window.api.isConnected) {
        const res = await window.api.getSaleById(saleId);
        if (res && res.success) {
          saleData = res.data;
        }
      }
      if (!saleData) {
        showValetecToast("No se pudo cargar la información del comprobante.", "warning");
        return;
      }
      this.showReceiptModal(saleData);
    } catch (err) {
      showValetecToast("Error al cargar comprobante: " + err.message, "error");
    }
  }

  async cancelHistoricalSale(saleId, correlative, total) {
    const confirmed = confirm(
      `🚨 ATENCIÓN - ANULACIÓN DE COMPROBANTE\n\n¿Confirmas la anulación del comprobante ${correlative} por el total de S/ ${parseFloat(total).toFixed(2)}?\n\n• El stock será devuelto inmediatamente a los lotes FEFO en PostgreSQL.\n• El monto será deducido automáticamente de la caja del turno.\n\nEsta operación es definitiva e irreversible.`
    );
    if (!confirmed) return;

    try {
      if (window.api && window.api.isConnected) {
        const res = await window.api.cancelSale(saleId);
        if (res && res.success) {
          showValetecToast(`Comprobante ${correlative} anulado exitosamente. Stock restituido.`, "success");
          // Recargar el historial
          await this.loadSalesHistory();
          // Sincronizar catálogo y caja
          await syncWithBackend();
        } else {
          throw new Error(res?.message || "No se pudo anular la venta.");
        }
      } else {
        showValetecToast("Debes estar conectado a la API de PostgreSQL para anular ventas con deducción.", "warning");
      }
    } catch (err) {
      showValetecToast(`🚨 Error al anular la venta: ${err.message}`, "error");
    }
  }
}

// =============================================================
// 7. MÓDULO CONTROL DE CAJA & ARQUEO DE TURNO
// =============================================================
class CashModule {
  constructor() {
    this.openingBalance = 250.00;
    this.cashSales = 1840.50;
    this.expenses = 85.00;

    this.cacheDom();
    this.initEvents();
    this.calculateAudit();
  }

  cacheDom() {
    this.denomFields = document.querySelectorAll('.denom-field');
    this.countedDisplay = document.getElementById('countedCashDisplay');
    this.expectedDisplay = document.getElementById('expectedAuditDisplay');
    this.drawerExpected = document.getElementById('cashExpectedDrawer');
    this.statusBanner = document.getElementById('cuadreStatusBanner');

    // Modal de apertura de turno
    this.openShiftModal = document.getElementById('openShiftModal');
    this.btnOpenShiftModal = document.getElementById('btnOpenShiftModal');
    this.btnCloseOpenShiftModal = document.getElementById('btnCloseOpenShiftModal');
    this.btnCancelOpenShift = document.getElementById('btnCancelOpenShift');
    this.btnConfirmOpenShift = document.getElementById('btnConfirmOpenShift');
    this.openShiftBalanceInput = document.getElementById('openShiftBalanceInput');
    this.openShiftTerminalInput = document.getElementById('openShiftTerminalInput');

    // Metadatos dinámicos y tabla de egresos del turno
    this.cashOpeningMeta = document.getElementById('cashOpeningMeta');
    this.cashShiftCashier = document.getElementById('cashShiftCashier');
    this.cashShiftSupervisor = document.getElementById('cashShiftSupervisor');
    this.cashShiftVouchersCount = document.getElementById('cashShiftVouchersCount');
    this.cashMovementsTableBody = document.getElementById('cashMovementsTableBody');
    this.cashMovementsCountBadge = document.getElementById('cashMovementsCountBadge');

    // Modal de egreso menor
    this.expenseModal = document.getElementById('expenseModal');
    this.btnOpenExp = document.getElementById('btnOpenExpenseModal');
    this.btnCloseExp = document.getElementById('btnCloseExpenseModal');
    this.btnCancelExp = document.getElementById('btnCancelExpense');
    this.btnSaveExp = document.getElementById('btnSaveExpense');
    this.expAmountInput = document.getElementById('expenseAmountInput');
    this.expConceptSelect = document.getElementById('expenseConceptSelect');
    this.expDetailInput = document.getElementById('expenseDetailInput');

    // Modal de Reporte Z Oficial de Cierre de Caja
    this.zReportModal = document.getElementById('zReportModal');
    this.zReportModalBody = document.getElementById('zReportModalBody');
    this.btnCloseZReportModal = document.getElementById('btnCloseZReportModal');
    this.btnCloseZReportBtn = document.getElementById('btnCloseZReportBtn');
    this.btnPrintZReportBtn = document.getElementById('btnPrintZReportBtn');

    // Panel Interactivo de Auditoría y Verificación de Cierre Z (v4.1)
    this.zAuditBox = document.getElementById('zAuditVerificationBox');
    this.zExpectedDisplay = document.getElementById('zExpectedCashDisplay');
    this.zCountedInput = document.getElementById('zCountedCashInput');
    this.zDiffBanner = document.getElementById('zLiveDiffBanner');
    this.zDiffIcon = document.getElementById('zLiveDiffIcon');
    this.zDiffTitle = document.getElementById('zLiveDiffTitle');
    this.zDiffDesc = document.getElementById('zLiveDiffDesc');
    this.btnConfirmZAction = document.getElementById('btnConfirmZCloseAction');
    this.zPrintableContainer = document.getElementById('zPrintableContainer');
  }

  initEvents() {
    this.denomFields.forEach(f => {
      f.addEventListener('input', () => this.calculateAudit());
    });

    // Eventos de apertura de turno
    if (this.btnOpenShiftModal) this.btnOpenShiftModal.addEventListener('click', () => this.toggleOpenShiftModal(true));
    if (this.btnCloseOpenShiftModal) this.btnCloseOpenShiftModal.addEventListener('click', () => this.toggleOpenShiftModal(false));
    if (this.btnCancelOpenShift) this.btnCancelOpenShift.addEventListener('click', () => this.toggleOpenShiftModal(false));

    if (this.btnConfirmOpenShift) {
      this.btnConfirmOpenShift.addEventListener('click', async () => {
        const val = parseFloat(this.openShiftBalanceInput?.value || 0);
        if (isNaN(val) || val < 0) {
          showValetecToast("Ingresa un monto válido para el fondo de apertura (mayor o igual a S/ 0.00).", "warning");
          return;
        }
        const terminal = this.openShiftTerminalInput?.value || 'Caja 01';

        const confirmBtn = this.btnConfirmOpenShift;
        const origText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `<span><span class="spinner-border spinner-border-sm"></span> Abriendo Turno...</span>`;

        try {
          if (window.api && window.api.isConnected) {
            const res = await window.api.openCashShift({
              openingBalance: val,
              terminal
            });
            if (res && res.success) {
              this.toggleOpenShiftModal(false);
              await syncWithBackend();
              showValetecToast(`Turno de caja #${res.data.id} abierto exitosamente con fondo S/ ${val.toFixed(2)}.`, "success");
            } else {
              throw new Error(res?.message || "Error al abrir turno");
            }
          } else {
            this.openingBalance = val;
            this.cashSales = 0;
            this.digitalSales = 0;
            this.expenses = 0;
            this.toggleOpenShiftModal(false);
            this.calculateAudit();
            showValetecToast(`Turno local abierto con fondo S/ ${val.toFixed(2)}.`, "info");
          }
        } catch (err) {
          showValetecToast("Error al abrir turno de caja: " + err.message, "error");
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = origText;
        }
      });
    }

    if (this.btnOpenExp) this.btnOpenExp.addEventListener('click', () => this.toggleModal(true));
    if (this.btnCloseExp) this.btnCloseExp.addEventListener('click', () => this.toggleModal(false));
    if (this.btnCancelExp) this.btnCancelExp.addEventListener('click', () => this.toggleModal(false));

    if (this.btnSaveExp) {
      this.btnSaveExp.addEventListener('click', async () => {
        const val = parseFloat(this.expAmountInput?.value || 0);
        // Hotfix V-09: Validar también NaN (ocurre si el usuario pega texto en el campo).
        // Un NaN en expenses contaminaría todos los cálculos de cuadre con NaN.
        if (isNaN(val) || val <= 0) {
          showValetecToast("Ingresa un monto numérico válido mayor a S/ 0.00.", "warning");
          this.expAmountInput?.focus();
          return;
        }

        const detail = this.expDetailInput?.value?.trim();
        const motive = this.expConceptSelect?.value || 'gasto';
        const concept = detail ? `${detail} (${motive})` : `Gasto autorizado de caja chica (${motive})`;
        const responsible = mockStaffProfiles[appNav?.currentRole || 'cashier']?.name || 'Rodrigo Soto';

        try {
          if (window.api && window.api.isConnected) {
            await window.api.addCashMovement({
              amount: val,
              concept,
              responsible,
              type: 'egreso'
            });
            await syncWithBackend();
          } else {
            this.expenses += val;
            this.calculateAudit();
          }

          if (this.expAmountInput) this.expAmountInput.value = '';
          if (this.expDetailInput) this.expDetailInput.value = '';
          this.toggleModal(false);
          showValetecToast(`Salida de S/ ${val.toFixed(2)} registrada en PostgreSQL.`, "warning");
        } catch (err) {
          showValetecToast("Error guardando salida de caja: " + err.message, "error");
        }
      });
    }

    // Botón de Cierre Z Oficial (v4.1 - Auditoría Interactiva)
    document.getElementById('btnTriggerZClose')?.addEventListener('click', () => {
      const physical = this.calcPhysicalTotal();
      const expected = (this.openingBalance + this.cashSales) - this.expenses;

      if (this.zExpectedDisplay) {
        this.zExpectedDisplay.innerText = `S/ ${expected.toFixed(2)}`;
      }
      if (this.zCountedInput) {
        this.zCountedInput.value = physical.toFixed(2);
      }
      if (this.zPrintableContainer) {
        this.zPrintableContainer.innerHTML = '';
      }
      if (this.zAuditBox) {
        this.zAuditBox.style.display = 'block';
      }
      if (this.btnConfirmZAction) {
        this.btnConfirmZAction.disabled = false;
        this.btnConfirmZAction.innerHTML = `<i class="bi bi-shield-lock-fill"></i> <span>🔒 Sellar Turno y Emitir Reporte Z</span>`;
      }

      this.updateZLiveDiff();
      this.toggleZModal(true);
    });

    // Oyente en tiempo real para recálculo de diferencia en el modal de cierre
    if (this.zCountedInput) {
      this.zCountedInput.addEventListener('input', () => this.updateZLiveDiff());
    }

    // Botón de sellado final del Cierre Z en el modal
    if (this.btnConfirmZAction) {
      this.btnConfirmZAction.addEventListener('click', () => this.finalizeZClose());
    }

    // Eventos del modal de Reporte Z
    if (this.btnCloseZReportModal) this.btnCloseZReportModal.addEventListener('click', () => this.toggleZModal(false));
    if (this.btnCloseZReportBtn) this.btnCloseZReportBtn.addEventListener('click', () => this.toggleZModal(false));
    if (this.btnPrintZReportBtn) this.btnPrintZReportBtn.addEventListener('click', () => window.print());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.zReportModal?.classList.contains('active')) {
        this.toggleZModal(false);
      }
    });
  }

  updateZLiveDiff() {
    const expected = (this.openingBalance + this.cashSales) - this.expenses;
    const counted = parseFloat(this.zCountedInput?.value || 0);
    const diff = Math.round((counted - expected) * 100) / 100;

    if (this.zExpectedDisplay) {
      this.zExpectedDisplay.innerText = `S/ ${expected.toFixed(2)}`;
    }

    if (this.zDiffBanner) {
      if (Math.abs(diff) < 0.05) {
        this.zDiffBanner.className = 'z-diff-indicator cuadre-diff-exact';
        if (this.zDiffIcon) this.zDiffIcon.className = 'bi bi-check-circle-fill text-success';
        if (this.zDiffTitle) this.zDiffTitle.innerText = `✅ CUADRE PERFECTO: S/ 0.00`;
        if (this.zDiffDesc) this.zDiffDesc.innerText = `El efectivo ingresado coincide exactamente con las ventas registradas.`;
      } else if (diff > 0) {
        this.zDiffBanner.className = 'z-diff-indicator cuadre-diff-surplus';
        if (this.zDiffIcon) this.zDiffIcon.className = 'bi bi-info-circle-fill text-warning';
        if (this.zDiffTitle) this.zDiffTitle.innerText = `⚠️ SOBRANTE CONTROLADO: +S/ ${diff.toFixed(2)}`;
        if (this.zDiffDesc) this.zDiffDesc.innerText = `Hay un excedente de efectivo en gaveta respecto al cálculo teórico.`;
      } else {
        this.zDiffBanner.className = 'z-diff-indicator cuadre-diff-deficit';
        if (this.zDiffIcon) this.zDiffIcon.className = 'bi bi-exclamation-triangle-fill text-danger';
        if (this.zDiffTitle) this.zDiffTitle.innerText = `🚨 FALTANTE EN CAJA: -S/ ${Math.abs(diff).toFixed(2)}`;
        if (this.zDiffDesc) this.zDiffDesc.innerText = `Alerta: El dinero físico es menor al esperado por el total de ventas.`;
      }
    }

    return { expected, counted, diff };
  }

  async finalizeZClose() {
    const audit = this.updateZLiveDiff();
    const physical = audit.counted;
    const expected = audit.expected;
    const diff = audit.diff;

    // Hotfix V-08: Rechazar valores inválidos (NaN o negativos) antes de sellar el turno.
    // Previene Cierre Z sellado con datos matemáticamente corruptos.
    if (isNaN(physical) || physical < 0) {
      showValetecToast("⚠️ Ingresa un monto válido de efectivo físico (mayor o igual a S/ 0.00) antes de sellar el turno.", "warning");
      this.zCountedInput?.focus();
      return;
    }

    const confirmBtn = this.btnConfirmZAction;
    const origText = confirmBtn ? confirmBtn.innerHTML : '';
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span><span class="spinner-border spinner-border-sm"></span> Sellando Cierre Z...</span>`;
    }

    try {
      if (window.api && window.api.isConnected) {
        const res = await window.api.closeZShift({
          countedBalance: physical,
          shiftId: this.currentShift?.id,
          denominations: this.getDenominationsObject()
        });

        if (res && res.success) {
          this.showZReportModal(res.data);
          await syncWithBackend();
          showValetecToast("¡Cierre Z Oficial sellado en PostgreSQL!", "success");
        } else {
          throw new Error(res?.message || "Error al procesar Cierre Z.");
        }
      } else {
        const localReport = {
          turnoId: this.currentShift?.id || 1,
          terminal: this.currentShift?.terminal || 'Caja 01',
          cashierName: mockStaffProfiles[appNav?.currentRole || 'cashier']?.name || 'Rodrigo Soto',
          openedAt: this.currentShift?.openedAt || new Date(Date.now() - 28800000).toISOString(),
          closedAt: new Date().toISOString(),
          openingBalance: this.openingBalance,
          cashSales: this.cashSales,
          digitalSales: this.digitalSales || 0,
          expenses: this.expenses,
          expectedBalance: expected,
          countedBalance: physical,
          difference: diff,
          auditStatus: Math.abs(diff) < 0.1 ? 'exacto' : (diff > 0 ? 'sobrante' : 'faltante'),
          vouchers: {
            total: 142,
            tickets: 98,
            boletas: 36,
            facturas: 8,
            taxableBase: Math.round(((this.cashSales) / 1.18) * 100) / 100,
            totalIgv: Math.round((this.cashSales - (this.cashSales / 1.18)) * 100) / 100,
            grandTotal: this.cashSales
          }
        };
        this.showZReportModal(localReport);
        showValetecToast("Cierre Z completado exitosamente.", "success");
      }

      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i> <span>✅ Cierre Z Sellado Conforme</span>`;
      }
    } catch (err) {
      showValetecToast("🚨 Error en cierre Z: " + err.message, "error");
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = origText;
      }
    }
  }

  toggleOpenShiftModal(open) {
    if (open) this.openShiftModal?.classList.add('active');
    else this.openShiftModal?.classList.remove('active');
  }

  toggleModal(open) {
    if (open) this.expenseModal?.classList.add('active');
    else this.expenseModal?.classList.remove('active');
  }

  toggleZModal(open) {
    if (open) this.zReportModal?.classList.add('active');
    else this.zReportModal?.classList.remove('active');
  }

  updateFromBackend(cashData) {
    if (!cashData) return;

    if (cashData.shift) {
      const s = cashData.shift;
      this.currentShift = s;
      this.openingBalance = parseFloat(s.openingBalance) || 0;
      this.cashSales = parseFloat(s.cashSales) || 0;
      this.digitalSales = parseFloat(s.digitalSales) || 0;
      this.expenses = parseFloat(s.expenses) || 0;
      this.expectedBalance = parseFloat(s.expectedBalance) || 0;

      // Actualizar visibilidad de botones de acción
      if (this.btnOpenShiftModal) this.btnOpenShiftModal.style.display = 'none';
      if (this.btnOpenExp) this.btnOpenExp.style.display = 'inline-flex';
      const triggerBtn = document.getElementById('btnTriggerZClose');
      if (triggerBtn) triggerBtn.style.display = 'inline-flex';

      // Meta de apertura
      if (this.cashOpeningMeta) {
        const d = new Date(s.openedAt);
        const timeStr = !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
        this.cashOpeningMeta.innerHTML = `<i class="bi bi-clock-history text-teal"></i> Turno #${s.id} • ${timeStr ? 'Apertura: ' + timeStr : 'Abierto'}`;
      }

      // Metadatos de auditoría
      if (this.cashShiftCashier) this.cashShiftCashier.innerText = s.cashierName || 'Cajero de Turno';
      if (this.cashShiftVouchersCount && cashData.salesSummary) {
        this.cashShiftVouchersCount.innerText = `${cashData.salesSummary.totalVouchers || 0} comprobantes`;
      }

      // Renderizar movimientos del turno
      this.renderMovements(cashData.movements || []);
      this.calculateAudit();
    } else {
      // Caja cerrada sin turno
      this.currentShift = null;
      this.openingBalance = 0;
      this.cashSales = 0;
      this.digitalSales = 0;
      this.expenses = 0;
      this.expectedBalance = 0;

      if (this.btnOpenShiftModal) this.btnOpenShiftModal.style.display = 'inline-flex';
      if (this.btnOpenExp) this.btnOpenExp.style.display = 'none';
      const triggerBtn = document.getElementById('btnTriggerZClose');
      if (triggerBtn) triggerBtn.style.display = 'none';

      if (this.cashOpeningMeta) {
        this.cashOpeningMeta.innerHTML = `<i class="bi bi-lock-fill text-danger"></i> <span class="text-danger">Caja Cerrada (Sin Turno)</span>`;
      }

      if (this.statusBanner) {
        this.statusBanner.className = 'cuadre-status-banner';
        this.statusBanner.style.backgroundColor = '#f1f5f9';
        this.statusBanner.style.borderColor = '#cbd5e1';
        this.statusBanner.style.color = '#475569';
        this.statusBanner.innerHTML = `
          <i class="bi bi-lock-fill"></i>
          <div>
            <strong>TURNO DE CAJA CERRADO</strong>
            <p>Haz clic en "Iniciar Turno" para asignar el fondo inicial y comenzar a cobrar.</p>
          </div>
        `;
      }

      this.renderMovements([]);
      this.calculateAudit();
    }
  }

  renderMovements(movements) {
    if (!this.cashMovementsTableBody) return;
    if (this.cashMovementsCountBadge) {
      this.cashMovementsCountBadge.innerText = `${movements.length} movimiento${movements.length !== 1 ? 's' : ''}`;
    }

    if (!movements || movements.length === 0) {
      this.cashMovementsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">
            No hay egresos registrados en este turno.
          </td>
        </tr>
      `;
      return;
    }

    this.cashMovementsTableBody.innerHTML = movements.map(m => {
      const d = new Date(m.createdAt || m.created_at);
      const timeStr = !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '--:--';
      const isEgreso = (m.type || 'egreso') === 'egreso';
      const badgeStyle = isEgreso
        ? 'background: #fef2f2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;'
        : 'background: #f0fdf4; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;';
      const amountColor = isEgreso ? '#991b1b' : '#166534';
      const prefix = isEgreso ? '-S/ ' : '+S/ ';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 12px; color: #64748b; font-family: monospace;">${timeStr}</td>
          <td style="padding: 8px 12px;"><span style="${badgeStyle}">${(m.type || 'egreso').toUpperCase()}</span></td>
          <td style="padding: 8px 12px; font-weight: 500; color: #1e293b;">${m.concept || 'Gasto operativo'}</td>
          <td style="padding: 8px 12px; color: #64748b;">${m.responsible || 'Cajero'}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: ${amountColor};">
            ${prefix}${parseFloat(m.amount || 0).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');
  }

  calcPhysicalTotal() {
    let physical = 0;
    this.denomFields.forEach(f => {
      const denom = parseFloat(f.dataset.val);
      const count = parseInt(f.value || 0, 10);
      physical += (denom * count);
    });
    return Math.round(physical * 100) / 100;
  }

  getDenominationsObject() {
    const denoms = {};
    this.denomFields.forEach(f => {
      denoms[`val_${f.dataset.val}`] = parseInt(f.value || 0, 10);
    });
    return denoms;
  }

  calculateAudit() {
    let physical = 0;
    this.denomFields.forEach(f => {
      const denom = parseFloat(f.dataset.val);
      const count = parseInt(f.value || 0, 10);
      const sub = denom * count;
      const cell = f.closest('tr')?.querySelector('.denom-cell');
      if (cell) cell.innerText = `S/ ${sub.toFixed(2)}`;
      physical += sub;
    });

    physical = Math.round(physical * 100) / 100;
    const expected = Math.round(((this.openingBalance + this.cashSales) - this.expenses) * 100) / 100;

    if (this.drawerExpected) this.drawerExpected.innerText = `S/ ${expected.toFixed(2)}`;
    if (this.countedDisplay) this.countedDisplay.innerText = `S/ ${physical.toFixed(2)}`;
    if (this.expectedDisplay) this.expectedDisplay.innerText = `S/ ${expected.toFixed(2)}`;

    // Actualizar también tarjetas de KPI de caja
    const openFundEl = document.getElementById('cashOpeningFund');
    const cashSalesEl = document.getElementById('cashCashSales');
    const digSalesEl = document.getElementById('cashDigitalSales');
    if (openFundEl) openFundEl.innerText = `S/ ${this.openingBalance.toFixed(2)}`;
    if (cashSalesEl) cashSalesEl.innerText = `S/ ${this.cashSales.toFixed(2)}`;
    if (digSalesEl && this.digitalSales !== undefined) digSalesEl.innerText = `S/ ${Number(this.digitalSales).toFixed(2)}`;

    const diff = Math.round((physical - expected) * 100) / 100;
    if (this.statusBanner) {
      if (Math.abs(diff) < 0.1) {
        this.statusBanner.className = 'cuadre-status-banner cuadre-diff-exact';
        this.statusBanner.removeAttribute('style');
        this.statusBanner.innerHTML = `
          <i class="bi bi-check-circle-fill text-success" style="font-size: 18px;"></i>
          <div>
            <strong>¡CUADRE PERFECTO!</strong>
            <p>Diferencia: S/ 0.00. La gaveta física coincide exactamente con las ventas.</p>
          </div>
        `;
      } else if (diff < 0) {
        this.statusBanner.className = 'cuadre-status-banner cuadre-diff-deficit';
        this.statusBanner.removeAttribute('style');
        this.statusBanner.innerHTML = `
          <i class="bi bi-exclamation-triangle-fill text-danger" style="font-size: 18px;"></i>
          <div>
            <strong class="text-danger">FALTANTE EN CAJA: -S/ ${Math.abs(diff).toFixed(2)}</strong>
            <p>Alerta: Hay menos dinero en gaveta del registrado por el sistema.</p>
          </div>
        `;
      } else {
        this.statusBanner.className = 'cuadre-status-banner cuadre-diff-surplus';
        this.statusBanner.removeAttribute('style');
        this.statusBanner.innerHTML = `
          <i class="bi bi-info-circle-fill text-warning" style="font-size: 18px;"></i>
          <div>
            <strong class="text-warning">SOBRANTE EN CAJA: +S/ ${diff.toFixed(2)}</strong>
            <p>Hay más dinero físico en gaveta del registrado.</p>
          </div>
        `;
      }
    }
  }

  printAuditTicket() {
    let physical = 0;
    const fields = document.querySelectorAll('.denom-field');
    fields.forEach(f => {
      const v = parseFloat(f.dataset.val) || 0;
      const c = parseInt(f.value) || 0;
      physical += v * c;
    });
    const expected = this.openingBalance + this.cashSales - this.expenses;
    const diff = physical - expected;
    const report = {
      turnoId: this.currentShift?.id || 17,
      terminal: this.currentShift?.terminal || 'Caja 01',
      cashier: this.currentShift?.cashierName || 'Rodrigo Soto',
      openedAt: this.currentShift?.openedAt || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      openingBalance: this.openingBalance,
      cashSales: this.cashSales,
      digitalSales: this.digitalSales,
      expenses: this.expenses,
      expectedBalance: expected,
      countedBalance: physical,
      difference: diff,
      auditStatus: Math.abs(diff) < 0.1 ? 'exacto' : (diff > 0 ? 'sobrante' : 'faltante'),
      vouchers: {
        total: 142,
        tickets: 98,
        boletas: 36,
        facturas: 8,
        taxableBase: Math.round(((this.cashSales) / 1.18) * 100) / 100,
        totalIgv: Math.round((this.cashSales - (this.cashSales / 1.18)) * 100) / 100,
        grandTotal: this.cashSales
      }
    };
    this.showZReportModal(report);
    showValetecToast("Abriendo comprobante térmico de arqueo...", "info");
  }

  showZReportModal(report) {
    if (!this.zReportModal || !this.zReportModalBody) return;

    const pad = (n) => n.toString().padStart(2, '0');
    const now = new Date(report.closedAt || Date.now());
    const closeStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const openDate = new Date(report.openedAt || Date.now());
    const openStr = `${pad(openDate.getDate())}/${pad(openDate.getMonth() + 1)}/${now.getFullYear()} ${pad(openDate.getHours())}:${pad(openDate.getMinutes())}`;

    let statusLabel = '✅ CUADRE PERFECTO (S/ 0.00)';
    let statusStyle = 'color: #065f46; font-weight: 800;';
    if (report.difference < 0) {
      statusLabel = `❌ FALTANTE EN GAVETA: -S/ ${Math.abs(report.difference).toFixed(2)}`;
      statusStyle = 'color: #991b1b; font-weight: 800;';
    } else if (report.difference > 0) {
      statusLabel = `⚠️ SOBRANTE EN GAVETA: +S/ ${report.difference.toFixed(2)}`;
      statusStyle = 'color: #92400e; font-weight: 800;';
    }

    const totalRevenue = parseFloat((report.cashSales || 0) + (report.digitalSales || 0)).toFixed(2);

    const targetContainer = this.zPrintableContainer || this.zReportModalBody;
    targetContainer.innerHTML = `
      <div class="thermal-receipt" id="printableZReportReceipt">
        <div class="receipt-header">
          <div class="receipt-logo-title">🏥 VALETEC PHARMA S.A.C.</div>
          <div class="receipt-meta-line">R.U.C. 20601234567</div>
          <div class="receipt-meta-line">Av. Aviación 2450 • San Borja, Lima</div>
          <div class="receipt-meta-line">Central: (01) 500-8900 • DIGEMID: 10842-FAR</div>
        </div>

        <div class="receipt-dashed-line"></div>

        <div class="receipt-doc-title">🔒 REPORTE Z OFICIAL DE CIERRE</div>
        <div style="text-align: center; font-size: 13px; font-weight: 800; color: #0a2540;">
          TURNO N° ${String(report.turnoId).padStart(4, '0')} • ${report.terminal || 'Caja 01'}
        </div>

        <div class="receipt-dashed-line"></div>

        <div class="receipt-info-grid">
          <div class="receipt-info-row">
            <span>Cajero Responsable:</span>
            <strong>${report.cashierName}</strong>
          </div>
          <div class="receipt-info-row">
            <span>Apertura de Turno:</span>
            <span>${openStr}</span>
          </div>
          <div class="receipt-info-row">
            <span>Cierre Z Sellado:</span>
            <strong>${closeStr}</strong>
          </div>
        </div>

        <div class="receipt-dashed-line"></div>

        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: #0a2540;">
          📊 RESUMEN DE VENTAS Y FACTURACIÓN
        </div>
        <div class="receipt-totals-box">
          <div class="receipt-total-row">
            <span>(+) Fondo de Apertura:</span>
            <span>S/ ${parseFloat(report.openingBalance || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row">
            <span>(+) Ventas Efectivo:</span>
            <span style="font-weight: 700;">S/ ${parseFloat(report.cashSales || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row">
            <span>(+) Ventas Digitales (POS/Yape):</span>
            <span>S/ ${parseFloat(report.digitalSales || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row" style="font-weight: 800; border-top: 1px dashed #cbd5e1; padding-top: 2px;">
            <span>(=) TOTAL FACTURADO:</span>
            <span style="color: #065f46;">S/ ${totalRevenue}</span>
          </div>
          <div class="receipt-total-row">
            <span>(-) Salidas / Egresos:</span>
            <span style="color: #991b1b;">-S/ ${parseFloat(report.expenses || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="receipt-dashed-line"></div>

        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: #0a2540;">
          🧮 AUDITORÍA Y ARQUEO DE GAVETA
        </div>
        <div class="receipt-totals-box">
          <div class="receipt-total-row">
            <span>Saldo Esperado en Sistema:</span>
            <strong>S/ ${parseFloat(report.expectedBalance || 0).toFixed(2)}</strong>
          </div>
          <div class="receipt-total-row">
            <span>Dinero Físico en Gaveta:</span>
            <strong>S/ ${parseFloat(report.countedBalance || 0).toFixed(2)}</strong>
          </div>
          <div class="receipt-total-row grand-total" style="text-align: center;">
            <span style="width: 100%; text-align: center; ${statusStyle}">
              ${statusLabel}
            </span>
          </div>
        </div>

        <div class="receipt-dashed-line"></div>

        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: #0a2540;">
          🧾 COMPROBANTES FISCALES EMITIDOS
        </div>
        <div class="receipt-totals-box">
          <div class="receipt-total-row">
            <span>Tickets de Venta:</span>
            <span>${report.vouchers?.tickets || 0}</span>
          </div>
          <div class="receipt-total-row">
            <span>Boletas de Venta:</span>
            <span>${report.vouchers?.boletas || 0}</span>
          </div>
          <div class="receipt-total-row">
            <span>Facturas Emitidas:</span>
            <span>${report.vouchers?.facturas || 0}</span>
          </div>
          <div class="receipt-total-row" style="font-weight: 700;">
            <span>Total Comprobantes:</span>
            <span>${report.vouchers?.total || 0}</span>
          </div>
          <div class="receipt-total-row">
            <span>Base Imponible (Sin IGV):</span>
            <span>S/ ${parseFloat(report.vouchers?.taxableBase || 0).toFixed(2)}</span>
          </div>
          <div class="receipt-total-row">
            <span>I.G.V. 18% Declarable:</span>
            <span>S/ ${parseFloat(report.vouchers?.totalIgv || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="receipt-dashed-line"></div>

        <div style="margin-top: 20px; font-size: 10px; color: #475569;">
          <div style="border-top: 1px solid #94a3b8; width: 75%; margin: 26px auto 4px auto;"></div>
          <div style="text-align: center; font-weight: 700;">Firma del Cajero</div>
          <div style="text-align: center; font-size: 9px;">${report.cashierName}</div>

          <div style="border-top: 1px solid #94a3b8; width: 75%; margin: 26px auto 4px auto;"></div>
          <div style="text-align: center; font-weight: 700;">Firma Supervisión / Regencia Q.F.</div>
        </div>

        <div class="receipt-footer">
          <div>Reporte Z oficial sellado en PostgreSQL 16.</div>
          <div>Copia de auditoría registrada en la Torre de Control.</div>
        </div>
      </div>
    `;

    this.toggleZModal(true);
  }
}

// =============================================================
// 8. MÓDULO ALMACÉN, KARDEX & LOTES FEFO
// =============================================================
class WarehouseModule {
  constructor() {
    this.tableBody = document.getElementById('whTableBody');
    this.searchInput = document.getElementById('whSearchField');
    this.shelfFilter = document.getElementById('whLocationFilter');
    this.fefoFilter = document.getElementById('whFefoFilter');

    this.modal = document.getElementById('receiveModal');
    this.btnOpen = document.getElementById('btnOpenReceiveModal');
    this.btnClose = document.getElementById('btnCloseReceiveModal');
    this.btnCancel = document.getElementById('btnCancelReceive');
    this.btnSave = document.getElementById('btnSaveReceive');

    // Modal de Alta / Edición de Medicamento (Fase A - Módulo 1)
    this.medicineModal = document.getElementById('medicineFormModal');

    this.initEvents();
    this.render();
  }

  initEvents() {
    if (this.searchInput) this.searchInput.addEventListener('input', () => this.render());
    if (this.shelfFilter) this.shelfFilter.addEventListener('change', () => this.render());
    if (this.fefoFilter) this.fefoFilter.addEventListener('change', () => this.render());

    if (this.btnOpen) this.btnOpen.addEventListener('click', () => this.toggleModal(true));
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.toggleModal(false));
    if (this.btnCancel) this.btnCancel.addEventListener('click', () => this.toggleModal(false));

    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => {
        const prodId = parseInt(document.getElementById('recProductSelect').value, 10);
        const lot = document.getElementById('recLotCode').value.trim() || `L-${Math.floor(10000 + Math.random() * 90000)}`;
        const exp = document.getElementById('recExpireDate').value || '2028-12-31';
        const boxes = parseInt(document.getElementById('recBoxesCount').value || 10, 10);
        const loc = document.getElementById('recShelfLocation').value || 'Pasillo 1 • Anaquel A-1';

        const prod = testPharmacyCatalog.find(p => p.id === prodId);
        if (prod) {
          prod.stockBoxes += boxes;
          prod.stockUnits += (boxes * prod.unitsPerBox);
          prod.lotNumber = lot;
          prod.expireDate = exp;
          prod.location = loc;
          prod.fefoStatus = 'good';
        }

        if (window.api) {
          window.api.addStock({
            productId: prodId,
            lotNumber: lot,
            expireDate: exp,
            boxes: boxes,
            location: loc
          }).then(() => {
            syncWithBackend();
          }).catch(err => {
            console.warn("Error guardando en backend:", err.message);
          });
        }

        this.toggleModal(false);
        this.render();
        counterApp.renderProducts();
        showValetecToast("Mercadería ingresada al Kardex y guardada en PostgreSQL.", "success");
      });
    }
  }

  toggleModal(open) {
    if (open) this.modal?.classList.add('active');
    else this.modal?.classList.remove('active');
  }

  openCreateModal() {
    const form = document.getElementById('medicineForm');
    if (form) form.reset();
    document.getElementById('medId').value = '';
    document.getElementById('medModalTitle').innerHTML = '<i class="bi bi-capsule-pill text-teal"></i> 💊 Alta de Nuevo Medicamento';
    const initSec = document.getElementById('medInitialStockSection');
    if (initSec) initSec.style.display = 'block';
    this.medicineModal?.classList.add('active');
  }

  openEditModal(id) {
    const prod = testPharmacyCatalog.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('medId').value = prod.id;
    document.getElementById('medModalTitle').innerHTML = `<i class="bi bi-pencil-square text-blue"></i> ✏️ Editar Fármaco: ${prod.name}`;
    document.getElementById('medName').value = prod.name || '';
    document.getElementById('medGenericDci').value = prod.genericDci || '';
    document.getElementById('medBarcode').value = prod.barcode || '';
    document.getElementById('medLaboratory').value = prod.laboratory || '';

    // Categoría
    const catMap = { 'dolor': 1, 'antibioticos': 2, 'digestivos': 3, 'controlados': 4, 'vitaminas': 5, 'respiratorio': 6 };
    const catSelect = document.getElementById('medCategoryId');
    if (catSelect) catSelect.value = catMap[prod.category] || 1;

    document.getElementById('medLocation').value = prod.location || 'Pasillo 1 • Anaquel A-1';
    document.getElementById('medSanitaryRegistry').value = prod.sanitaryRegistry || '';
    document.getElementById('medPrescriptionType').value = prod.prescriptionType || 'free';
    document.getElementById('medBoxPrice').value = prod.boxPrice || '';
    document.getElementById('medBlisterPrice').value = prod.blisterPrice || '';
    document.getElementById('medUnitPrice').value = prod.unitPrice || '';
    document.getElementById('medUnitsPerBox').value = prod.unitsPerBox || 100;
    document.getElementById('medUnitsPerBlister').value = prod.unitsPerBlister || 10;

    const initSec = document.getElementById('medInitialStockSection');
    if (initSec) initSec.style.display = 'none';

    this.medicineModal?.classList.add('active');
  }

  closeMedicineModal() {
    this.medicineModal?.classList.remove('active');
  }

  autoCalcPrices() {
    const box = parseFloat(document.getElementById('medBoxPrice').value || 0);
    const uBox = parseInt(document.getElementById('medUnitsPerBox').value || 100, 10);
    const uBli = parseInt(document.getElementById('medUnitsPerBlister').value || 10, 10);
    const blisterInp = document.getElementById('medBlisterPrice');
    const unitInp = document.getElementById('medUnitPrice');

    if (box > 0 && uBox > 0) {
      const blisInBox = uBox / uBli;
      if (!blisterInp.value || parseFloat(blisterInp.value) === 0) {
        blisterInp.value = ((box / blisInBox) * 1.15).toFixed(2);
      }
      if (!unitInp.value || parseFloat(unitInp.value) === 0) {
        unitInp.value = ((box / uBox) * 1.25).toFixed(2);
      }
    }
  }

  async saveMedicine(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('medId').value;
    const name = document.getElementById('medName').value.trim();
    const genericDci = document.getElementById('medGenericDci').value.trim();
    const barcode = document.getElementById('medBarcode').value.trim();
    const laboratory = document.getElementById('medLaboratory').value.trim();
    const categoryId = parseInt(document.getElementById('medCategoryId').value, 10) || 1;
    const location = document.getElementById('medLocation').value.trim() || 'Pasillo 1 • Anaquel A-1';
    const sanitaryRegistry = document.getElementById('medSanitaryRegistry').value.trim();
    const prescriptionType = document.getElementById('medPrescriptionType').value;
    const boxPrice = parseFloat(document.getElementById('medBoxPrice').value || 0);
    const blisterPrice = parseFloat(document.getElementById('medBlisterPrice').value || 0);
    const unitPrice = parseFloat(document.getElementById('medUnitPrice').value || 0);
    const unitsPerBox = parseInt(document.getElementById('medUnitsPerBox').value || 100, 10);
    const unitsPerBlister = parseInt(document.getElementById('medUnitsPerBlister').value || 10, 10);

    const payload = {
      name,
      genericDci,
      barcode,
      laboratory,
      categoryId,
      location,
      sanitaryRegistry,
      prescriptionType,
      boxPrice,
      blisterPrice,
      unitPrice,
      unitsPerBox,
      unitsPerBlister
    };

    const submitBtn = document.getElementById('btnSaveMedicineSubmit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando en Postgres...';
    }

    try {
      if (id) {
        // Modo Edición
        if (window.api) {
          await window.api.updateProduct(id, payload);
        }
        showValetecToast(`Medicamento "${name}" actualizado con éxito.`, "success");
      } else {
        // Modo Alta
        const initBoxes = parseInt(document.getElementById('medInitialBoxes')?.value || 0, 10);
        const lotNumber = document.getElementById('medLotNumber')?.value?.trim();
        const expireDate = document.getElementById('medExpireDate')?.value;
        if (initBoxes > 0) {
          payload.initialBoxes = initBoxes;
          payload.lotNumber = lotNumber;
          payload.expireDate = expireDate || '2028-12-31';
        }

        if (window.api) {
          await window.api.createProduct(payload);
        }
        showValetecToast(`Medicamento "${name}" creado exitosamente en catálogo.`, "success");
      }

      this.closeMedicineModal();
      await syncWithBackend();
    } catch (err) {
      showValetecToast("Error al guardar medicamento: " + err.message, "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> <span>💾 Guardar Fármaco</span>';
      }
    }
  }

  async toggleStatus(id) {
    try {
      if (window.api) {
        const res = await window.api.toggleProductStatus(id);
        showValetecToast(res.message || "Estado actualizado.", "success");
        await syncWithBackend();
      }
    } catch (err) {
      showValetecToast("Error al cambiar estado: " + err.message, "error");
    }
  }

  render() {
    if (!this.tableBody) return;
    const q = this.searchInput?.value.toLowerCase().trim() || '';
    const s = this.shelfFilter?.value || 'all';
    const f = this.fefoFilter?.value || 'all';

    const filtered = testPharmacyCatalog.filter(p => {
      const mQ = (!q || p.name.toLowerCase().includes(q) || p.genericDci.toLowerCase().includes(q) || (p.lotNumber && p.lotNumber.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q)));
      const mS = (s === 'all' || (p.location && p.location.includes(s)));
      const mF = (f === 'all' || p.fefoStatus === f);
      return mQ && mS && mF;
    });

    if (filtered.length === 0) {
      this.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: var(--text-muted);">Sin medicamentos coincidentes en almacén.</td></tr>`;
      return;
    }

    this.tableBody.innerHTML = filtered.map(p => {
      let fefoClass = 'good';
      let fefoLabel = '🟢 Vigente (>6m)';
      if (p.fefoStatus === 'warning') { fefoClass = 'warning'; fefoLabel = '🟡 Canje (<90d)'; }
      else if (p.fefoStatus === 'expired') { fefoClass = 'expired'; fefoLabel = '🔴 Vencido / Agotado'; }

      const isInactive = p.status === 'inactive';

      return `
        <tr style="${isInactive ? 'opacity: 0.65; background-color: #f8fafc;' : ''}">
          <td><code>${p.barcode}</code></td>
          <td>
            <strong>${p.name}</strong>
            ${isInactive ? '<span style="background:#fee2e2; color:#b91c1c; font-size:10px; font-weight:800; margin-left:6px; padding:2px 6px; border-radius:4px;">INACTIVO</span>' : ''}
            <br><small style="color: var(--text-muted);">${p.genericDci}</small>
          </td>
          <td>${p.laboratory}</td>
          <td><span class="shelf-tag"><i class="bi bi-geo-alt"></i> ${p.location}</span></td>
          <td><strong>${p.stockBoxes} cajas</strong> (${p.stockBlisters} blíst. / ${p.stockUnits} past.)</td>
          <td><code>${p.lotNumber}</code></td>
          <td><strong>${p.expireDate}</strong></td>
          <td><span class="fefo-chip ${fefoClass}">${fefoLabel}</span></td>
          <td style="white-space: nowrap;">
            <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; font-weight: 700; margin-right: 4px;" onclick="warehouseApp.openEditModal(${p.id})" title="Editar Fármaco">
              <span>✏️ Editar</span>
            </button>
            <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; font-weight: 700; margin-right: 4px; color: #be123c;" onclick="warehouseApp.openAdjustmentModal(${p.id})" title="Ajuste o Merma">
              <span>⚖️ Ajuste</span>
            </button>
            <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; font-weight: 700; margin-right: 4px;" onclick="warehouseApp.toggleStatus(${p.id})" title="${isInactive ? 'Activar en mostrador' : 'Desactivar de mostrador'}">
              <span>${isInactive ? '✅' : '🚫'}</span>
            </button>
            <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; font-weight: 700;" onclick="warehouseApp.openKardexModal(${p.id})" title="Ver Kardex Físico y Valorizado">
              <span>📋 Kardex</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openAdjustmentModal(productId = null) {
    if (!this.adjModal) this.adjModal = document.getElementById('stockAdjustmentModal');
    const select = document.getElementById('adjProductId');
    if (select && testPharmacyCatalog) {
      select.innerHTML = '<option value="">-- Seleccionar Medicamento --</option>' +
        testPharmacyCatalog.map(p => `<option value="${p.id}" ${productId && p.id === productId ? 'selected' : ''}>${p.name} (${p.genericDci || ''}) - Stock: ${p.stockUnits} un.</option>`).join('');
    }

    if (productId) {
      this.onAdjustmentProductChange();
    } else {
      const info = document.getElementById('adjProductInfo');
      if (info) info.style.display = 'none';
      const lotSelect = document.getElementById('adjLotId');
      if (lotSelect) lotSelect.innerHTML = '<option value="">-- Seleccionar producto primero --</option>';
    }

    if (this.adjModal) this.adjModal.classList.add('active');
  }

  closeAdjustmentModal() {
    if (!this.adjModal) this.adjModal = document.getElementById('stockAdjustmentModal');
    if (this.adjModal) this.adjModal.classList.remove('active');
    const form = document.getElementById('stockAdjustmentForm');
    if (form) form.reset();
  }

  onAdjustmentProductChange() {
    const pId = parseInt(document.getElementById('adjProductId')?.value, 10);
    const info = document.getElementById('adjProductInfo');
    const stockEl = document.getElementById('adjCurrentStock');
    const locBadge = document.getElementById('adjLocationBadge');
    const lotSelect = document.getElementById('adjLotId');

    if (!pId) {
      if (info) info.style.display = 'none';
      return;
    }

    const prod = testPharmacyCatalog.find(p => p.id === pId);
    if (!prod) return;

    if (info) info.style.display = 'block';
    if (stockEl) stockEl.innerText = `${prod.stockBoxes} cajas (${prod.stockBlisters} blísters / ${prod.stockUnits} unid.)`;
    if (locBadge) locBadge.innerHTML = `<i class="bi bi-geo-alt"></i> ${prod.location || 'Sin ubicación'}`;

    if (lotSelect) {
      lotSelect.innerHTML = `
        <option value="">Lote Principal: ${prod.lotNumber || 'L-Default'} (Vence: ${prod.expireDate || 'N/A'})</option>
      `;
    }
  }

  async submitAdjustment(e) {
    if (e) e.preventDefault();
    const productId = parseInt(document.getElementById('adjProductId')?.value, 10);
    const adjustmentType = document.getElementById('adjType')?.value;
    const quantity = parseInt(document.getElementById('adjQuantity')?.value, 10);
    const unitType = document.getElementById('adjUnitType')?.value;
    const reason = document.getElementById('adjReason')?.value?.trim();

    if (!productId) {
      showValetecToast("Por favor seleccione un medicamento.", "warning");
      return;
    }

    if (!quantity || quantity <= 0) {
      showValetecToast("La cantidad debe ser mayor a 0.", "warning");
      return;
    }

    if (!reason || reason.length < 4) {
      showValetecToast("Debe ingresar una justificación sanitaria obligatoria.", "warning");
      return;
    }

    try {
      if (window.api) {
        const res = await window.api.adjustStock({
          productId,
          adjustmentType,
          quantity,
          unitType,
          reason,
          userName: (window.api.currentUser && window.api.currentUser.name) ? window.api.currentUser.name : 'Operador Almacén'
        });
        showValetecToast(res.message || "Ajuste de stock registrado en Kardex.", "success");
        this.closeAdjustmentModal();
        await syncWithBackend();
        this.loadFefoAlerts();
      } else {
        // Hotfix V-10: Modo contingencia offline — aplicar ajuste al catálogo local en memoria.
        // Antes, en modo offline el ajuste se ignoraba silenciosamente mostrando toast de éxito falso.
        const prod = testPharmacyCatalog.find(p => p.id === productId);
        if (prod) {
          const unitsToAdjust = unitType === 'boxes'
            ? quantity * (prod.unitsPerBox || 100)
            : unitType === 'blisters'
              ? quantity * (prod.unitsPerBlister || 10)
              : quantity;

          if (adjustmentType === 'out' || adjustmentType === 'spoilage' || adjustmentType === 'expired') {
            prod.stockUnits = Math.max(0, prod.stockUnits - unitsToAdjust);
          } else {
            prod.stockUnits = prod.stockUnits + unitsToAdjust;
          }
          prod.stockBoxes = Math.floor(prod.stockUnits / (prod.unitsPerBox || 100));
          prod.stockBlisters = Math.floor(prod.stockUnits / (prod.unitsPerBlister || 10));

          this.closeAdjustmentModal();
          this.render();
          if (typeof counterApp !== 'undefined') counterApp.renderProducts();
          showValetecToast(`⚠️ Ajuste local aplicado (modo contingencia): ${quantity} ${unitType} de "${prod.name}". Sincronizar con PostgreSQL al reconectar.`, "warning");
        } else {
          showValetecToast("Error: Medicamento no encontrado en el catálogo local.", "danger");
        }
      }
    } catch (err) {
      showValetecToast("Error al aplicar ajuste: " + err.message, "error");
    }
  }

  openFefoAlertsModal() {
    if (!this.fefoModal) this.fefoModal = document.getElementById('fefoAlertsModal');
    if (this.fefoModal) this.fefoModal.classList.add('active');
    this.loadFefoAlerts();
  }

  closeFefoAlertsModal() {
    if (!this.fefoModal) this.fefoModal = document.getElementById('fefoAlertsModal');
    if (this.fefoModal) this.fefoModal.classList.remove('active');
  }

  async loadFefoAlerts() {
    if (!window.api) return;
    try {
      const res = await window.api.getExpiringLots();
      if (res && res.data) {
        const sum = res.summary || {};
        const countBadge = document.getElementById('fefoCriticalCount');
        const expEl = document.getElementById('fefoSummaryExpired');
        const warnEl = document.getElementById('fefoSummaryWarning');
        const safeEl = document.getElementById('fefoSummarySafe');

        const totalCritical = (sum.expired || 0) + (sum.critical || 0) + (sum.warning || 0);
        if (countBadge) countBadge.innerText = totalCritical;
        if (expEl) expEl.innerText = (sum.expired || 0) + (sum.critical || 0);
        if (warnEl) warnEl.innerText = sum.warning || 0;
        if (safeEl) safeEl.innerText = sum.safe || 0;

        const tbody = document.getElementById('fefoAlertsTableBody');
        if (tbody) {
          if (res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">No hay lotes registrados con stock activo.</td></tr>';
            return;
          }

          tbody.innerHTML = res.data.map(l => {
            let badgeClass = '#dcfce7; color:#15803d';
            let label = '🟢 Vigente';
            if (l.fefoAlert === 'expired') {
              badgeClass = '#fee2e2; color:#b91c1c';
              label = '🔴 Vencido';
            } else if (l.fefoAlert === 'critical') {
              badgeClass = '#fee2e2; color:#b91c1c';
              label = '🔴 Crítico (<30d)';
            } else if (l.fefoAlert === 'warning') {
              badgeClass = '#fef3c7; color:#b45309';
              label = '🟡 Canje (<90d)';
            }

            return `
              <tr>
                <td><span class="badge" style="background:${badgeClass}; font-weight:800; padding:4px 8px; border-radius:6px;">${label}</span></td>
                <td><strong>${l.productName}</strong><br><small class="text-muted">${l.genericDci || ''}</small></td>
                <td>${l.laboratory}</td>
                <td><code>${l.lotNumber}</code></td>
                <td><strong>${l.expireDate}</strong></td>
                <td><strong style="color:${l.daysLeft <= 30 ? '#dc2626' : (l.daysLeft <= 90 ? '#d97706' : '#16a34a')}">${l.daysLeft} días</strong></td>
                <td><strong>${l.stockBoxes} cajas</strong> (${l.stockUnits} un.)</td>
                <td style="text-align: right; white-space: nowrap;">
                  <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; color:#be123c;" onclick="warehouseApp.closeFefoAlertsModal(); warehouseApp.openAdjustmentModal(${l.productId})" title="Registrar Merma / Baja">
                    ⚖️ Dar de Baja
                  </button>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.warn("Error cargando alertas FEFO:", err.message);
    }
  }

  openExchangeModal(e, medName, lot, supplier, qty) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof e === 'string') {
      qty = supplier;
      supplier = lot;
      lot = medName;
      medName = e;
    }

    const finalName = (typeof medName === 'string' && medName.trim()) ? medName : 'Bio-Amoxil 500mg Cápsulas';
    const finalLot = (typeof lot === 'string' && lot.trim()) ? lot : 'L-24115';
    const finalSupp = (typeof supplier === 'string' && supplier.trim()) ? supplier : 'Droguería Andina S.A.C. / MedPharma';
    const finalQty = (typeof qty === 'number' || (typeof qty === 'string' && !isNaN(qty))) ? qty : 15;

    // Cerrar cualquier modal activo previo para evitar cruce de vistas
    document.querySelectorAll('.modal-backdrop-valetec.active').forEach(m => m.classList.remove('active'));

    const modal = document.getElementById('exchangeModal');
    const inName = document.getElementById('exchangeProductName');
    const inLot = document.getElementById('exchangeLotCode');
    const inSupp = document.getElementById('exchangeSupplier');
    const inQty = document.getElementById('exchangeQuantity');
    if (inName) inName.value = finalName;
    if (inLot) inLot.value = finalLot;
    if (inSupp) inSupp.value = finalSupp;
    if (inQty) inQty.value = finalQty;
    if (modal) modal.classList.add('active');
  }

  closeExchangeModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const modal = document.getElementById('exchangeModal');
    if (modal) modal.classList.remove('active');
  }

  printExchangeLetter(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    window.print();
  }

  sendExchangeWhatsApp(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const med = document.getElementById('exchangeProductName')?.value || 'Bio-Amoxil 500mg';
    const lot = document.getElementById('exchangeLotCode')?.value || 'L-24115';
    const supp = document.getElementById('exchangeSupplier')?.value || 'Droguería Proveedora';
    const qty = document.getElementById('exchangeQuantity')?.value || '15';
    const reason = document.getElementById('exchangeReasonSelect')?.options[document.getElementById('exchangeReasonSelect')?.selectedIndex]?.text || 'Próximo Vencimiento';

    const text = `🏥 *SOLICITUD FORMAL DE CANJE POR VENCIMIENTO*\n` +
      `🏢 *VALETEC PHARMA* | RUC: 20601234567\n` +
      `📅 Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n` +
      `🏭 Destinatario: *${supp}*\n\n` +
      `Estimado proveedor, solicitamos el canje formal por rotación conforme a normativa DIGEMID/BPA:\n` +
      `💊 *Producto:* ${med}\n` +
      `📦 *Lote:* ${lot}\n` +
      `🔢 *Cantidad:* ${qty} Cajas\n` +
      `📋 *Motivo:* ${reason}\n\n` +
      `📍 *Punto de Recojo:* Botica Central (Av. Aviación 2450, San Borja, Lima)\n` +
      `👩‍⚕️ *Regente Q.F.:* Dra. Elena Vega (CQFP 18492)\n` +
      `Agradecemos coordinar con nosotros la fecha de retiro físico y emisión de nota de crédito / reposición.`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showValetecToast("Abriendo WhatsApp con la carta de canje formal...", "info");
  }

  submitExchange(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const med = document.getElementById('exchangeProductName')?.value || 'Bio-Amoxil 500mg';
    const lot = document.getElementById('exchangeLotCode')?.value || 'L-24115';
    const qty = document.getElementById('exchangeQuantity')?.value || '15';
    this.closeExchangeModal();
    showValetecToast(`✅ Acta de canje generada: ${qty} cajas de ${med} (Lote: ${lot}) pasadas a custodia.`, 'success');
  }

  async openKardexModal(productId) {
    if (!this.kardexModal) this.kardexModal = document.getElementById('kardexViewerModal');
    if (!window.api) return;

    try {
      const res = await window.api.getProductKardex(productId);
      if (res && res.data) {
        const d = res.data;
        const p = d.product;
        const stock = d.currentStock;
        const val = d.valuation;

        const titleEl = document.getElementById('kardexModalTitle');
        const subEl = document.getElementById('kardexModalSubtitle');
        if (titleEl) titleEl.innerHTML = `<i class="bi bi-journal-medical text-teal"></i> 📋 Kardex: ${p.name}`;
        if (subEl) subEl.innerText = `${p.genericDci || ''} • Lab: ${p.laboratory} • Ubic: ${p.location} • Cód: ${p.barcode}`;

        const stockEl = document.getElementById('kardexStockDisplay');
        const boxEl = document.getElementById('kardexBoxesDisplay');
        const unitEl = document.getElementById('kardexUnitPriceDisplay');
        const costEl = document.getElementById('kardexCostPriceDisplay');
        const valSaleEl = document.getElementById('kardexValuedSaleDisplay');
        const marginEl = document.getElementById('kardexMarginDisplay');

        if (stockEl) stockEl.innerText = `${stock.totalUnits} un.`;
        if (boxEl) boxEl.innerText = `${stock.totalBoxes} cajas (${stock.totalBlisters} blíst.)`;

        if (unitEl) unitEl.innerText = `S/ ${val.unitPrice.toFixed(2)}`;
        if (costEl) costEl.innerText = `Costo est: S/ ${val.estimatedCostUnit.toFixed(2)}`;

        if (valSaleEl) valSaleEl.innerText = `S/ ${val.totalValuedSale.toFixed(2)}`;
        if (marginEl) marginEl.innerText = `S/ ${val.potentialMargin.toFixed(2)}`;

        const tbody = document.getElementById('kardexTableBody');
        if (tbody) {
          if (!d.movements || d.movements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-3 text-muted">Sin movimientos registrados aún en Kardex.</td></tr>';
          } else {
            tbody.innerHTML = d.movements.map(m => {
              let badgeColor = '#0d9488';
              let badgeText = 'Entrada';

              if (m.movementType === 'sale') {
                badgeColor = '#0284c7';
                badgeText = 'Venta Mostrador';
              } else if (m.movementType.includes('adjustment_out') || m.movementType === 'spoilage') {
                badgeColor = '#dc2626';
                badgeText = 'Baja / Merma';
              } else if (m.movementType === 'initial_stock') {
                badgeColor = '#475569';
                badgeText = 'Apertura / Inicial';
              }

              const inQty = m.quantity > 0 ? `+${m.quantity}` : '-';
              const outQty = m.quantity < 0 ? Math.abs(m.quantity) : '-';

              return `
                <tr>
                  <td><code>${m.createdAt}</code></td>
                  <td><span class="badge" style="background:${badgeColor}20; color:${badgeColor}; font-weight:800; padding:4px 8px; border-radius:6px;">${badgeText}</span></td>
                  <td><strong>${m.referenceType}</strong><br><small class="text-muted">${m.referenceId || ''}</small></td>
                  <td><code>${m.lotNumber || 'N/A'}</code></td>
                  <td style="text-align: right; color:#15803d; font-weight:700;">${inQty}</td>
                  <td style="text-align: right; color:#b91c1c; font-weight:700;">${outQty}</td>
                  <td style="text-align: right; font-weight:800;" title="Saldo anterior: ${m.previousStock} → Saldo nuevo: ${m.newStock}">${m.newStock} <small style="font-weight:400; color:#94a3b8; font-size:10px;">(ant:${m.previousStock})</small></td>
                  <td><small>${m.userName || 'Sistema'}</small></td>
                  <td><small style="color: #475569;">${m.reason || ''}</small></td>
                </tr>
              `;
            }).join('');
          }
        }

        if (this.kardexModal) this.kardexModal.classList.add('active');
      }
    } catch (err) {
      showValetecToast("Error cargando Kardex: " + err.message, "error");
    }
  }

  closeKardexModal() {
    if (!this.kardexModal) this.kardexModal = document.getElementById('kardexViewerModal');
    if (this.kardexModal) this.kardexModal.classList.remove('active');
  }

  printKardex() {
    window.print();
  }

  async openValuedInventoryModal() {
    if (!this.valModal) this.valModal = document.getElementById('valuedInventoryModal');
    if (!window.api) return;

    try {
      const res = await window.api.getKardexSummary();
      if (res && res.data) {
        const sum = res.summary || {};
        const totalItemsEl = document.getElementById('valSummaryTotalItems');
        const totalUnitsEl = document.getElementById('valSummaryTotalUnits');
        const costValEl = document.getElementById('valSummaryCostValuation');
        const saleValEl = document.getElementById('valSummarySaleValuation');
        const marginEl = document.getElementById('valSummaryMargin');

        if (totalItemsEl) totalItemsEl.innerText = sum.totalProducts || 0;
        if (totalUnitsEl) totalUnitsEl.innerText = `${sum.grandTotalUnits || 0} un.`;
        if (costValEl) costValEl.innerText = `S/ ${(sum.grandTotalValuedCost || 0).toFixed(2)}`;
        if (saleValEl) saleValEl.innerText = `S/ ${(sum.grandTotalValuedSale || 0).toFixed(2)}`;
        if (marginEl) marginEl.innerText = `S/ ${(sum.estimatedProfitMargin || 0).toFixed(2)}`;

        const tbody = document.getElementById('valuedInventoryTableBody');
        if (tbody) {
          tbody.innerHTML = res.data.map(item => `
            <tr>
              <td><strong>${item.name}</strong><br><small class="text-muted">${item.genericDci || ''}</small></td>
              <td>${item.laboratory}</td>
              <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:4px 8px; border-radius:4px;">${item.category}</span></td>
              <td><strong>${item.totalBoxes} cajas</strong> (${item.totalUnits} un.)</td>
              <td>S/ ${item.estimatedCostUnit.toFixed(2)}</td>
              <td><strong>S/ ${item.unitPrice.toFixed(2)}</strong></td>
              <td style="text-align: right; font-weight: 800; color: #15803d;">S/ ${item.valuedSale.toFixed(2)}</td>
              <td style="text-align: right; white-space: nowrap;">
                <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px;" onclick="warehouseApp.closeValuedInventoryModal(); warehouseApp.openKardexModal(${item.id})">
                  📋 Kardex
                </button>
              </td>
            </tr>
          `).join('');
        }

        if (this.valModal) this.valModal.classList.add('active');
      }
    } catch (err) {
      showValetecToast("Error cargando inventario valorizado: " + err.message, "error");
    }
  }

  closeValuedInventoryModal() {
    if (!this.valModal) this.valModal = document.getElementById('valuedInventoryModal');
    if (this.valModal) this.valModal.classList.remove('active');
  }
}

// =============================================================
// 9. MÓDULO LIBRO DIGEMID & REGENCIA SANITARIA
// =============================================================
class DigemidModule {
  constructor() {
    this.tableBody = document.getElementById('digemidTableBody');
    this.modal = document.getElementById('prescriptionViewerModal');
    this.content = document.getElementById('prescriptionViewerContent');
    this.btnClose = document.getElementById('btnCloseRxModal');
    this.btnCloseBtn = document.getElementById('btnCloseRxBtn');
    this.btnApprove = document.getElementById('btnApproveAndFill');

    // Modal de Nueva Receta DIGEMID
    this.newRecipeModal = document.getElementById('newRecipeModal');
    this.btnOpenNewRecipe = document.getElementById('btnNewPrescriptionEntry');
    this.btnCloseNewRecipe = document.getElementById('btnCloseNewRecipeModal');
    this.btnCancelNewRecipe = document.getElementById('btnCancelNewRecipe');
    this.btnSaveNewRecipe = document.getElementById('btnSaveNewRecipe');

    this.inPatientName = document.getElementById('recipePatientName');
    this.inPatientDni = document.getElementById('recipePatientDni');
    this.inDoctorCmp = document.getElementById('recipeDoctorCmp');
    this.inDoctorName = document.getElementById('recipeDoctorName');
    this.inMedication = document.getElementById('recipeMedicationDetails');
    this.inNotes = document.getElementById('recipeNotes');

    // Modal de Balance Sanitario DIGEMID
    this.balanceModal = document.getElementById('digemidBalanceModal');
    this.balanceBody = document.getElementById('digemidBalanceModalBody');
    this.btnOpenBalance = document.getElementById('btnPrintDigemidBalance');
    this.btnCloseBalance = document.getElementById('btnCloseBalanceModal');
    this.btnCloseBalanceBtn = document.getElementById('btnCloseBalanceBtn');
    this.btnPrintBalance = document.getElementById('btnPrintBalanceBtn');

    // Indicadores numéricos sanitarios
    this.vaultUnitsEl = document.getElementById('digemidVaultUnits');
    this.folioStatusEl = document.getElementById('digemidFolioStatus');

    // Botón de Dispensar en modal visor (hidden por defecto, se muestra solo si status=approved)
    this.btnDispense = document.getElementById('btnDispenseRecipe');

    this.initEvents();
    this.render();
    this.updateMetrics();
  }

  initEvents() {
    // Modal Visor de Receta
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.toggleModal(false));
    if (this.btnCloseBtn) this.btnCloseBtn.addEventListener('click', () => this.toggleModal(false));

    // Modal Foliación de Nueva Receta
    if (this.btnOpenNewRecipe) this.btnOpenNewRecipe.addEventListener('click', () => this.toggleNewRecipeModal(true));
    if (this.btnCloseNewRecipe) this.btnCloseNewRecipe.addEventListener('click', () => this.toggleNewRecipeModal(false));
    if (this.btnCancelNewRecipe) this.btnCancelNewRecipe.addEventListener('click', () => this.toggleNewRecipeModal(false));
    if (this.btnSaveNewRecipe) this.btnSaveNewRecipe.addEventListener('click', () => this.handleSaveRecipe());

    // Modal Balance Sanitario Oficial
    if (this.btnOpenBalance) this.btnOpenBalance.addEventListener('click', () => this.openBalanceReport());
    if (this.btnCloseBalance) this.btnCloseBalance.addEventListener('click', () => this.toggleBalanceModal(false));
    if (this.btnCloseBalanceBtn) this.btnCloseBalanceBtn.addEventListener('click', () => this.toggleBalanceModal(false));
    if (this.btnPrintBalance) this.btnPrintBalance.addEventListener('click', () => this.printBalance());

    // Aprobación Q.F. e integración directa con Mostrador
    if (this.btnApprove) {
      this.btnApprove.addEventListener('click', () => {
        if (this.activeFolio) {
          const r = digemidMockRecords.find(x => x.folio === this.activeFolio);
          if (r) {
            r.status = 'approved';
            this.render();
            if (window.api) {
              window.api.updateRecipeStatus(r.folio, 'approved')
                .then(() => syncWithBackend())
                .catch(err => console.warn("Aviso actualizando receta:", err.message));
            }

            // 1. Navegar de inmediato al Mostrador
            if (typeof appNav !== 'undefined' && appNav && appNav.navigateTo) {
              appNav.navigateTo('viewCounter');
            }

            // 2. Pre-llenar CMP y alertar en el mostrador
            const cmpInput = document.getElementById('orderDoctorCmp');
            if (cmpInput) {
              cmpInput.value = r.doctorCmp;
            }
            const rxAlertBox = document.getElementById('prescriptionAlertBox');
            if (rxAlertBox) {
              rxAlertBox.classList.remove('d-none');
            }

            // 3. Cargar el medicamento recetado al carrito
            if (typeof counterApp !== 'undefined' && counterApp) {
              const medText = (r.medication || '').toLowerCase();
              let matched = testPharmacyCatalog.find(p =>
                medText.includes(p.name.toLowerCase()) ||
                p.name.toLowerCase().includes(medText) ||
                (p.genericDci && medText.includes(p.genericDci.toLowerCase()))
              );

              if (!matched) {
                if (medText.includes('seda') || medText.includes('clona')) {
                  matched = testPharmacyCatalog.find(p => p.name.includes('Sedafarma'));
                } else if (medText.includes('amox')) {
                  matched = testPharmacyCatalog.find(p => p.name.includes('Amoxil'));
                } else if (medText.includes('naprox')) {
                  matched = testPharmacyCatalog.find(p => p.name.includes('Naprox'));
                }
              }

              if (matched) {
                counterApp.addItem(matched.id, 'box');
              }
            }

            showValetecToast(`Receta ${r.folio} aprobada por Q.F. Medicamento y CMP cargados en Mostrador.`, "success");
            this.updateMetrics();
          }
        }
        this.toggleModal(false);
      });
    }

    // Dispensar al paciente (flujo final DIGEMID: approved -> dispensed)
    if (this.btnDispense) {
      this.btnDispense.addEventListener('click', async () => {
        if (!this.activeFolio) return;
        const r = digemidMockRecords.find(x => x.folio === this.activeFolio);
        if (!r || r.status !== 'approved') return;

        const confirmed = confirm(`¿Confirmar la dispensación final de la receta ${r.folio} al paciente ${r.patientName}?\n\nEsta acción quedará sellada en el Libro Oficial DIGEMID.`);
        if (!confirmed) return;

        r.status = 'dispensed';
        this.render();
        this.toggleModal(false);

        if (window.api) {
          try {
            await window.api.updateRecipeStatus(r.folio, 'dispensed');
            await syncWithBackend();
            showValetecToast(`Receta ${r.folio} dispensada y sellada en el Libro DIGEMID.`, 'success');
          } catch (err) {
            console.error('[DIGEMID] Error al dispensar:', err.message);
            showValetecToast(`Error al dispensar en backend: ${err.message}`, 'danger');
          }
        }
      });
    }
  }

  toggleModal(open) {
    if (open) this.modal?.classList.add('active');
    else this.modal?.classList.remove('active');
  }

  toggleNewRecipeModal(open) {
    if (open) {
      this.newRecipeModal?.classList.add('active');
      this.inPatientName?.focus();
    } else {
      this.newRecipeModal?.classList.remove('active');
    }
  }

  toggleBalanceModal(open) {
    if (open) this.balanceModal?.classList.add('active');
    else this.balanceModal?.classList.remove('active');
  }

  async handleSaveRecipe() {
    const patientName = this.inPatientName?.value.trim() || '';
    const patientDni = this.inPatientDni?.value.trim() || '';
    const doctorCmp = this.inDoctorCmp?.value.trim() || '';
    const doctorName = this.inDoctorName?.value.trim() || '';
    const medication = this.inMedication?.value.trim() || '';
    const notes = this.inNotes?.value.trim() || 'Receta retenida en custodia oficial de regencia.';

    if (!patientName || patientName.length < 3) {
      showValetecToast("Por favor ingrese el nombre completo del paciente.", "warning");
      this.inPatientName?.focus();
      return;
    }
    if (!patientDni || patientDni.length < 8) {
      showValetecToast("El DNI del paciente debe tener al menos 8 dígitos.", "warning");
      this.inPatientDni?.focus();
      return;
    }
    if (!doctorCmp || doctorCmp.length < 4) {
      showValetecToast("Por favor ingrese la colegiatura médica (CMP) del doctor.", "warning");
      this.inDoctorCmp?.focus();
      return;
    }
    if (!doctorName || doctorName.length < 3) {
      showValetecToast("Por favor ingrese el nombre del médico tratante.", "warning");
      this.inDoctorName?.focus();
      return;
    }
    if (!medication || medication.length < 3) {
      showValetecToast("Por favor detalle la medicina prescrita y su posología.", "warning");
      this.inMedication?.focus();
      return;
    }

    const payload = {
      patientName,
      patientDni,
      doctorCmp,
      doctorName,
      medicationDetails: medication,
      notes
    };

    try {
      if (window.api) {
        const res = await window.api.createRecipe(payload);
        if (res && res.data) {
          digemidMockRecords.unshift({
            folio: res.data.folio,
            patientName: res.data.patientName,
            patientDni: res.data.patientDni,
            doctorName: res.data.doctorName,
            doctorCmp: res.data.doctorCmp,
            medication: res.data.medication,
            dateIssued: res.data.dateIssued,
            status: res.data.status,
            notes: res.data.notes
          });
          showValetecToast(`Receta ${res.data.folio} foliada con éxito en Libro Oficial DIGEMID.`, 'success');
        }
      }
    } catch (err) {
      console.warn("Foliación en memoria local:", err.message);
      const fakeFolio = `REC-2026-${String(digemidMockRecords.length + 42).padStart(4, '0')}`;
      digemidMockRecords.unshift({
        folio: fakeFolio,
        patientName: payload.patientName,
        patientDni: payload.patientDni,
        doctorName: payload.doctorName,
        doctorCmp: payload.doctorCmp.toUpperCase().startsWith('CMP') ? payload.doctorCmp.toUpperCase() : `CMP-${payload.doctorCmp}`,
        medication: payload.medicationDetails,
        dateIssued: new Date().toLocaleDateString('es-PE'),
        status: 'retained',
        notes: payload.notes
      });
      showValetecToast(`Receta ${fakeFolio} foliada en memoria local.`, 'info');
    }

    // Limpiar campos y cerrar modal
    if (this.inPatientName) this.inPatientName.value = '';
    if (this.inPatientDni) this.inPatientDni.value = '';
    if (this.inDoctorCmp) this.inDoctorCmp.value = '';
    if (this.inDoctorName) this.inDoctorName.value = '';
    if (this.inMedication) this.inMedication.value = '';
    if (this.inNotes) this.inNotes.value = '';

    this.toggleNewRecipeModal(false);
    this.render();
    this.updateMetrics();
  }

  async openBalanceReport() {
    let balanceData = null;
    try {
      if (window.api) {
        const res = await window.api.getSanitaryBalance();
        if (res && res.data) balanceData = res.data;
      }
    } catch (err) {
      console.warn("Obteniendo balance desde registros locales:", err.message);
    }

    // Si no se obtuvo de la API, estructurar desde datos locales
    if (!balanceData) {
      const retained = digemidMockRecords.filter(r => r.status === 'retained').length;
      const approved = digemidMockRecords.filter(r => r.status === 'approved').length;
      const dispensed = digemidMockRecords.filter(r => r.status === 'dispensed').length;
      balanceData = {
        establishment: {
          name: 'BOTICA VALETEC PHARMA S.A.C.',
          ruc: '20601234567',
          sanitaryLicense: 'DIRIS-LC N° 10842-FAR',
          address: 'Av. Aviación 2450, San Borja, Lima',
          technicalDirector: 'Dra. Elena Vega (Q.F. Reg. CQFP 18492)'
        },
        summary: {
          totalLedgerEntries: digemidMockRecords.length,
          retainedCount: retained,
          approvedCount: approved,
          dispensedCount: dispensed
        },
        vaultInventory: {
          productName: 'Sedafarma 2mg Ranuradas (Clonazepam)',
          genericDci: 'Clonazepam 2mg - Lista IV',
          location: 'Caja Fuerte de Regencia',
          unitsInVault: 25,
          boxesInVault: 1
        },
        records: digemidMockRecords
      };
    }

    if (!this.balanceBody) return;

    const est = balanceData.establishment;
    const sum = balanceData.summary;
    const vault = balanceData.vaultInventory;
    const records = balanceData.records || [];

    this.balanceBody.innerHTML = `
      <div id="printSanitaryBalanceArea" style="font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; font-size: 11.5px; line-height: 1.4;">
        
        <!-- Membrete Oficial Sanitario -->
        <div style="text-align: center; border-bottom: 2px solid #004d99; padding-bottom: 10px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">MINISTERIO DE SALUD • DIGEMID</span>
            <span style="font-size: 10px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">REGISTRO OFICIAL</span>
          </div>
          <h2 style="font-size: 15px; font-weight: 900; color: #004d99; margin: 0 0 2px 0; letter-spacing: -0.2px;">
            ${est.name}
          </h2>
          <div style="font-size: 10.5px; color: #475569;">
            <strong>RUC:</strong> ${est.ruc} &nbsp;|&nbsp; <strong>Licencia:</strong> ${est.sanitaryLicense}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            ${est.address}
          </div>
          <div style="display: inline-block; margin-top: 6px; padding: 3px 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 20px; font-weight: 700; color: #0f172a; font-size: 11px;">
            ⚖️ BALANCE OFICIAL DE MEDICAMENTOS CONTROLADOS & PSICOTRÓPICOS
          </div>
        </div>

        <!-- Información de Regencia y Fecha -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
          <div>
            <span style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; display: block;">Directora Técnica Responsable:</span>
            <strong style="color: #004d99; font-size: 11.5px;">${est.technicalDirector}</strong>
          </div>
          <div style="text-align: right;">
            <span style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; display: block;">Fecha de Emisión:</span>
            <strong style="font-size: 11px;">${new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
        </div>

        <!-- Indicadores de Balance Sanitario -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px; text-align: center;">
            <div style="font-size: 16px; font-weight: 900; color: #1d4ed8;">${sum.totalLedgerEntries}</div>
            <div style="font-size: 9px; font-weight: 700; color: #3b82f6; text-transform: uppercase;">Total Folios</div>
          </div>
          <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 6px; text-align: center;">
            <div style="font-size: 16px; font-weight: 900; color: #a16207;">${sum.retainedCount}</div>
            <div style="font-size: 9px; font-weight: 700; color: #ca8a04; text-transform: uppercase;">En Custodia</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px; text-align: center;">
            <div style="font-size: 16px; font-weight: 900; color: #15803d;">${sum.approvedCount}</div>
            <div style="font-size: 9px; font-weight: 700; color: #16a34a; text-transform: uppercase;">Aprobadas Q.F.</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; text-align: center;">
            <div style="font-size: 16px; font-weight: 900; color: #475569;">${sum.dispensedCount}</div>
            <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Dispensadas</div>
          </div>
        </div>

        <!-- Custodia Física en Caja Fuerte -->
        ${vault ? `
          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #6b21a8; font-size: 11px;">🔒 Custodia en Caja Fuerte (Lista IV):</strong>
                <div style="color: #4b5563; font-size: 10.5px;">${escHtml(vault.productName)} • <em>${escHtml(vault.genericDci)}</em></div>
                <small style="color: #9333ea; font-weight: 600;">Ubicación: ${escHtml(vault.location)}</small>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 16px; font-weight: 900; color: #7e22ce;">${vault.unitsInVault}</span>
                <span style="font-size: 10px; font-weight: 700; color: #6b21a8;"> Unidades (${vault.boxesInVault} caja)</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Detalle de Recetas Foliadas -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 14px; background: #ffffff;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; color: #334155;">
                <th style="padding: 5px 8px;">Folio</th>
                <th style="padding: 5px 8px;">Paciente (DNI)</th>
                <th style="padding: 5px 8px;">Médico (CMP)</th>
                <th style="padding: 5px 8px;">Rp. Medicamento Prescrito</th>
                <th style="padding: 5px 8px; text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((rec, i) => `
                <tr style="border-bottom: 1px solid #f1f5f9; background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 5px 8px; font-family: monospace; font-weight: 700; color: #0369a1;">${escHtml(rec.folio)}</td>
                  <td style="padding: 5px 8px;"><strong>${escHtml(rec.patientName)}</strong><br><span style="color: #64748b;">${escHtml(rec.patientDni)}</span></td>
                  <td style="padding: 5px 8px;">${escHtml(rec.doctorName)}<br><span style="color: #0284c7; font-weight: 700;">${escHtml(rec.doctorCmp)}</span></td>
                  <td style="padding: 5px 8px;">${escHtml(rec.medication)}</td>
                  <td style="padding: 5px 8px; text-align: center;">
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 800; ${rec.status === 'dispensed' ? 'background: #dbeafe; color: #1d4ed8;' :
        rec.status === 'approved' ? 'background: #dcfce7; color: #15803d;' :
          'background: #fef9c3; color: #854d0e;'
      }">
                      ${rec.status === 'dispensed' ? 'Dispensada' : rec.status === 'approved' ? 'Aprobada' : 'Retenida'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Sello y Certificación Legal DIGEMID -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #94a3b8; text-align: center;">
          <div>
            <div style="height: 30px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #004d99; font-weight: 700;">
              Dra. Elena Vega
            </div>
            <div style="border-top: 1px solid #475569; width: 75%; margin: 0 auto; padding-top: 4px;">
              <strong style="font-size: 10px; display: block; color: #1e293b;">Dra. Elena Vega</strong>
              <small style="font-size: 9px; color: #64748b;">Directora Técnica • Reg. CQFP 18492</small>
            </div>
          </div>
          <div>
            <div style="height: 30px; display: flex; align-items: center; justify-content: center; color: #475569; font-size: 20px;">
              🛡️
            </div>
            <div style="border-top: 1px solid #475569; width: 75%; margin: 0 auto; padding-top: 4px;">
              <strong style="font-size: 10px; display: block; color: #1e293b;">Sello de Inspección Sanitaria</strong>
              <small style="font-size: 9px; color: #64748b;">DIRIS Lima Centro • DIGEMID</small>
            </div>
          </div>
        </div>

      </div>
    `;

    this.toggleBalanceModal(true);
  }

  printBalance() {
    const printContent = document.getElementById('printSanitaryBalanceArea');
    if (!printContent) return;

    // Hotfix V-07: Sanitizado previo en openBalanceReport con escHtml() y CSP en ventana popup
    const printWin = window.open('', '_blank', 'width=780,height=800');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'; img-src 'self' data:;">
            <title>Balance Sanitario Oficial DIGEMID - Valetec Pharma</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() { window.print(); window.close(); }
            <\/script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      window.print();
    }
  }

  updateMetrics() {
    const retained = digemidMockRecords.filter(r => r.status === 'retained').length;
    const total = digemidMockRecords.length;

    // Buscar Sedafarma en catálogo para stock real en caja fuerte (fallback local)
    const sedafarma = testPharmacyCatalog.find(p => p.prescriptionType === 'retained' || p.name.includes('Sedafarma'));
    const vaultUnits = sedafarma ? sedafarma.stockUnits : 25;

    if (this.vaultUnitsEl) {
      this.vaultUnitsEl.innerText = `${vaultUnits} Pastillas en Caja Fuerte`;
    }
    if (this.folioStatusEl) {
      const pct = total > 0 ? Math.round(((total - retained) / total) * 100) : 100;
      this.folioStatusEl.innerText = `${pct}% Foliado al Día (${total} Recetas)`;
    }
  }

  updateMetricsFromBalance(balanceData) {
    // Actualizar indicador de caja fuerte con stock real del backend
    if (this.vaultUnitsEl && balanceData.vaultInventory) {
      const v = balanceData.vaultInventory;
      this.vaultUnitsEl.innerText = `${v.unitsInVault} Unidades en Caja Fuerte`;
    }
    // Actualizar indicador de foliación con recuento real
    if (this.folioStatusEl && balanceData.summary) {
      const s = balanceData.summary;
      const total = s.totalLedgerEntries;
      const retained = s.retainedCount;
      const pct = total > 0 ? Math.round(((total - retained) / total) * 100) : 100;
      this.folioStatusEl.innerText = `${pct}% Foliado (${total} registros)`;
    }
  }

  viewRecord(folio) {
    const r = digemidMockRecords.find(x => x.folio === folio);
    if (!r || !this.content) return;
    this.activeFolio = folio;

    let statusChip = '<span class="fefo-chip warning"><i class="bi bi-hourglass-split"></i> Receta Retenida</span>';
    if (r.status === 'approved') statusChip = '<span class="fefo-chip good"><i class="bi bi-check-circle"></i> Aprobada por Regencia Q.F.</span>';
    if (r.status === 'dispensed') statusChip = '<span class="fefo-chip good" style="background-color:#e0f0ff; color:#0066cc;"><i class="bi bi-check2-all"></i> Dispensada al Paciente</span>';

    this.content.innerHTML = `
      <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:10px;">
          <div>
            <strong style="color: var(--valetec-navy); font-size: 13px;">EXPEDIENTE SANITARIO DE RECETA MÉDICA</strong><br>
            <span style="color: var(--valetec-blue); font-family: monospace; font-size: 12px; font-weight: 800;">${escHtml(r.folio)}</span>
          </div>
          ${statusChip}
        </div>
        <p style="margin: 4px 0; font-size: 12px;"><strong>👤 Paciente:</strong> ${escHtml(r.patientName)} &nbsp;|&nbsp; <strong>DNI:</strong> <code>${escHtml(r.patientDni)}</code></p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>👨‍⚕️ Médico Prescriptor:</strong> ${escHtml(r.doctorName)} &nbsp;|&nbsp; <strong>Colegiatura:</strong> <span class="shelf-tag">${escHtml(r.doctorCmp)}</span></p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>📅 Fecha de Emisión:</strong> ${escHtml(r.dateIssued)}</p>
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin:10px 0;">
          <strong style="color: var(--valetec-navy); font-size: 12px;">Rp. Medicamento Controlado &amp; Posología:</strong>
          <p style="font-size: 13.5px; font-weight: 800; color: #0066cc; margin: 4px 0;">${escHtml(r.medication)}</p>
          <small style="color: var(--text-muted);"><strong>📌 Custodia:</strong> ${escHtml(r.notes) || 'En archivo de regencia'}</small>
        </div>
        <div style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 6px 10px; border-radius: 4px;">
          ⚖️ Cumplimiento estricto D.S. 023-2001-SA (Reglamento de Estupefacientes y Psicotrópicos).
        </div>
      </div>
    `;

    // Ajustar botones del footer según el estado actual de la receta
    if (this.btnApprove) {
      if (r.status === 'retained') {
        this.btnApprove.style.display = 'inline-flex';
        this.btnApprove.innerHTML = '<i class="bi bi-check2-circle"></i> <span>✅ Aprobar y Cargar al Carrito</span>';
      } else {
        this.btnApprove.style.display = 'none';
      }
    }
    if (this.btnDispense) {
      if (r.status === 'approved') {
        this.btnDispense.style.display = 'inline-flex';
      } else {
        this.btnDispense.style.display = 'none';
      }
    }

    this.toggleModal(true);
  }

  render() {
    if (!this.tableBody) return;

    if (digemidMockRecords.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: #94a3b8; padding: 24px;">
            No hay recetas foliadas en el Libro Oficial. Haz clic en "📝 Foliar Nueva Receta" para registrar la primera.
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = digemidMockRecords.map(r => {
      let badge = `<span class="fefo-chip warning"><i class="bi bi-hourglass-split"></i> Retenida</span>`;
      if (r.status === 'approved') badge = `<span class="fefo-chip good"><i class="bi bi-check-circle"></i> Aprobada Q.F.</span>`;
      if (r.status === 'dispensed') badge = `<span class="fefo-chip good" style="background-color:#e0f0ff; color:#0066cc;"><i class="bi bi-check2-all"></i> Dispensada</span>`;

      return `
        <tr>
          <td><strong>${escHtml(r.folio)}</strong></td>
          <td><strong>${escHtml(r.patientName)}</strong></td>
          <td><code>${escHtml(r.patientDni)}</code></td>
          <td>${escHtml(r.doctorName)}</td>
          <td><span class="shelf-tag">${escHtml(r.doctorCmp)}</span></td>
          <td><strong>${escHtml(r.medication)}</strong></td>
          <td>${escHtml(r.dateIssued)}</td>
          <td>${badge}</td>
          <td>
            <button type="button" class="btn-action-outline" style="padding: 4px 10px; font-size: 11px; font-weight: 700;" onclick="digemidApp.viewRecord('${escHtml(r.folio)}')">
              <span>👁️ Ver Receta</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// =============================================================
// 10. MÓDULO GESTIÓN DE EQUIPO & ROLES DE PERSONAL
// =============================================================
class StaffManagementModule {
  constructor() {
    this.tableBody = document.getElementById('staffTableBody');
    this.newStaffModal = document.getElementById('newStaffModal');
    this.permModal = document.getElementById('staffPermissionsModal');
    this.currentStaffIndex = null;
    this.render();
  }

  render() {
    if (!this.tableBody) return;

    this.tableBody.innerHTML = staffMembersList.map((m, index) => {
      const isAct = (m.status === 'active');
      const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2);
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="user-avatar" style="width:28px; height:28px; font-size:11px; flex-shrink:0;">${initials}</div>
              <strong>${m.name}</strong>
            </div>
          </td>
          <td><span class="shelf-tag" style="background-color: var(--valetec-blue-light); color: var(--valetec-blue);">${m.role}</span></td>
          <td><strong>${m.terminal}</strong></td>
          <td>${m.shift}</td>
          <td><small style="color: var(--text-muted);">${m.permissions}</small></td>
          <td>
            <span class="pulse-indicator" style="background-color: ${isAct ? 'rgba(0, 212, 178, 0.2)' : '#f1f5f9'}; color: ${isAct ? '#0f766e' : '#64748b'};">
              <i class="bi bi-circle-fill"></i> ${isAct ? 'En Turno' : 'Pausa / Fuera'}
            </span>
          </td>
          <td><strong>${m.target}</strong></td>
          <td>
            <button type="button" class="btn-action-outline btn-staff-perm" data-index="${index}" style="padding: 4px 10px; font-size: 11px; font-weight: 700;" onclick="window.staffApp ? window.staffApp.openPermissionsModal(${index}, event) : window.openPermissionsModal(${index}, event)">
              <span>⚙️ Permisos</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openNewStaffModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    // Cerrar cualquier modal activo para evitar cruces
    document.querySelectorAll('.modal-backdrop-valetec.active').forEach(m => m.classList.remove('active'));

    if (!this.newStaffModal) this.newStaffModal = document.getElementById('newStaffModal');

    // Limpiar formulario y asegurar estado limpio
    const form = document.getElementById('newStaffForm');
    if (form) form.reset();
    const nameEl = document.getElementById('staffNewName');
    if (nameEl) nameEl.value = '';
    const dniEl = document.getElementById('staffNewDni');
    if (dniEl) dniEl.value = '';
    const roleEl = document.getElementById('staffNewRole');
    if (roleEl) roleEl.value = 'tech';
    const termEl = document.getElementById('staffNewTerminal');
    if (termEl) termEl.value = 'Terminal 01';
    const shiftEl = document.getElementById('staffNewShift');
    if (shiftEl) shiftEl.value = 'Mañana (08:00 - 16:00)';
    const targetEl = document.getElementById('staffNewTarget');
    if (targetEl) targetEl.value = 'S/ 1,500.00';
    const pinEl = document.getElementById('staffNewPin');
    if (pinEl) pinEl.value = '1234';
    const statusEl = document.getElementById('staffNewStatus');
    if (statusEl) statusEl.value = 'active';

    if (this.newStaffModal) this.newStaffModal.classList.add('active');
  }

  closeNewStaffModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!this.newStaffModal) this.newStaffModal = document.getElementById('newStaffModal');
    if (this.newStaffModal) this.newStaffModal.classList.remove('active');
  }

  onRoleChange() {
    const role = document.getElementById('staffNewRole')?.value;
    const termSelect = document.getElementById('staffNewTerminal');
    const targetInput = document.getElementById('staffNewTarget');
    if (!termSelect) return;
    if (role === 'cashier') {
      termSelect.value = 'Caja 01';
      if (targetInput) targetInput.value = 'S/ 3,500.00';
    } else if (role === 'qf') {
      termSelect.value = 'Regencia Q.F.';
      if (targetInput) targetInput.value = 'Cumplimiento BPA';
    } else if (role === 'admin') {
      termSelect.value = 'Acceso Remoto Cloud';
      if (targetInput) targetInput.value = 'Rentabilidad 35%';
    } else {
      termSelect.value = 'Terminal 01';
      if (targetInput) targetInput.value = 'S/ 1,500.00';
    }
  }

  saveNewStaff(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const name = document.getElementById('staffNewName')?.value?.trim();
    const dni = document.getElementById('staffNewDni')?.value?.trim();
    const roleKey = document.getElementById('staffNewRole')?.value || 'tech';
    const terminal = document.getElementById('staffNewTerminal')?.value || 'Terminal 01';
    const shift = document.getElementById('staffNewShift')?.value || 'Mañana (08:00 - 16:00)';
    const target = document.getElementById('staffNewTarget')?.value || 'S/ 1,500.00';
    const status = document.getElementById('staffNewStatus')?.value || 'active';

    if (!name || name.length < 3) {
      showValetecToast("Por favor ingresa el nombre y apellidos completos.", "warning");
      return;
    }
    if (!dni || dni.length !== 8 || isNaN(dni)) {
      showValetecToast("El DNI debe tener exactamente 8 dígitos numéricos.", "warning");
      return;
    }

    const roleLabels = {
      admin: "Gerente General",
      qf: "Químico Farmacéutico (Q.F.)",
      tech: "Técnico de Mostrador",
      cashier: "Cajero de Turno"
    };

    const permLabels = {
      admin: "Control Total, Finanzas, Compras",
      qf: "Auditoría, DIGEMID, Lotes",
      tech: "Dispensación, Consulta Stock",
      cashier: "Cobro POS, Arqueo, Egresos"
    };

    const newWorker = {
      name: name,
      role: roleLabels[roleKey] || "Colaborador",
      terminal: terminal,
      shift: shift,
      permissions: permLabels[roleKey] || "Atención y Consulta",
      status: status,
      target: target
    };

    staffMembersList.push(newWorker);
    this.render();
    this.closeNewStaffModal();
    showValetecToast(`Colaborador ${name} registrado con éxito en el sistema.`, 'success');

    // Limpiar formulario
    document.getElementById('newStaffForm')?.reset();
  }

  openPermissionsModal(index, e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const idx = parseInt(index, 10);
    if (isNaN(idx) || !staffMembersList[idx]) return;

    // Cerrar cualquier modal activo previo
    document.querySelectorAll('.modal-backdrop-valetec.active').forEach(m => m.classList.remove('active'));

    if (!this.permModal) this.permModal = document.getElementById('staffPermissionsModal');
    const member = staffMembersList[idx];

    this.currentStaffIndex = idx;
    const idxInput = document.getElementById('permStaffIndex');
    if (idxInput) idxInput.value = idx;

    const nameEl = document.getElementById('permStaffName');
    const roleEl = document.getElementById('permStaffRole');
    const avatarEl = document.getElementById('permAvatar');
    const shiftSelect = document.getElementById('permShiftSelect');
    const termSelect = document.getElementById('permTerminalSelect');

    if (nameEl) nameEl.innerText = member.name;
    if (roleEl) roleEl.innerText = member.role;
    if (avatarEl) avatarEl.innerText = member.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    if (shiftSelect) shiftSelect.value = member.shift;
    if (termSelect) termSelect.value = member.terminal;

    const pStr = (member.permissions || '').toLowerCase();
    const isOwner = member.role.toLowerCase().includes('gerente') || member.role.toLowerCase().includes('dueño') || member.role.toLowerCase().includes('admin');
    const isQf = member.role.toLowerCase().includes('regente') || member.role.toLowerCase().includes('químico');
    const isCashier = member.role.toLowerCase().includes('cajero');

    const cbCounter = document.getElementById('permModuleCounter');
    const cbCash = document.getElementById('permModuleCash');
    const cbWh = document.getElementById('permModuleWarehouse');
    const cbDig = document.getElementById('permModuleDigemid');
    const cbStaff = document.getElementById('permModuleStaff');
    const cbMgmt = document.getElementById('permModuleManagement');

    if (cbCounter) cbCounter.checked = true;
    if (cbCash) cbCash.checked = isOwner || isCashier || pStr.includes('arqueo') || pStr.includes('cobro') || pStr.includes('caja');
    if (cbWh) cbWh.checked = isOwner || isQf || pStr.includes('lotes') || pStr.includes('stock') || pStr.includes('almacén');
    if (cbDig) cbDig.checked = isOwner || isQf || pStr.includes('digemid') || pStr.includes('recetas');
    if (cbStaff) cbStaff.checked = isOwner || pStr.includes('control total') || pStr.includes('personal');
    if (cbMgmt) cbMgmt.checked = isOwner || pStr.includes('finanzas') || pStr.includes('gerencia');

    if (this.permModal) this.permModal.classList.add('active');
  }

  closePermissionsModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!this.permModal) this.permModal = document.getElementById('staffPermissionsModal');
    if (this.permModal) this.permModal.classList.remove('active');
  }

  savePermissions(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const idxInput = document.getElementById('permStaffIndex');
    const index = parseInt(idxInput?.value ?? this.currentStaffIndex, 10);
    if (isNaN(index) || !staffMembersList[index]) return;

    const member = staffMembersList[index];
    const shift = document.getElementById('permShiftSelect')?.value;
    const terminal = document.getElementById('permTerminalSelect')?.value;

    const modules = [];
    if (document.getElementById('permModuleCounter')?.checked) modules.push("Ventas");
    if (document.getElementById('permModuleCash')?.checked) modules.push("Caja");
    if (document.getElementById('permModuleWarehouse')?.checked) modules.push("Almacén");
    if (document.getElementById('permModuleDigemid')?.checked) modules.push("DIGEMID");
    if (document.getElementById('permModuleStaff')?.checked) modules.push("Personal");
    if (document.getElementById('permModuleManagement')?.checked) modules.push("Gerencia");

    member.shift = shift || member.shift;
    member.terminal = terminal || member.terminal;
    member.permissions = modules.join(', ') || "Consulta básica";

    this.render();
    this.closePermissionsModal();
    showValetecToast(`Permisos y horarios de ${member.name} actualizados exitosamente.`, 'success');
  }

  // =============================================================
}

// 10. MÓDULO DE CLASIFICACIÓN (CATEGORÍAS Y LABORATORIOS) - MÓDULO 2
// =============================================================
class ClassificationModule {
  constructor() {
    this.modal = document.getElementById('classificationModal');
    this.categoriesTable = document.getElementById('categoriesTableBody');
    this.laboratoriesTable = document.getElementById('laboratoriesTableBody');
    this.tabCategories = document.getElementById('classificationCategoriesTab');
    this.tabLaboratories = document.getElementById('classificationLaboratoriesTab');
    this.btnTabCategories = document.getElementById('tabBtnCategories');
    this.btnTabLaboratories = document.getElementById('tabBtnLaboratories');
    this.categories = [];
    this.laboratories = [];
  }

  openModal() {
    if (this.modal) this.modal.classList.add('active');
    this.switchTab('categories');
    this.loadCategories();
    this.loadLaboratories();
  }

  closeModal() {
    if (this.modal) this.modal.classList.remove('active');
  }

  switchTab(tab) {
    if (tab === 'categories') {
      if (this.tabCategories) this.tabCategories.style.display = 'block';
      if (this.tabLaboratories) this.tabLaboratories.style.display = 'none';
      if (this.btnTabCategories) {
        this.btnTabCategories.className = 'btn-action-solid';
        this.btnTabCategories.style.background = '#0a2540';
      }
      if (this.btnTabLaboratories) {
        this.btnTabLaboratories.className = 'btn-action-outline';
        this.btnTabLaboratories.style.background = 'transparent';
      }
    } else {
      if (this.tabCategories) this.tabCategories.style.display = 'none';
      if (this.tabLaboratories) this.tabLaboratories.style.display = 'block';
      if (this.btnTabLaboratories) {
        this.btnTabLaboratories.className = 'btn-action-solid';
        this.btnTabLaboratories.style.background = '#0a2540';
      }
      if (this.btnTabCategories) {
        this.btnTabCategories.className = 'btn-action-outline';
        this.btnTabCategories.style.background = 'transparent';
      }
    }
  }

  async loadCategories() {
    if (!window.api) return;
    try {
      const res = await window.api.getCategories();
      if (res && res.data) {
        this.categories = res.data;
        this.renderCategories();
        this.updateCategoryDropdowns();
      }
    } catch (err) {
      console.warn("Error cargando categorías:", err.message);
    }
  }

  async loadLaboratories() {
    if (!window.api) return;
    try {
      const res = await window.api.getLaboratories();
      if (res && res.data) {
        this.laboratories = res.data;
        this.renderLaboratories();
      }
    } catch (err) {
      console.warn("Error cargando laboratorios:", err.message);
    }
  }

  renderCategories() {
    if (!this.categoriesTable) return;
    if (this.categories.length === 0) {
      this.categoriesTable.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Sin categorías registradas.</td></tr>';
      return;
    }

    this.categoriesTable.innerHTML = this.categories.map(c => `
      <tr>
        <td><code>#${c.id}</code></td>
        <td><strong><i class="bi ${c.icon || 'bi-capsule'} text-teal"></i> ${c.name}</strong></td>
        <td><code>${c.slug}</code></td>
        <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; padding:4px 8px; border-radius:6px;">${c.productCount || 0} medicamentos</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="classificationApp.editCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.icon || ''}')" title="Editar Categoría">
            ✏️ Editar
          </button>
          <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; color:#0284c7;" onclick="classificationApp.reassignCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')" title="Reasignar Medicamentos a otra categoría">
            🔄 Reasignar
          </button>
          <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; color:#dc2626;" onclick="classificationApp.deleteCategory(${c.id}, ${c.productCount || 0}, '${c.name.replace(/'/g, "\\'")}')" title="Eliminar Categoría">
            🗑️ Eliminar
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderLaboratories() {
    if (!this.laboratoriesTable) return;
    if (this.laboratories.length === 0) {
      this.laboratoriesTable.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Sin laboratorios registrados.</td></tr>';
      return;
    }

    this.laboratoriesTable.innerHTML = this.laboratories.map(l => `
      <tr>
        <td><code>#${l.id}</code></td>
        <td><strong><i class="bi bi-building text-blue"></i> ${l.name}</strong></td>
        <td><span>🇵🇪 ${l.country || 'Perú'}</span></td>
        <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; padding:4px 8px; border-radius:6px;">${l.productCount || 0} medicamentos</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="classificationApp.editLaboratory(${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.country || 'Perú'}', '${l.contact || ''}')" title="Editar Laboratorio">
            ✏️ Editar
          </button>
          <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; color:#0284c7;" onclick="classificationApp.reassignLaboratory('${l.name.replace(/'/g, "\\'")}')" title="Reasignar Medicamentos a otro laboratorio">
            🔄 Reasignar
          </button>
          <button type="button" class="btn-action-outline" style="padding: 4px 8px; font-size: 11px; color:#dc2626;" onclick="classificationApp.deleteLaboratory(${l.id}, ${l.productCount || 0}, '${l.name.replace(/'/g, "\\'")}')" title="Eliminar Laboratorio">
            🗑️ Eliminar
          </button>
        </td>
      </tr>
    `).join('');
  }

  updateCategoryDropdowns() {
    const medCatSelect = document.getElementById('medCategoryId');
    if (medCatSelect && this.categories.length > 0) {
      const currentVal = medCatSelect.value;
      medCatSelect.innerHTML = this.categories.map(c => `
        <option value="${c.id}">${c.name}</option>
      `).join('');
      if (currentVal) medCatSelect.value = currentVal;
    }
  }

  async createCategory(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('newCatName')?.value.trim();
    const icon = document.getElementById('newCatIcon')?.value.trim() || 'bi-capsule';
    if (!name) return;

    try {
      if (window.api) {
        const res = await window.api.createCategory({ name, icon });
        showValetecToast(res.message || `Categoría "${name}" creada.`, "success");
        document.getElementById('newCatName').value = '';
        await this.loadCategories();
      }
    } catch (err) {
      showValetecToast("Error al crear categoría: " + err.message, "error");
    }
  }

  async createLaboratory(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('newLabName')?.value.trim();
    const country = document.getElementById('newLabCountry')?.value.trim() || 'Perú';
    const contact = document.getElementById('newLabContact')?.value.trim() || '';
    if (!name) return;

    try {
      if (window.api) {
        const res = await window.api.createLaboratory({ name, country, contact });
        showValetecToast(res.message || `Laboratorio "${name}" registrado.`, "success");
        document.getElementById('newLabName').value = '';
        document.getElementById('newLabContact').value = '';
        await this.loadLaboratories();
      }
    } catch (err) {
      showValetecToast("Error al registrar laboratorio: " + err.message, "error");
    }
  }

  async editCategory(id, currentName, currentIcon) {
    const newName = prompt(`Editar nombre de la categoría:`, currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

    try {
      if (window.api) {
        const res = await window.api.updateCategory(id, { name: newName.trim(), icon: currentIcon });
        showValetecToast(res.message || "Categoría actualizada.", "success");
        await this.loadCategories();
      }
    } catch (err) {
      showValetecToast("Error al editar categoría: " + err.message, "error");
    }
  }

  async editLaboratory(id, currentName, currentCountry, currentContact) {
    const newName = prompt(`Editar nombre del laboratorio:`, currentName);
    if (!newName || newName.trim() === '') return;

    const newCountry = prompt(`País de origen:`, currentCountry) || 'Perú';

    try {
      if (window.api) {
        const res = await window.api.updateLaboratory(id, { name: newName.trim(), country: newCountry.trim(), contact: currentContact });
        showValetecToast(res.message || "Laboratorio actualizado.", "success");
        await this.loadLaboratories();
        await syncWithBackend();
      }
    } catch (err) {
      showValetecToast("Error al editar laboratorio: " + err.message, "error");
    }
  }

  async deleteCategory(id, count, name) {
    if (count > 0) {
      showValetecToast(`⚠️ Operación denegada: La categoría "${name}" tiene ${count} fármacos asociados.`, "warning");
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la categoría "${name}"?`)) return;

    try {
      if (window.api) {
        const res = await window.api.deleteCategory(id);
        showValetecToast(res.message || "Categoría eliminada.", "success");
        await this.loadCategories();
      }
    } catch (err) {
      showValetecToast("Error al eliminar categoría: " + err.message, "error");
    }
  }

  async deleteLaboratory(id, count, name) {
    if (count > 0) {
      showValetecToast(`⚠️ Operación denegada: El laboratorio "${name}" tiene ${count} fármacos asociados.`, "warning");
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el laboratorio "${name}"?`)) return;

    try {
      if (window.api) {
        const res = await window.api.deleteLaboratory(id);
        showValetecToast(res.message || "Laboratorio eliminado.", "success");
        await this.loadLaboratories();
      }
    } catch (err) {
      showValetecToast("Error al eliminar laboratorio: " + err.message, "error");
    }
  }

  async reassignCategory(sourceId, name) {
    const options = this.categories
      .filter(c => c.id != sourceId)
      .map(c => `#${c.id} - ${c.name}`)
      .join('\n');

    if (!options) {
      showValetecToast("No hay otras categorías disponibles para reasignar.", "warning");
      return;
    }

    const input = prompt(`Mover TODOS los medicamentos de "${name}" hacia otra categoría.\n\nEscriba el ID de destino:\n${options}`);
    if (!input) return;

    const targetId = parseInt(input.replace(/[^\d]/g, ''), 10);
    if (!targetId || targetId === sourceId) {
      showValetecToast("ID de categoría destino inválido.", "warning");
      return;
    }

    try {
      if (window.api) {
        const res = await window.api.reassignCategory(sourceId, targetId);
        showValetecToast(res.message || "Medicamentos reasignados con éxito.", "success");
        await this.loadCategories();
        await syncWithBackend();
      }
    } catch (err) {
      showValetecToast("Error al reasignar: " + err.message, "error");
    }
  }

  async reassignLaboratory(sourceLabName) {
    const otherLabs = this.laboratories
      .filter(l => l.name.toLowerCase() !== sourceLabName.toLowerCase())
      .map(l => l.name)
      .join('\n• ');

    if (!otherLabs) {
      showValetecToast("No hay otros laboratorios registrados para reasignar.", "warning");
      return;
    }

    const targetName = prompt(`Mover TODOS los medicamentos de "${sourceLabName}" hacia otro laboratorio.\n\nEscriba exactamente el nombre del laboratorio destino:\n• ${otherLabs}`);
    if (!targetName || targetName.trim() === '' || targetName.trim().toLowerCase() === sourceLabName.toLowerCase()) return;

    try {
      if (window.api) {
        const res = await window.api.reassignLaboratory(sourceLabName, targetName.trim());
        showValetecToast(res.message || "Medicamentos reasignados con éxito.", "success");
        await this.loadLaboratories();
        await syncWithBackend();
      }
    } catch (err) {
      showValetecToast("Error al reasignar: " + err.message, "error");
    }
  }
}

// =============================================================
// 10.1 MÓDULO DE CLIENTES & PADRÓN FISCAL DNI / RUC (MÓDULO 5)
// =============================================================
class ClientsModule {
  constructor() {
    this.quickModal = document.getElementById('quickClientModal');
    this.directoryModal = document.getElementById('clientsDirectoryModal');
    this.tableBody = document.getElementById('clientsTableBody');
    this.alertBox = document.getElementById('quickClientAlert');
    this.alertMsg = document.getElementById('quickClientAlertMsg');
    this.inDocType = document.getElementById('quickClientDocType');
    this.inDocNumber = document.getElementById('quickClientDocNumber');
    this.inFullName = document.getElementById('quickClientFullName');
    this.inPhone = document.getElementById('quickClientPhone');
    this.inEmail = document.getElementById('quickClientEmail');
    this.inAddress = document.getElementById('quickClientAddress');
    this.inSearch = document.getElementById('directoryClientSearch');
    this.clientsList = [];
    this.searchTimeout = null;
  }

  openQuickModal(defaultDoc = '') {
    this.clearAlert();
    const docClean = (typeof defaultDoc === 'string') ? defaultDoc.trim() : '';
    if (this.inDocType && this.inDocNumber) {
      if (docClean.length === 11 || docClean.startsWith('20') || docClean.startsWith('10')) {
        this.inDocType.value = 'RUC';
        this.inDocNumber.maxLength = 11;
        this.inDocNumber.placeholder = 'Ej. 20514896321 (11 dígitos)';
      } else {
        this.inDocType.value = 'DNI';
        this.inDocNumber.maxLength = 8;
        this.inDocNumber.placeholder = 'Ej. 45892147 (8 dígitos)';
      }
      this.inDocNumber.value = docClean;
    }
    if (this.inFullName) this.inFullName.value = '';
    if (this.inPhone) this.inPhone.value = '';
    if (this.inEmail) this.inEmail.value = '';
    if (this.inAddress) this.inAddress.value = '';

    if (this.quickModal) this.quickModal.classList.add('active');
    setTimeout(() => {
      if (docClean) {
        this.inFullName?.focus();
      } else {
        this.inDocNumber?.focus();
      }
    }, 100);
  }

  closeQuickModal() {
    if (this.quickModal) this.quickModal.classList.remove('active');
    this.clearAlert();
  }

  onDocTypeChange() {
    this.clearAlert();
    const type = this.inDocType?.value || 'DNI';
    if (this.inDocNumber) {
      if (type === 'RUC') {
        this.inDocNumber.maxLength = 11;
        this.inDocNumber.placeholder = 'Ej. 20514896321 (11 dígitos)';
      } else {
        this.inDocNumber.maxLength = 8;
        this.inDocNumber.placeholder = 'Ej. 45892147 (8 dígitos)';
      }
      this.inDocNumber.value = this.inDocNumber.value.slice(0, this.inDocNumber.maxLength);
    }
  }

  clearAlert() {
    if (this.alertBox) this.alertBox.style.display = 'none';
    if (this.alertMsg) this.alertMsg.innerText = '';
  }

  showAlert(msg) {
    if (this.alertBox && this.alertMsg) {
      this.alertMsg.innerText = msg;
      this.alertBox.style.display = 'block';
    } else {
      showValetecToast(msg, "warning");
    }
  }

  async saveClient(e) {
    if (e) e.preventDefault();
    this.clearAlert();

    const docType = this.inDocType?.value || 'DNI';
    const docNum = this.inDocNumber?.value.trim() || '';
    const fullName = this.inFullName?.value.trim() || '';
    const phone = this.inPhone?.value.trim() || '';
    const email = this.inEmail?.value.trim() || '';
    const address = this.inAddress?.value.trim() || '';

    if (!docNum) {
      this.showAlert("Por favor escribe el número de documento.");
      this.inDocNumber?.focus();
      return;
    }

    if (!fullName) {
      this.showAlert("Por favor escribe el nombre completo o razón social.");
      this.inFullName?.focus();
      return;
    }

    // Validación visual de longitud DNI (8 dígitos)
    if (docType === 'DNI') {
      if (!/^\d{8}$/.test(docNum)) {
        this.showAlert("⚠️ Error de validación: El DNI debe tener exactamente 8 dígitos numéricos.");
        this.inDocNumber?.focus();
        return;
      }
    }

    // Validación visual de longitud RUC (11 dígitos y prefijo SUNAT)
    if (docType === 'RUC') {
      if (!/^\d{11}$/.test(docNum)) {
        this.showAlert("⚠️ Error de validación: El RUC debe tener exactamente 11 dígitos numéricos.");
        this.inDocNumber?.focus();
        return;
      }
      if (!docNum.startsWith('10') && !docNum.startsWith('20') && !docNum.startsWith('15') && !docNum.startsWith('17')) {
        this.showAlert("⚠️ Error SUNAT: El RUC debe iniciar con 10, 20, 15 o 17.");
        this.inDocNumber?.focus();
        return;
      }
    }

    const submitBtn = document.getElementById('btnSaveClientSubmit');
    const origText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Guardando en PostgreSQL...`;
    }

    try {
      if (window.api) {
        const res = await window.api.createClient({
          documentType: docType,
          documentNumber: docNum,
          fullName,
          phone,
          email,
          address
        });

        if (!res || !res.success) {
          throw new Error(res?.message || "No se pudo guardar el cliente.");
        }

        const newClient = res.data;
        showValetecToast(`Cliente "${newClient.fullName}" registrado exitosamente.`, "success");
        this.closeQuickModal();

        // Asignar al carrito de compras en mostrador (preserva los productos agregados)
        this.assignClientToCounter(newClient);

        // Si el directorio de clientes está abierto, actualizar tabla
        if (this.directoryModal?.classList.contains('active')) {
          this.loadClients();
        }
      }
    } catch (err) {
      this.showAlert(err.message || "Error al registrar cliente.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }
  }

  assignClientToCounter(client) {
    if (!client) return;
    const docInput = document.getElementById('patientDocInput');
    const statusLine = document.getElementById('patientStatusLine');

    if (docInput) docInput.value = client.documentNumber;
    if (statusLine) {
      // Hotfix V-06: Escapar fullName contra XSS Stored desde backend/formulario de clientes
      statusLine.innerHTML = `
        <span class="p-name">👤 ${escHtml(client.fullName)}</span>
        <span class="p-points"><i class="bi bi-star-fill text-warning"></i> ${parseInt(client.pointsBalance, 10) || 0} Puntos</span>
      `;
    }
    showValetecToast(`Cliente "${escHtml(client.fullName)}" asignado a la venta en curso.`, "success");
  }

  openDirectoryModal() {
    if (this.directoryModal) this.directoryModal.classList.add('active');
    if (this.inSearch) this.inSearch.value = '';
    this.loadClients();
  }

  closeDirectoryModal() {
    if (this.directoryModal) this.directoryModal.classList.remove('active');
  }

  async loadClients() {
    if (!window.api) return;
    try {
      const res = await window.api.getClients();
      if (res && res.data) {
        this.clientsList = res.data;
        this.renderClients(this.clientsList);
      }
    } catch (err) {
      console.warn("Error cargando clientes:", err.message);
    }
  }

  onSearchInput(e) {
    clearTimeout(this.searchTimeout);
    const q = e.target.value.trim();
    this.searchTimeout = setTimeout(async () => {
      if (!q) {
        this.renderClients(this.clientsList);
        return;
      }
      try {
        if (window.api) {
          const res = await window.api.searchClients(q);
          if (res && res.data) {
            this.renderClients(res.data);
          }
        }
      } catch (err) {
        console.warn("Error buscando clientes:", err.message);
      }
    }, 250);
  }

  renderClients(clients) {
    if (!this.tableBody) return;
    if (!clients || clients.length === 0) {
      this.tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">No se encontraron clientes registrados en el padrón.</td></tr>';
      return;
    }

    this.tableBody.innerHTML = clients.map(c => {
      const isRuc = c.documentType === 'RUC';
      const badgeStyle = isRuc
        ? 'background: #f3e8ff; color: #7e22ce;'
        : (c.documentType === 'DNI' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #f1f5f9; color: #475569;');
      const clientSafeData = {
        id: c.id,
        documentType: c.documentType,
        documentNumber: c.documentNumber,
        fullName: c.fullName,
        pointsBalance: c.pointsBalance || 0
      };
      const clientJson = encodeURIComponent(JSON.stringify(clientSafeData));

      return `
        <tr>
          <td>
            <span class="badge" style="${badgeStyle} font-weight: 800; padding: 3px 6px; border-radius: 4px; font-size: 11px;">
              ${escHtml(c.documentType)}
            </span>
            <strong style="margin-left: 6px; font-family: monospace;">${escHtml(c.documentNumber)}</strong>
          </td>
          <td><strong>${escHtml(c.fullName)}</strong></td>
          <td><small>${escHtml(c.phone) || '—'}</small></td>
          <td><small style="color: #64748b;">${escHtml(c.email) || '—'}</small></td>
          <td><small style="color: #64748b;">${escHtml(c.address) || '—'}</small></td>
          <td style="text-align: center;">
            <span class="badge" style="background: #fefce8; color: #a16207; font-weight: 700; padding: 4px 8px; border-radius: 6px;">
              ⭐ ${parseInt(c.pointsBalance, 10) || 0}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn-action-solid" style="padding: 4px 10px; font-size: 11px; background: #0d9488; color: white; border: none; border-radius: 4px;" onclick="clientsApp.selectAndAssign('${clientJson}')" title="Asignar al Carrito de Ventas">
              🛒 Asignar
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  selectAndAssign(clientJsonStr) {
    try {
      let raw = clientJsonStr;
      if (typeof raw === 'string' && raw.includes('%')) {
        raw = decodeURIComponent(raw);
      } else if (typeof raw === 'string') {
        raw = raw.replace(/&quot;/g, '"');
      }
      const client = typeof raw === 'object' ? raw : JSON.parse(raw);
      this.assignClientToCounter(client);
      this.closeDirectoryModal();
    } catch (e) {
      console.warn("Error asignando cliente:", e);
    }
  }
}

// =============================================================
// 11. TOAST NOTIFICACIONES VALETEC
// =============================================================
function showValetecToast(message, type = 'success') {
  const toast = document.getElementById('valetecToast');
  const msg = document.getElementById('toastMessage');
  const icon = document.getElementById('toastIcon');
  if (!toast || !msg) return;

  msg.innerText = message;
  if (icon) {
    if (type === 'danger') icon.className = 'bi bi-x-circle-fill text-danger';
    else if (type === 'warning') icon.className = 'bi bi-exclamation-triangle-fill text-warning';
    else if (type === 'info') icon.className = 'bi bi-info-circle-fill text-blue';
    else icon.className = 'bi bi-check-circle-fill text-teal';
  }

  toast.classList.add('show');
  clearTimeout(window._valetecToastTimeout);
  window._valetecToastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function drawSalesChart(canvas, chartData, mode = 'daily') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.parentElement?.clientWidth || 360;
  const height = rect.height || 230;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const items = (mode === 'hourly') ? (chartData?.hourlyToday || []) : (chartData?.daily || []);

  if (!items || items.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin transacciones registradas en este período', width / 2, height / 2);
    return;
  }

  const padding = { top: 25, right: 15, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...items.map(d => Number(d.totalSales) || 0), 50) * 1.15;

  // Líneas guía horizontales
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + chartH - (i / gridSteps) * chartH;
    const val = (i / gridSteps) * maxVal;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`S/ ${Math.round(val)}`, padding.left - 6, y + 3);
  }

  // Barras de ventas
  const barCount = items.length;
  const barWidth = Math.max(14, Math.min(38, (chartW / barCount) * 0.55));
  const spacing = chartW / barCount;

  items.forEach((item, idx) => {
    const cx = padding.left + idx * spacing + spacing / 2;
    const x = cx - barWidth / 2;
    const totalSales = Number(item.totalSales) || 0;
    const totalH = (totalSales / maxVal) * chartH;
    const y = padding.top + chartH - totalH;

    if (mode === 'daily') {
      const cashSales = Number(item.cashSales) || 0;
      const cashH = (cashSales / maxVal) * chartH;
      const digH = Math.max(0, totalH - cashH);

      // Parte digital (azul #0066cc) en la parte superior
      if (digH > 0) {
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(x, y, barWidth, digH);
      }
      // Parte en efectivo (teal #00d4b2) en la base
      if (cashH > 0) {
        ctx.fillStyle = '#00d4b2';
        ctx.fillRect(x, y + (digH > 0 ? digH : 0), barWidth, cashH);
      }
    } else {
      ctx.fillStyle = '#0066cc';
      ctx.fillRect(x, y, barWidth, totalH);
    }

    // Etiqueta superior con monto
    if (totalSales > 0) {
      ctx.fillStyle = '#0a2540';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`S/${Math.round(totalSales)}`, cx, Math.max(12, y - 4));
    }

    // Etiqueta inferior con fecha u hora
    ctx.fillStyle = '#64748b';
    ctx.font = '9.5px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const bottomLabel = (mode === 'hourly') ? item.label : (item.dayName ? `${item.dayName} ${item.date?.slice(8)}` : (item.date?.slice(5) || ''));
    ctx.fillText(bottomLabel, cx, height - 10);
  });
}

function drawTopProductsChart(canvas, products) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.parentElement?.clientWidth || 360;
  const height = rect.height || 230;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  if (!products || products.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin productos vendidos aún', width / 2, height / 2);
    return;
  }

  const list = products.slice(0, 5);
  const maxUnits = Math.max(...list.map(p => Number(p.unitsSold) || 0), 1);
  const rowCount = list.length;
  const rowH = (height - 10) / rowCount;

  list.forEach((p, idx) => {
    const y = 8 + idx * rowH;
    const barW = width - 24;
    const trackY = y + 17;
    const trackH = 9;
    const units = Number(p.unitsSold) || 0;
    const fillW = Math.max(8, (units / maxUnits) * (barW - 8));

    // Título y puesto
    ctx.fillStyle = '#0a2540';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const nameText = p.name.length > 25 ? p.name.substring(0, 23) + '...' : p.name;
    ctx.fillText(`${idx + 1}. ${nameText}`, 12, y + 10);

    // Ingresos y unidades a la derecha
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${units} unids · S/ ${Number(p.revenue).toFixed(2)}`, width - 12, y + 10);

    // Pista de fondo
    ctx.fillStyle = '#f1f5f9';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(12, trackY, barW, trackH, 4);
      ctx.fill();
    } else {
      ctx.fillRect(12, trackY, barW, trackH);
    }

    // Relleno progresivo con gradiente teal-a-azul
    const grad = ctx.createLinearGradient(12, 0, 12 + fillW, 0);
    grad.addColorStop(0, '#00d4b2');
    grad.addColorStop(1, '#0066cc');
    ctx.fillStyle = grad;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(12, trackY, fillW, trackH, 4);
      ctx.fill();
    } else {
      ctx.fillRect(12, trackY, fillW, trackH);
    }
  });
}

function updateManagementDashboard(reportData) {
  if (!reportData) return;
  const f = reportData.financials || reportData.kpis;
  if (f) {
    const todaySalesEl = document.getElementById('mgmtTodaySales');
    const grossProfitEl = document.getElementById('mgmtGrossProfit');
    const patientsEl = document.getElementById('mgmtPatientsCount');
    const avgTicketEl = document.getElementById('mgmtAvgTicket');
    const marginEl = document.getElementById('mgmtGrossMargin');
    const todaySubEl = document.getElementById('mgmtTodaySub');

    const displaySales = f.todaySales > 0 ? f.todaySales : f.monthSales;
    if (todaySalesEl) todaySalesEl.innerText = `S/ ${Number(displaySales).toFixed(2)}`;
    if (grossProfitEl) grossProfitEl.innerText = `S/ ${Number(f.estimatedProfit).toFixed(2)}`;
    const totalCount = (f.todayVouchers && f.todayVouchers > 0) ? f.todayVouchers : (f.monthVouchers || 0);
    if (patientsEl) patientsEl.innerText = `${totalCount} Comprobantes`;
    if (avgTicketEl) avgTicketEl.innerHTML = `Ticket promedio: <strong>S/ ${Number(f.averageTicket).toFixed(2)}</strong>`;
    if (marginEl) marginEl.innerHTML = `Margen comercial: <strong>${f.profitMarginPercent}%</strong>`;
    if (todaySubEl) {
      if (f.todaySales > 0) {
        todaySubEl.innerHTML = `<i class="bi bi-arrow-up-right"></i> ${f.todayVouchers} comprobantes hoy • S/ ${Number(f.todayCashSales || f.todaySales).toFixed(2)} cobrado`;
      } else {
        todaySubEl.innerHTML = `<i class="bi bi-arrow-up-right"></i> Acumulado mes: S/ ${Number(f.monthSales).toFixed(2)}`;
      }
    }
  }

  const inv = reportData.inventoryFefo || reportData.inventory;
  if (inv) {
    const lowStockEl = document.getElementById('mgmtLowStockCount');
    if (lowStockEl) lowStockEl.innerText = `${inv.warningLots} Lotes`;
  }
}

// =============================================================
// 11. MÓDULO TORRE DE CONTROL & DASHBOARD GERENCIAL
// =============================================================
class ManagementDashboardModule {
  constructor() {
    this.salesCanvas = document.getElementById('salesChartCanvas');
    this.topCanvas = document.getElementById('topProductsCanvas');
    this.btnDaily = document.getElementById('btnChartDaily');
    this.btnHourly = document.getElementById('btnChartHourly');
    this.topCountLabel = document.getElementById('topProductsCountLabel');
    this.salesMode = 'daily';

    // Datos iniciales seguros para renderizado reactivo instantáneo (Fase 90%)
    this.chartData = {
      daily: [
        { date: '2026-09-19', dayName: 'Sáb', cashSales: 350.00, digitalSales: 815.00, totalSales: 1165.00 },
        { date: '2026-09-20', dayName: 'Dom', cashSales: 0.00, digitalSales: 0.00, totalSales: 0.00 },
        { date: '2026-09-21', dayName: 'Lun', cashSales: 420.00, digitalSales: 649.00, totalSales: 1069.00 },
        { date: '2026-09-22', dayName: 'Mar', cashSales: 0.00, digitalSales: 4.55, totalSales: 4.55 },
        { date: '2026-09-23', dayName: 'Mié', cashSales: 1840.50, digitalSales: 3052.00, totalSales: 4892.50 }
      ],
      hourlyToday: [
        { hour: 8, label: '08:00', totalSales: 250.00 },
        { hour: 10, label: '10:00', totalSales: 680.00 },
        { hour: 12, label: '12:00', totalSales: 1240.00 },
        { hour: 14, label: '14:00', totalSales: 890.00 },
        { hour: 16, label: '16:00', totalSales: 1832.50 }
      ]
    };
    this.topProductsData = [
      { name: "Gastro-Bismut 262mg Masticables", unitsSold: 193, revenue: 84.40 },
      { name: "Valetec-Dol Forte 500mg", unitsSold: 82, revenue: 117.30 },
      { name: "Farma-Naprox 550mg Tabletas", unitsSold: 39, revenue: 2021.90 },
      { name: "Paracetamol 500mg DCI Genérico", unitsSold: 11, revenue: 14.30 },
      { name: "Sedafarma 2mg Ranuradas", unitsSold: 1, revenue: 0.65 }
    ];

    this.initEvents();
    this.renderSales();
    this.renderTopProducts();
  }

  registerLocalSale(saleData) {
    if (!saleData) return;
    const saleTotal = parseFloat(saleData.total || 0);

    // 1. Actualizar KPIs del Cockpit Gerencial
    const todaySalesEl = document.getElementById('mgmtTodaySales');
    const grossProfitEl = document.getElementById('mgmtGrossProfit');
    const patientsEl = document.getElementById('mgmtPatientsCount');

    if (todaySalesEl) {
      const current = parseFloat((todaySalesEl.innerText || '').replace(/[^0-9.]/g, '')) || 0;
      todaySalesEl.innerText = `S/ ${(current + saleTotal).toFixed(2)}`;
    }
    if (grossProfitEl) {
      const current = parseFloat((grossProfitEl.innerText || '').replace(/[^0-9.]/g, '')) || 0;
      grossProfitEl.innerText = `S/ ${(current + (saleTotal * 0.35)).toFixed(2)}`;
    }
    if (patientsEl) {
      const current = parseInt((patientsEl.innerText || '').replace(/[^0-9]/g, ''), 10) || 0;
      patientsEl.innerText = `${current + 1} Comprobantes`;
    }

    // 2. Actualizar Top Productos Más Vendidos
    if (Array.isArray(saleData.items) && Array.isArray(this.topProductsData)) {
      saleData.items.forEach(item => {
        const pName = item.productName || '';
        let existing = this.topProductsData.find(tp => tp.name.toLowerCase() === pName.toLowerCase());
        const qty = parseInt(item.quantity || 1, 10);
        const rev = parseFloat(item.subtotal || (item.unitPrice * qty) || 0);

        if (existing) {
          existing.unitsSold = (existing.unitsSold || 0) + qty;
          existing.revenue = (existing.revenue || 0) + rev;
        } else {
          this.topProductsData.push({
            name: pName,
            unitsSold: qty,
            revenue: rev
          });
        }
      });

      this.topProductsData.sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0));
      this.renderTopProducts();
    }

    // 3. Actualizar Gráfico de Ventas en Canvas
    if (this.chartData) {
      const isCash = saleData.paymentMethod === 'cash';
      if (Array.isArray(this.chartData.daily) && this.chartData.daily.length > 0) {
        const lastDay = this.chartData.daily[this.chartData.daily.length - 1];
        lastDay.totalSales = (lastDay.totalSales || 0) + saleTotal;
        if (isCash) lastDay.cashSales = (lastDay.cashSales || 0) + saleTotal;
        else lastDay.digitalSales = (lastDay.digitalSales || 0) + saleTotal;
      }
      if (Array.isArray(this.chartData.hourlyToday) && this.chartData.hourlyToday.length > 0) {
        const lastHour = this.chartData.hourlyToday[this.chartData.hourlyToday.length - 1];
        lastHour.totalSales = (lastHour.totalSales || 0) + saleTotal;
      }
      this.renderSales();
    }
  }

  initEvents() {
    if (this.btnDaily) {
      this.btnDaily.addEventListener('click', () => {
        this.salesMode = 'daily';
        this.btnDaily.classList.add('active');
        this.btnHourly?.classList.remove('active');
        this.renderSales();
      });
    }
    if (this.btnHourly) {
      this.btnHourly.addEventListener('click', () => {
        this.salesMode = 'hourly';
        this.btnHourly.classList.add('active');
        this.btnDaily?.classList.remove('active');
        this.renderSales();
      });
    }
    window.addEventListener('resize', () => {
      this.renderSales();
      this.renderTopProducts();
    });
  }

  async loadAll() {
    try {
      // 1. Cargar KPIs consolidados
      let kpiData = null;
      try {
        const res = await window.api.getDashboardKpis();
        if (res && res.data) kpiData = res.data;
      } catch (_) {
        const fallback = await window.api.getDashboardStats();
        if (fallback && fallback.data) kpiData = fallback.data;
      }
      if (kpiData) updateManagementDashboard(kpiData);

      // 2. Cargar Gráfico de Ventas
      try {
        const chartRes = await window.api.getSalesChart();
        if (chartRes && chartRes.data) {
          this.chartData = chartRes.data;
          this.renderSales();
        }
      } catch (e) {
        console.warn("Aviso cargando sales chart:", e.message);
      }

      // 3. Cargar Top Productos
      try {
        const topRes = await window.api.getTopProducts(5);
        if (topRes && topRes.data) {
          this.topProductsData = topRes.data;
          if (this.topCountLabel) {
            this.topCountLabel.innerText = `${topRes.count || topRes.data.length} Medicamentos con rotación`;
          }
          this.renderTopProducts();
        }
      } catch (e) {
        console.warn("Aviso cargando top products:", e.message);
      }
    } catch (err) {
      console.warn("Error en loadAll dashboard:", err.message);
    }
  }

  renderSales() {
    if (this.salesCanvas && this.chartData) {
      drawSalesChart(this.salesCanvas, this.chartData, this.salesMode);
    }
  }

  renderTopProducts() {
    if (this.topCanvas && this.topProductsData) {
      drawTopProductsChart(this.topCanvas, this.topProductsData);
    }
  }

  openWhatsAppOrderModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    // Cerrar cualquier otro modal activo para evitar cruces
    document.querySelectorAll('.modal-backdrop-valetec.active').forEach(m => m.classList.remove('active'));

    this.whatsAppModal = document.getElementById('whatsappOrderModal');
    this.updateWhatsAppMessage();
    if (this.whatsAppModal) this.whatsAppModal.classList.add('active');
  }

  closeWhatsAppModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!this.whatsAppModal) this.whatsAppModal = document.getElementById('whatsappOrderModal');
    if (this.whatsAppModal) this.whatsAppModal.classList.remove('active');
  }

  getSuggestedItemsText(supplierFilter = 'all') {
    let items = [];
    if (typeof testPharmacyCatalog !== 'undefined' && Array.isArray(testPharmacyCatalog)) {
      const lowStock = testPharmacyCatalog.filter(p => (p.stockBoxes || 0) <= 20);
      if (lowStock.length > 0) {
        items = lowStock.map(p => ({
          name: p.name,
          supplier: p.laboratory || "Droguería Distribuidora",
          boxes: Math.max(10, 30 - (p.stockBoxes || 0)),
          units: (Math.max(10, 30 - (p.stockBoxes || 0))) * (p.unitsPerBox || 20),
          estCost: Math.max(10, 30 - (p.stockBoxes || 0)) * (p.purchaseCost || (p.priceBox ? p.priceBox * 0.7 : 20))
        }));
      }
    }
    if (items.length === 0) {
      items = [
        { name: "Bio-Amoxil 500mg Cápsulas", supplier: "MedPharma Labs", boxes: 15, units: 600, estCost: 315.00 },
        { name: "Valetec-Dol Forte 500mg", supplier: "Laboratorios Farmatec S.A.", boxes: 20, units: 2000, estCost: 480.00 },
        { name: "Farma-Naprox 550mg Tabletas", supplier: "BioFarma Perú", boxes: 10, units: 1000, estCost: 345.00 }
      ];
    }

    const filtered = (supplierFilter === 'all')
      ? items
      : items.filter(i => (i.supplier || '').toLowerCase().includes(supplierFilter.toLowerCase()));

    let total = 0;
    const lines = filtered.map((item, idx) => {
      total += item.estCost;
      return `${idx + 1}. *${item.name}*\n   • Cantidad: *${item.boxes} Cajas* (${item.units} un.)\n   • Prov: ${item.supplier}\n   • Importe Ref: S/ ${item.estCost.toFixed(2)}`;
    });

    return { text: lines.join('\n\n'), total: total.toFixed(2), count: filtered.length };
  }

  updateWhatsAppMessage() {
    const supplier = document.getElementById('whatsappSupplierSelect')?.value || 'all';
    const previewEl = document.getElementById('whatsappMessagePreview');
    if (!previewEl) return;

    const data = this.getSuggestedItemsText(supplier);
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();

    const msg = `🏥 *ORDEN DE COMPRA URGENTE (48H) - VALETEC PHARMA*\n` +
      `🏢 *Botica Central* | RUC: 20601234567\n` +
      `📅 Fecha: ${dateStr} ${timeStr}\n\n` +
      `Estimado proveedor, requerimos despacho urgente de los siguientes ítems de reposición:\n\n` +
      `${data.text}\n\n` +
      `💰 *Total Estimado:* S/ ${data.total}\n` +
      `📍 *Entrega:* Av. Aviación 2450, San Borja, Lima\n` +
      `👩‍⚕️ *Regente Q.F.:* Dra. Elena Vega (CQFP 18492)\n\n` +
      `Agradecemos confirmar recepción y hora estimada de entrega en botica.`;

    previewEl.value = msg;
  }

  copyWhatsAppMessage(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const previewEl = document.getElementById('whatsappMessagePreview');
    if (previewEl) {
      previewEl.select();
      navigator.clipboard.writeText(previewEl.value).then(() => {
        showValetecToast("📋 Mensaje copiado al portapapeles listo para pegar.", "success");
      }).catch(() => {
        showValetecToast("Texto seleccionado. Puedes presionar Ctrl+C.", "info");
      });
    }
  }

  printOrderSheet(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    window.print();
  }

  sendWhatsAppDirect(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const previewEl = document.getElementById('whatsappMessagePreview');
    const phoneInput = document.getElementById('whatsappPhoneInput');
    let phone = phoneInput?.value?.replace(/[^0-9]/g, '') || '';
    if (phone.length === 9 && !phone.startsWith('51')) {
      phone = '51' + phone;
    }
    const text = encodeURIComponent(previewEl?.value || '');
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    showValetecToast("Abriendo WhatsApp con la orden de compra urgente...", "info");
  }
}

// =============================================================
// 12. MÓDULO CONFIGURACIONES GLOBALES DE EMPRESA & SISTEMA
// =============================================================
class SettingsModule {
  constructor() {
    this.modal = document.getElementById('settingsModal');
    this.btnOpenHeader = document.getElementById('btnOpenSettingsHeader');
    this.btnOpenMgmt = document.getElementById('btnOpenSettingsFromMgmt');
    this.btnClose = document.getElementById('btnCloseSettingsModal');
    this.btnCancel = document.getElementById('btnCancelSettingsModal');
    this.btnSave = document.getElementById('btnSaveSettings');
    this.btnDownloadBackup = document.getElementById('btnDownloadBackup');
    this.btnDownloadBackupMgmt = document.getElementById('btnDownloadBackupMgmt');

    // Elementos del formulario
    this.inCompanyName = document.getElementById('settingCompanyName');
    this.inCommercialName = document.getElementById('settingCommercialName');
    this.inRuc = document.getElementById('settingRuc');
    this.inAddress = document.getElementById('settingAddress');
    this.inPhone = document.getElementById('settingPhone');
    this.inEmail = document.getElementById('settingEmail');
    this.inCurrencySymbol = document.getElementById('settingCurrencySymbol');
    this.inCurrencyCode = document.getElementById('settingCurrencyCode');
    this.inIgvPercent = document.getElementById('settingIgvPercent');
    this.inSanitaryLicense = document.getElementById('settingSanitaryLicense');
    this.inTechnicalDirector = document.getElementById('settingTechnicalDirector');
    this.inInvoiceFooterText = document.getElementById('settingInvoiceFooterText');

    this.settingsData = null;

    this.initEvents();
  }

  initEvents() {
    if (this.btnOpenHeader) this.btnOpenHeader.addEventListener('click', () => this.openModal());
    if (this.btnOpenMgmt) this.btnOpenMgmt.addEventListener('click', () => this.openModal());
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.toggleModal(false));
    if (this.btnCancel) this.btnCancel.addEventListener('click', () => this.toggleModal(false));
    if (this.btnSave) this.btnSave.addEventListener('click', () => this.handleSave());
    if (this.btnDownloadBackup) {
      this.btnDownloadBackup.addEventListener('click', () => this.handleDownloadBackup(this.btnDownloadBackup));
    }
    if (this.btnDownloadBackupMgmt) {
      this.btnDownloadBackupMgmt.addEventListener('click', () => this.handleDownloadBackup(this.btnDownloadBackupMgmt));
    }
  }

  async handleDownloadBackup(btn) {
    if (appNav && !appNav.canAccessView('viewManagement')) {
      showValetecToast("Acceso denegado: Solo el Administrador puede descargar copias de seguridad.", "danger");
      return;
    }

    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Volcando PostgreSQL 16...`;
    }

    try {
      showValetecToast("Iniciando volcado completo de la base de datos PostgreSQL 16...", "info");
      const result = await window.api.downloadDatabaseBackup();
      showValetecToast(`¡Backup generado con éxito! Archivo: ${result.filename} (${(result.size / 1024).toFixed(1)} KB)`, "success");
    } catch (err) {
      console.error("[BACKUP] Error al descargar volcado:", err);
      showValetecToast(`Error al generar respaldo: ${err.message}`, "danger");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  }

  toggleModal(open) {
    if (open) {
      this.modal?.classList.add('active');
    } else {
      this.modal?.classList.remove('active');
    }
  }

  async openModal() {
    // RBAC: Solo admin puede ver/editar
    if (appNav && !appNav.canAccessView('viewManagement')) {
      showValetecToast("Acceso restringido: Solo el Administrador puede configurar la empresa.", "warning");
      return;
    }
    await this.loadSettings();
    this.toggleModal(true);
  }

  async loadSettings() {
    try {
      if (window.api && window.api.getSettings) {
        const res = await window.api.getSettings();
        if (res && res.data) {
          this.settingsData = res.data;
          this.populateForm(res.data);
        }
      }
    } catch (err) {
      console.warn("Aviso cargando configuraciones:", err.message);
      showValetecToast(`Error al cargar datos de empresa: ${err.message}`, "danger");
    }
  }

  populateForm(data) {
    if (!data) return;
    if (this.inCompanyName) this.inCompanyName.value = data.companyName || '';
    if (this.inCommercialName) this.inCommercialName.value = data.commercialName || '';
    if (this.inRuc) this.inRuc.value = data.ruc || '';
    if (this.inAddress) this.inAddress.value = data.address || '';
    if (this.inPhone) this.inPhone.value = data.phone || '';
    if (this.inEmail) this.inEmail.value = data.email || '';
    if (this.inCurrencySymbol) this.inCurrencySymbol.value = data.currencySymbol || 'S/';
    if (this.inCurrencyCode) this.inCurrencyCode.value = data.currencyCode || 'PEN';
    if (this.inIgvPercent) this.inIgvPercent.value = data.igvPercent !== undefined ? data.igvPercent : '18.00';
    if (this.inSanitaryLicense) this.inSanitaryLicense.value = data.sanitaryLicense || '';
    if (this.inTechnicalDirector) this.inTechnicalDirector.value = data.technicalDirector || '';
    if (this.inInvoiceFooterText) this.inInvoiceFooterText.value = data.invoiceFooterText || '';
  }

  async handleSave() {
    const companyName = this.inCompanyName?.value.trim();
    const commercialName = this.inCommercialName?.value.trim();
    const ruc = this.inRuc?.value.trim();
    const address = this.inAddress?.value.trim();
    const phone = this.inPhone?.value.trim();
    const email = this.inEmail?.value.trim();
    const currencySymbol = this.inCurrencySymbol?.value.trim();
    const currencyCode = this.inCurrencyCode?.value.trim();
    const igvPercent = parseFloat(this.inIgvPercent?.value);
    const sanitaryLicense = this.inSanitaryLicense?.value.trim();
    const technicalDirector = this.inTechnicalDirector?.value.trim();
    const invoiceFooterText = this.inInvoiceFooterText?.value.trim();

    // 1. Validaciones frontales estrictas
    if (!companyName || companyName.length < 3) {
      showValetecToast("La Razón Social es obligatoria (mínimo 3 caracteres).", "warning");
      this.inCompanyName?.focus();
      return;
    }

    if (!ruc || !/^\d{11}$/.test(ruc)) {
      showValetecToast("El RUC debe tener exactamente 11 dígitos numéricos.", "warning");
      this.inRuc?.focus();
      return;
    }

    if (isNaN(igvPercent) || igvPercent < 0 || igvPercent > 100) {
      showValetecToast("El porcentaje de IGV debe ser un valor numérico entre 0 y 100.", "warning");
      this.inIgvPercent?.focus();
      return;
    }

    const payload = {
      companyName,
      commercialName,
      ruc,
      address,
      phone,
      email,
      currencySymbol,
      currencyCode,
      igvPercent,
      sanitaryLicense,
      technicalDirector,
      invoiceFooterText
    };

    if (this.btnSave) {
      this.btnSave.disabled = true;
      this.btnSave.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Guardando en PostgreSQL...`;
    }

    try {
      const res = await window.api.updateSettings(payload);
      if (res && res.data) {
        this.settingsData = res.data;
        showValetecToast("Configuración de empresa guardada con éxito en PostgreSQL 16.", "success");
        this.toggleModal(false);
      }
    } catch (err) {
      console.error("Error guardando configuraciones:", err);
      showValetecToast(`Error al guardar: ${err.message}`, "danger");
    } finally {
      if (this.btnSave) {
        this.btnSave.disabled = false;
        this.btnSave.innerHTML = `<i class="bi bi-floppy-fill"></i> <span>💾 Guardar Cambios</span>`;
      }
    }
  }
}

// =============================================================
// 13. INICIALIZACIÓN GLOBAL & SINCRONIZACIÓN CON BACKEND (POSTGRESQL)
// =============================================================
let authManager, accessibilityEngine, appNav, counterApp, cashApp, warehouseApp, digemidApp, staffApp, classificationApp, clientsApp, managementApp, settingsApp;

async function syncWithBackend() {
  if (!window.api) return;
  try {
    const health = await window.api.checkHealth();
    if (!health) {
      console.log("ℹ️ Backend no detectado aún en :4000. Operando con dataset local seguro.");
      return;
    }

    // 1. Cargar productos desde PostgreSQL
    const prodRes = await window.api.getProducts();
    if (prodRes && prodRes.data && prodRes.data.length > 0) {
      testPharmacyCatalog = prodRes.data;
      if (counterApp) counterApp.renderProducts();
      if (warehouseApp) {
        warehouseApp.render();
        warehouseApp.loadFefoAlerts();
      }
    }

    // 1.1 Cargar clasificación (categorías y laboratorios)
    if (classificationApp) {
      classificationApp.loadCategories();
      classificationApp.loadLaboratories();
    }

    // 1.2 Cargar clientes y padrón fiscal
    if (clientsApp) {
      clientsApp.loadClients();
    }

    // 2. Cargar recetas DIGEMID desde PostgreSQL
    const rxRes = await window.api.getRecipes();
    if (rxRes && rxRes.data) {
      digemidMockRecords = rxRes.data;
      if (digemidApp) {
        digemidApp.render();
        // Obtener indicadores reales (caja fuerte) desde el balance sanitario
        try {
          const balRes = await window.api.getSanitaryBalance();
          if (balRes && balRes.data) digemidApp.updateMetricsFromBalance(balRes.data);
          else digemidApp.updateMetrics();
        } catch (_) {
          digemidApp.updateMetrics();
        }
      }
    }

    // 3. Cargar turno de caja activo desde PostgreSQL
    const cashRes = await window.api.getCashShift();
    if (cashRes && cashRes.data) {
      if (cashApp) {
        cashApp.updateFromBackend(cashRes.data);
      }
    }

    // 4. Cargar personal de turno desde PostgreSQL
    const userRes = await window.api.getUsers();
    if (userRes && userRes.data) {
      if (userRes.data.profiles) {
        mockStaffProfiles = userRes.data.profiles;
        if (mockStaffProfiles.qf) {
          mockStaffProfiles.qf.allowedViews = ["viewCounter", "viewCash", "viewWarehouse", "viewDigemid", "viewStaff", "viewManagement"];
        }
        if (mockStaffProfiles.tech) {
          mockStaffProfiles.tech.allowedViews = ["viewCounter", "viewWarehouse", "viewDigemid"];
        }
        if (mockStaffProfiles.cashier) {
          mockStaffProfiles.cashier.allowedViews = ["viewCounter", "viewCash", "viewWarehouse", "viewDigemid"];
        }
        if (authManager) authManager.updateQuickProfileCards(userRes.data.profiles);
        if (appNav) appNav.applyRolePermissions(appNav.currentRole);
      }
      if (userRes.data.staffList && userRes.data.staffList.length > 0) {
        staffMembersList = userRes.data.staffList.map(u => ({
          name: u.name,
          role: u.roleLabel,
          terminal: u.terminal,
          shift: u.shift,
          permissions: u.permissions,
          status: u.status,
          target: u.target
        }));
        if (staffApp) staffApp.render();
      }
    }

    // 5. Cargar métricas y gráficos en tiempo real de la Torre de Control (Dashboard)
    try {
      if (managementApp) {
        await managementApp.loadAll();
      } else {
        const reportRes = await window.api.getDashboardKpis();
        if (reportRes && reportRes.data) {
          updateManagementDashboard(reportRes.data);
        }
      }
    } catch (e) {
      // Fallback a reportes si el rol no tiene permisos gerenciales
    }

    // 6. Cargar parámetros de configuración de la botica
    try {
      if (settingsApp) {
        await settingsApp.loadSettings();
      }
    } catch (_) { }

    showValetecToast("Sincronizado con Backend Node.js y PostgreSQL 16.", "success");
  } catch (err) {
    console.warn("Aviso en sincronización con backend:", err.message);
  }
}


// =============================================================
// PUENTE DE COMPATIBILIDAD GLOBAL EN WINDOW (V3.1)
// =============================================================
window.openExchangeModal = function (e, medName, lot, supplier, qty) {
  if (window.warehouseApp) return window.warehouseApp.openExchangeModal(e, medName, lot, supplier, qty);
  const m = document.getElementById('exchangeModal');
  if (m) m.classList.add('active');
};
window.closeExchangeModal = function (e) {
  if (window.warehouseApp) return window.warehouseApp.closeExchangeModal(e);
  const m = document.getElementById('exchangeModal');
  if (m) m.classList.remove('active');
};
window.openNewStaffModal = function (e) {
  if (window.staffApp) return window.staffApp.openNewStaffModal(e);
  const m = document.getElementById('newStaffModal');
  if (m) m.classList.add('active');
};
window.closeNewStaffModal = function (e) {
  if (window.staffApp) return window.staffApp.closeNewStaffModal(e);
  const m = document.getElementById('newStaffModal');
  if (m) m.classList.remove('active');
};
window.openPermissionsModal = function (index, e) {
  if (window.staffApp) return window.staffApp.openPermissionsModal(index, e);
  const m = document.getElementById('staffPermissionsModal');
  if (m) m.classList.add('active');
};
window.closePermissionsModal = function (e) {
  if (window.staffApp) return window.staffApp.closePermissionsModal(e);
  const m = document.getElementById('staffPermissionsModal');
  if (m) m.classList.remove('active');
};
window.openWhatsAppOrderModal = function (e) {
  if (window.managementApp) return window.managementApp.openWhatsAppOrderModal(e);
  const m = document.getElementById('whatsappOrderModal');
  if (m) m.classList.add('active');
};
window.closeWhatsAppModal = function (e) {
  if (window.managementApp) return window.managementApp.closeWhatsAppModal(e);
  const m = document.getElementById('whatsappOrderModal');
  if (m) m.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', () => {
  authManager = new AuthManager();
  window.authManager = authManager;
  accessibilityEngine = new AccessibilityEngine();
  appNav = new NavigationController();
  window.appNav = appNav;
  counterApp = new CounterModule();
  window.counterApp = counterApp;
  cashApp = new CashModule();
  window.cashApp = cashApp;
  warehouseApp = new WarehouseModule();
  window.warehouseApp = warehouseApp;
  digemidApp = new DigemidModule();
  staffApp = new StaffManagementModule();
  window.staffApp = staffApp;
  classificationApp = new ClassificationModule();
  window.classificationApp = classificationApp;
  clientsApp = new ClientsModule();
  window.clientsApp = clientsApp;
  managementApp = new ManagementDashboardModule();
  window.managementApp = managementApp;
  settingsApp = new SettingsModule();
  window.settingsApp = settingsApp;

  // Enlace directo e independiente de eventos click (V3.1)
  const btnExchange = document.getElementById('btnExchangeFefoAction');
  if (btnExchange) {
    btnExchange.addEventListener('click', (e) => {
      if (e && e.preventDefault) { e.preventDefault(); e.stopPropagation(); }
      window.warehouseApp ? window.warehouseApp.openExchangeModal(e) : window.openExchangeModal(e);
    });
  }

  const btnStaff = document.getElementById('btnRegisterStaffAction');
  if (btnStaff) {
    btnStaff.addEventListener('click', (e) => {
      if (e && e.preventDefault) { e.preventDefault(); e.stopPropagation(); }
      window.staffApp ? window.staffApp.openNewStaffModal(e) : window.openNewStaffModal(e);
    });
  }

  const btnWhatsApp = document.getElementById('btnSendWhatsAppOrderAction');
  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', (e) => {
      if (e && e.preventDefault) { e.preventDefault(); e.stopPropagation(); }
      window.managementApp ? window.managementApp.openWhatsAppOrderModal(e) : window.openWhatsAppOrderModal(e);
    });
  }


  // Sincronización activa con Backend y Base de Datos
  syncWithBackend();

  // Restaurar sesión activa de JWT si existe
  authManager.checkActiveSession();

  // Revisar estado de conexión cada 15 segundos
  setInterval(() => {
    if (window.api) window.api.checkHealth();
  }, 15000);
});
