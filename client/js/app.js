/**
 * VALETEC PHARMA - SISTEMA DE GESTIÓN FARMACÉUTICA V2
 * Arquitectura: JavaScript Modular / Clean Architecture
 * Módulos: Autenticación & Login, UserWay Nativo (Accesibilidad), Cockpit Gerencial, Mostrador, Caja, Almacén, DIGEMID y Equipo
 */

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
    allowedViews: ["viewCounter", "viewWarehouse", "viewDigemid"],
    defaultView: "viewDigemid"
  },
  tech: {
    name: "Carlos Mendoza",
    roleLabel: "Técnico de Mostrador",
    avatar: "🩺",
    email: "mostrador@valetec.pe",
    allowedViews: ["viewCounter"],
    defaultView: "viewCounter"
  },
  cashier: {
    name: "Rodrigo Soto",
    roleLabel: "Cajero de Turno",
    avatar: "💵",
    email: "caja@valetec.pe",
    allowedViews: ["viewCounter", "viewCash"],
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
      if (roleSelect) roleSelect.value = res.user.roleKey;
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

  async checkActiveSession() {
    try {
      const user = await window.api.getMe();
      if (user) {
        if (this.loginScreen) this.loginScreen.classList.add('d-none');
        if (this.appScreen) this.appScreen.classList.remove('d-none');

        const roleSelect = document.getElementById('appRoleSelector');
        if (roleSelect) roleSelect.value = user.roleKey;
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
    this.body = document.getElementById('appBody');

    this.fontSize = 'normal';
    this.isDark = false;
    this.isContrast = false;
    this.isGrayscale = false;
    this.isDyslexia = false;
    this.isSpaced = false;
    this.isLinksHighlight = false;

    this.init();
  }

  init() {
    if (this.btnOpen) this.btnOpen.addEventListener('click', () => this.toggleDrawer());
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.closeDrawer());

    document.addEventListener('click', (e) => {
      if (this.drawer && this.btnOpen) {
        if (!this.drawer.contains(e.target) && !this.btnOpen.contains(e.target)) {
          this.closeDrawer();
        }
      }
    });
  }

  toggleDrawer() {
    this.drawer?.classList.toggle('active');
  }

  closeDrawer() {
    this.drawer?.classList.remove('active');
  }

  setFontSize(size) {
    this.fontSize = size;
    this.body.classList.remove('uw-font-lg', 'uw-font-xl');
    document.querySelectorAll('.btn-uw-ctrl').forEach(b => b.classList.remove('active'));

    if (size === 'lg') {
      this.body.classList.add('uw-font-lg');
      event.target.classList.add('active');
    } else if (size === 'xl') {
      this.body.classList.add('uw-font-xl');
      event.target.classList.add('active');
    } else {
      document.querySelector('.btn-uw-ctrl:first-child')?.classList.add('active');
    }
    showValetecToast(`Tamaño de texto ajustado a: ${size.toUpperCase()}`, "info");
  }

  toggleDarkMode() {
    this.isDark = !this.isDark;
    this.body.classList.toggle('uw-dark-mode', this.isDark);
    document.getElementById('btnToggleDarkMode')?.classList.toggle('active', this.isDark);
    showValetecToast(`Modo Oscuro ${this.isDark ? 'Activado' : 'Desactivado'}`, "info");
  }

  toggleHighContrast() {
    this.isContrast = !this.isContrast;
    this.body.classList.toggle('uw-high-contrast', this.isContrast);
    document.getElementById('btnToggleHighContrast')?.classList.toggle('active', this.isContrast);
    showValetecToast(`Alto Contraste ${this.isContrast ? 'Activado' : 'Desactivado'}`, "info");
  }

  toggleGrayscale() {
    this.isGrayscale = !this.isGrayscale;
    this.body.classList.toggle('uw-grayscale', this.isGrayscale);
    document.getElementById('btnToggleGrayscale')?.classList.toggle('active', this.isGrayscale);
    showValetecToast(`Escala de Grises ${this.isGrayscale ? 'Activada' : 'Desactivada'}`, "info");
  }

  toggleDyslexia() {
    this.isDyslexia = !this.isDyslexia;
    this.body.classList.toggle('uw-dyslexia', this.isDyslexia);
    document.getElementById('btnToggleDyslexia')?.classList.toggle('active', this.isDyslexia);
    showValetecToast(`Fuente de Lectura Fácil ${this.isDyslexia ? 'Activada' : 'Desactivada'}`, "info");
  }

  toggleSpacedText() {
    this.isSpaced = !this.isSpaced;
    this.body.classList.toggle('uw-spaced-text', this.isSpaced);
    document.getElementById('btnToggleSpacedText')?.classList.toggle('active', this.isSpaced);
    showValetecToast(`Espaciado de Texto ${this.isSpaced ? 'Activado' : 'Desactivado'}`, "info");
  }

  toggleHighlightLinks() {
    this.isLinksHighlight = !this.isLinksHighlight;
    this.body.classList.toggle('uw-highlight-links', this.isLinksHighlight);
    document.getElementById('btnToggleHighlightLinks')?.classList.toggle('active', this.isLinksHighlight);
    showValetecToast(`Resaltado de Botones ${this.isLinksHighlight ? 'Activado' : 'Desactivado'}`, "info");
  }

  resetAll() {
    this.body.className = 'valetec-app-body';
    this.fontSize = 'normal';
    this.isDark = false;
    this.isContrast = false;
    this.isGrayscale = false;
    this.isDyslexia = false;
    this.isSpaced = false;
    this.isLinksHighlight = false;

    document.querySelectorAll('.btn-uw-feature').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.btn-uw-ctrl').forEach((b, i) => b.classList.toggle('active', i === 0));

    showValetecToast("Configuración de accesibilidad restablecida.", "success");
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
    this.currentRole = 'admin';
    this.currentViewId = 'viewManagement';

    this.initEvents();
    this.startClock();
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
    const navBar = document.getElementById('appNavBar');
    if (btnMobile && navBar) {
      btnMobile.addEventListener('click', () => {
        navBar.classList.toggle('mobile-open');
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        alert("ATAJOS DE TECLADO VALETEC PHARMA:\n\n[F1] Manual de atajos\n[F2] Buscar en Mostrador\n[F4] Cobrar y emitir comprobante\n[F8] Limpiar orden actual\n[F9] Abrir Caja y Arqueo");
      }
      if (e.key === 'F2') {
        e.preventDefault();
        this.navigateTo('viewCounter');
        document.getElementById('fastProductSearch')?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (this.currentViewId === 'viewCounter') {
          document.getElementById('btnCheckoutOrder')?.click();
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
      alert("ATAJOS RÁPIDOS:\n\n[F1] Ayuda\n[F2] Buscar Medicamento\n[F4] Cobrar y Facturar\n[F8] Limpiar Mostrador\n[F9] Arqueo de Caja");
    });
  }

  canAccessView(viewId) {
    const profile = mockStaffProfiles[this.currentRole];
    return profile ? profile.allowedViews.includes(viewId) : false;
  }

  applyRolePermissions(roleKey) {
    this.currentRole = roleKey;
    const profile = mockStaffProfiles[roleKey];
    if (!profile) return;

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
      } else {
        tab.classList.add('d-none');
      }
    });

    this.navigateTo(profile.defaultView);
  }

  navigateTo(viewId) {
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
  }

  startClock() {
    const clock = document.getElementById('liveAppClock');
    if (!clock) return;
    setInterval(() => {
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      clock.innerText = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} • ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
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

    this.cacheDom();
    this.initEvents();
    this.renderProducts();
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
    }

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

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.receiptModal?.classList.contains('active')) {
        this.toggleReceiptModal(false);
      }
    });
  }

  lookupPatient() {
    const doc = this.patientInput?.value.trim();
    if (!doc) {
      showValetecToast("Digita un DNI o RUC para consultar.", "warning");
      return;
    }
    if (doc === '10293847' || doc.length === 8) {
      this.patientStatus.innerHTML = `
        <span class="p-name">Paciente Demo Uno</span>
        <span class="p-points"><i class="bi bi-star-fill text-warning"></i> 240 Pts (S/ 24.00)</span>
      `;
      showValetecToast("Paciente identificado en padrón VALETEC.", "success");
    } else if (doc.startsWith('20') && doc.length === 11) {
      this.patientStatus.innerHTML = `
        <span class="p-name">EMPRESA CLIENTE S.A.C.</span>
        <span class="p-points"><i class="bi bi-building"></i> RUC Habido</span>
      `;
      showValetecToast("Empresa identificada para Factura.", "success");
    } else {
      showValetecToast("Documento no registrado. Se registrará como Cliente General.", "info");
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
    if (frac === 'blister') { price = prod.blisterPrice; label = "Blíster"; }
    else if (frac === 'unit') { price = prod.unitPrice; label = "Pastilla"; }

    const exist = this.order.find(i => i.product.id === prodId && i.frac === frac);
    if (exist) {
      exist.qty += 1;
    } else {
      this.order.push({ product: prod, frac: frac, label: label, price: price, qty: 1 });
    }

    this.updateUi();
    showValetecToast(`Agregado: ${prod.name} (${label})`, "success");
  }

  updateQty(index, delta) {
    if (!this.order[index]) return;
    this.order[index].qty += delta;
    if (this.order[index].qty <= 0) this.order.splice(index, 1);
    this.updateUi();
  }

  calcTotal() {
    return this.order.reduce((s, i) => s + (i.price * i.qty), 0);
  }

  recalcChange() {
    const total = this.calcTotal();
    const rec = parseFloat(this.cashInput?.value || 0);
    const diff = Math.max(0, rec - total);
    if (this.changeEl) this.changeEl.innerText = `S/ ${diff.toFixed(2)}`;
  }

  updateUi() {
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

    const voucherLabel = (sale.invoiceType === 'factura')
      ? 'FACTURA ELECTRÓNICA'
      : (sale.invoiceType === 'boleta' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'TICKET DE VENTA');

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
        <div class="receipt-header">
          <div class="receipt-logo-title">🏥 VALETEC PHARMA S.A.C.</div>
          <div class="receipt-meta-line">R.U.C. 20601234567</div>
          <div class="receipt-meta-line">Av. Aviación 2450 • San Borja, Lima</div>
          <div class="receipt-meta-line">Central Telefónica: (01) 500-8900</div>
          <div class="receipt-meta-line">Reg. Sanitario DIGEMID N° 10842-FAR</div>
        </div>

        <div class="receipt-dashed-line"></div>

        <div class="receipt-doc-title">${voucherLabel}</div>
        <div style="text-align: center; font-size: 14px; font-weight: 800; color: #0a2540; margin-bottom: 6px;">
          ${sale.correlative}
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
            <span>${sale.customerName || 'CLIENTE GENERAL'}</span>
          </div>
          <div class="receipt-info-row">
            <span>Doc. Identidad:</span>
            <span>${sale.customerDoc || '00000000'}</span>
          </div>
          <div class="receipt-info-row">
            <span>Forma de Pago:</span>
            <span style="text-transform: uppercase;">${sale.paymentMethod === 'cash' ? 'EFECTIVO' : sale.paymentMethod}</span>
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
          <div class="receipt-total-row grand-total">
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

        <div class="receipt-dashed-line"></div>

        <div class="receipt-barcode-box">
          |||| | ||||| ||| ||||||| |||
        </div>

        <div class="receipt-footer">
          <div>Representación impresa autorizada de Comprobante de Pago Electrónico.</div>
          <div style="margin-top: 4px;">✅ Stock descontado automáticamente por FEFO en PostgreSQL.</div>
          <div style="margin-top: 4px; font-weight: 700;">¡Gracias por cuidar tu salud en VALETEC PHARMA!</div>
        </div>
      </div>
    `;

    this.toggleReceiptModal(true);
  }

  async checkout() {
    if (this.order.length === 0) {
      showValetecToast("El carrito está vacío. Agrega medicinas antes de cobrar.", "warning");
      return;
    }

    const needsRx = this.order.some(i => i.product.prescriptionType !== 'free');
    if (needsRx) {
      const cmp = this.docCmpInput?.value.trim();
      if (!cmp) {
        alert("⚠️ ATENCIÓN MÉDICA:\nEsta orden contiene medicamentos bajo receta.\nEscribe el CMP del médico tratante antes de continuar.");
        this.docCmpInput?.focus();
        return;
      }
    }

    const total = this.calcTotal();
    const rec = parseFloat(this.cashInput?.value || 0);
    if (rec > 0 && rec < total) {
      alert(`⚠️ Dinero insuficiente. Total: S/ ${total.toFixed(2)}, Recibido: S/ ${rec.toFixed(2)}. Faltan S/ ${(total - rec).toFixed(2)}.`);
      return;
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

    const amountPaid = rec > 0 ? rec : total;

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
          paymentMethod: 'cash',
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
        const changeGiven = Math.max(0, Math.round((amountPaid - total) * 100) / 100);

        saleData = {
          saleId: Date.now(),
          correlative: `${series}-${String(num).padStart(6, '0')}`,
          invoiceSeries: series,
          invoiceNumber: num,
          invoiceType,
          customerDoc,
          customerName,
          paymentMethod: 'cash',
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

      // 1. Mostrar comprobante térmico en pantalla
      this.showReceiptModal(saleData);

      // 2. Limpiar orden y campos de entrada
      this.order = [];
      if (this.cashInput) this.cashInput.value = '';
      if (this.docCmpInput) this.docCmpInput.value = '';
      if (this.patientInput) this.patientInput.value = '';
      if (this.patientStatus) {
        this.patientStatus.innerHTML = `
          <span class="p-name">👤 Cliente General</span>
          <span class="p-points"><i class="bi bi-star-fill text-warning"></i> 0 Puntos</span>
        `;
      }
      this.updateUi();

      // 3. Sincronizar nuevo stock FEFO y saldo de caja con PostgreSQL
      if (window.api && window.api.isConnected) {
        await syncWithBackend();
      }

      showValetecToast(`¡Venta ${saleData.correlative} emitida con éxito!`, "success");
    } catch (err) {
      alert(`🚨 ERROR EN LA VENTA:\n\n${err.message}`);
      showValetecToast(err.message, "danger");
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
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
  }

  initEvents() {
    this.denomFields.forEach(f => {
      f.addEventListener('input', () => this.calculateAudit());
    });

    if (this.btnOpenExp) this.btnOpenExp.addEventListener('click', () => this.toggleModal(true));
    if (this.btnCloseExp) this.btnCloseExp.addEventListener('click', () => this.toggleModal(false));
    if (this.btnCancelExp) this.btnCancelExp.addEventListener('click', () => this.toggleModal(false));

    if (this.btnSaveExp) {
      this.btnSaveExp.addEventListener('click', async () => {
        const val = parseFloat(this.expAmountInput?.value || 0);
        if (val <= 0) {
          alert("Ingresa un monto válido mayor a S/ 0.00.");
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
          alert("Error guardando salida de caja: " + err.message);
        }
      });
    }

    // Botón de Cierre Z Oficial
    document.getElementById('btnTriggerZClose')?.addEventListener('click', async () => {
      const physical = this.calcPhysicalTotal();
      const expected = (this.openingBalance + this.cashSales) - this.expenses;
      const diff = Math.round((physical - expected) * 100) / 100;

      let diffNotice = "✅ Cuadre Exacto (S/ 0.00)";
      if (diff > 0) diffNotice = `⚠️ Sobrante de +S/ ${diff.toFixed(2)}`;
      if (diff < 0) diffNotice = `❌ Faltante de -S/ ${Math.abs(diff).toFixed(2)}`;

      const confirmed = confirm(
        `🔒 CIERRE Z DE CAJA DEFINITIVO\n\n` +
        `• Dinero en Gaveta Contado: S/ ${physical.toFixed(2)}\n` +
        `• Saldo Teórico del Sistema: S/ ${expected.toFixed(2)}\n` +
        `• Resultado de Auditoría: ${diffNotice}\n\n` +
        `¿Deseas sellar el turno actual en PostgreSQL y emitir el Reporte Z Oficial?`
      );

      if (!confirmed) return;

      const triggerBtn = document.getElementById('btnTriggerZClose');
      const origText = triggerBtn ? triggerBtn.innerHTML : '';
      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = `<span><span class="spinner-border spinner-border-sm"></span> Sellando Cierre Z...</span>`;
      }

      try {
        if (window.api && window.api.isConnected) {
          const res = await window.api.closeZShift({
            countedBalance: physical,
            denominations: this.getDenominationsObject()
          });

          if (res && res.success) {
            this.showZReportModal(res.data);
            await syncWithBackend();
            showValetecToast("¡Cierre Z Oficial completado y sellado en PostgreSQL!", "success");
          } else {
            throw new Error(res?.message || "Error al procesar Cierre Z.");
          }
        } else {
          // Modo contingencia local
          const localReport = {
            turnoId: 1,
            terminal: 'Caja 01',
            cashierName: mockStaffProfiles[appNav?.currentRole || 'cashier']?.name || 'Rodrigo Soto',
            openedAt: new Date(Date.now() - 28800000).toISOString(),
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
          showValetecToast("Cierre Z simulado en modo desconectado.", "info");
        }
      } catch (err) {
        alert("🚨 ERROR EN CIERRE Z:\n" + err.message);
        showValetecToast(err.message, "danger");
      } finally {
        if (triggerBtn) {
          triggerBtn.disabled = false;
          triggerBtn.innerHTML = origText;
        }
      }
    });

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

  toggleModal(open) {
    if (open) this.expenseModal?.classList.add('active');
    else this.expenseModal?.classList.remove('active');
  }

  toggleZModal(open) {
    if (open) this.zReportModal?.classList.add('active');
    else this.zReportModal?.classList.remove('active');
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
        this.statusBanner.className = 'cuadre-status-banner perfect';
        this.statusBanner.innerHTML = `
          <i class="bi bi-check-circle-fill"></i>
          <div>
            <strong>¡CUADRE PERFECTO!</strong>
            <p>Diferencia: S/ 0.00. La gaveta física coincide exactamente con las ventas.</p>
          </div>
        `;
      } else if (diff < 0) {
        this.statusBanner.className = 'cuadre-status-banner';
        this.statusBanner.style.backgroundColor = '#fef2f2';
        this.statusBanner.style.borderColor = '#fca5a5';
        this.statusBanner.style.color = '#991b1b';
        this.statusBanner.innerHTML = `
          <i class="bi bi-exclamation-triangle-fill text-danger"></i>
          <div>
            <strong class="text-danger">FALTANTE EN CAJA: S/ ${Math.abs(diff).toFixed(2)}</strong>
            <p>Hay menos dinero en gaveta del registrado por el sistema.</p>
          </div>
        `;
      } else {
        this.statusBanner.className = 'cuadre-status-banner';
        this.statusBanner.style.backgroundColor = '#fffbeb';
        this.statusBanner.style.borderColor = '#fde68a';
        this.statusBanner.style.color = '#92400e';
        this.statusBanner.innerHTML = `
          <i class="bi bi-info-circle-fill text-warning"></i>
          <div>
            <strong class="text-warning">SOBRANTE EN CAJA: +S/ ${diff.toFixed(2)}</strong>
            <p>Hay más dinero físico en gaveta del registrado.</p>
          </div>
        `;
      }
    }
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

    this.zReportModalBody.innerHTML = `
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

  render() {
    if (!this.tableBody) return;
    const q = this.searchInput?.value.toLowerCase().trim() || '';
    const s = this.shelfFilter?.value || 'all';
    const f = this.fefoFilter?.value || 'all';

    const filtered = testPharmacyCatalog.filter(p => {
      const mQ = (!q || p.name.toLowerCase().includes(q) || p.genericDci.toLowerCase().includes(q) || p.lotNumber.toLowerCase().includes(q) || p.barcode.includes(q));
      const mS = (s === 'all' || p.location.includes(s));
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

      return `
        <tr>
          <td><code>${p.barcode}</code></td>
          <td><strong>${p.name}</strong><br><small style="color: var(--text-muted);">${p.genericDci}</small></td>
          <td>${p.laboratory}</td>
          <td><span class="shelf-tag"><i class="bi bi-geo-alt"></i> ${p.location}</span></td>
          <td><strong>${p.stockBoxes} cajas</strong> (${p.stockBlisters} blíst. / ${p.stockUnits} past.)</td>
          <td><code>${p.lotNumber}</code></td>
          <td><strong>${p.expireDate}</strong></td>
          <td><span class="fefo-chip ${fefoClass}">${fefoLabel}</span></td>
          <td>
            <button type="button" class="btn-action-outline" style="padding: 4px 10px; font-size: 11px; font-weight: 700;" onclick="alert('Kardex de ${p.name}\\nLote: ${p.lotNumber}\\nStock: ${p.stockUnits} pastillas\\nUbicación: ${p.location}')">
              <span>📋 Kardex</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
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

    this.initEvents();
    this.render();
  }

  initEvents() {
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.toggleModal(false));
    if (this.btnCloseBtn) this.btnCloseBtn.addEventListener('click', () => this.toggleModal(false));

    document.getElementById('btnNewPrescriptionEntry')?.addEventListener('click', () => {
      alert("Formulario de foliación de receta médica en el Libro Oficial de Controlados DIGEMID.");
    });

    if (this.btnApprove) {
      this.btnApprove.addEventListener('click', () => {
        if (this.activeFolio) {
          const r = digemidMockRecords.find(x => x.folio === this.activeFolio);
          if (r) {
            r.status = 'dispensed';
            this.render();
            if (window.api) {
              window.api.updateRecipeStatus(r.folio, 'dispensed')
                .then(() => syncWithBackend())
                .catch(err => console.warn("Error actualizando receta:", err.message));
            }
            showValetecToast(`Receta ${r.folio} validada y registrada en PostgreSQL.`, "success");
          }
        }
        this.toggleModal(false);
      });
    }
  }

  toggleModal(open) {
    if (open) this.modal?.classList.add('active');
    else this.modal?.classList.remove('active');
  }

  viewRecord(folio) {
    const r = digemidMockRecords.find(x => x.folio === folio);
    if (!r || !this.content) return;
    this.activeFolio = folio;

    this.content.innerHTML = `
      <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 14px;">
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px;">
          <div>
            <strong style="color: var(--valetec-navy);">EXPEDIENTE SANITARIO DE RECETA</strong><br>
            <small style="color: var(--text-muted); font-family: monospace;">${r.folio}</small>
          </div>
          <span class="fefo-chip good"><i class="bi bi-shield-check"></i> Regencia Q.F. Conforme</span>
        </div>
        <p style="margin: 3px 0; font-size: 12px;"><strong>Paciente:</strong> ${r.patientName} (DNI: ${r.patientDni})</p>
        <p style="margin: 3px 0; font-size: 12px;"><strong>Médico:</strong> ${r.doctorName} (<strong>${r.doctorCmp}</strong>)</p>
        <p style="margin: 3px 0; font-size: 12px;"><strong>Fecha:</strong> ${r.dateIssued}</p>
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:8px; margin:8px 0;">
          <strong style="color: var(--valetec-navy);">Rp. Medicamento Controlado:</strong>
          <p style="font-size: 13px; font-weight: 800; color: #0066cc; margin: 2px 0;">${r.medication}</p>
          <small style="color: var(--text-muted);"><strong>Custodia:</strong> ${r.notes}</small>
        </div>
      </div>
    `;
    this.toggleModal(true);
  }

  render() {
    if (!this.tableBody) return;

    this.tableBody.innerHTML = digemidMockRecords.map(r => {
      let badge = `<span class="fefo-chip warning"><i class="bi bi-hourglass-split"></i> Retenida</span>`;
      if (r.status === 'approved') badge = `<span class="fefo-chip good"><i class="bi bi-check-circle"></i> Aprobada Q.F.</span>`;
      if (r.status === 'dispensed') badge = `<span class="fefo-chip good" style="background-color:#e0f0ff; color:#0066cc;"><i class="bi bi-check2-all"></i> Dispensada</span>`;

      return `
        <tr>
          <td><strong>${r.folio}</strong></td>
          <td><strong>${r.patientName}</strong></td>
          <td><code>${r.patientDni}</code></td>
          <td>${r.doctorName}</td>
          <td><span class="shelf-tag">${r.doctorCmp}</span></td>
          <td><strong>${r.medication}</strong></td>
          <td>${r.dateIssued}</td>
          <td>${badge}</td>
          <td>
            <button type="button" class="btn-action-outline" style="padding: 4px 10px; font-size: 11px; font-weight: 700;" onclick="digemidApp.viewRecord('${r.folio}')">
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
    this.render();
  }

  render() {
    if (!this.tableBody) return;

    this.tableBody.innerHTML = staffMembersList.map(m => {
      const isAct = (m.status === 'active');
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="user-avatar" style="width:26px; height:26px; font-size:10px;">${m.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
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
            <button type="button" class="btn-action-outline" style="padding: 4px 10px; font-size: 11px; font-weight: 700;" onclick="alert('Configurar permisos y horarios de ${m.name}')">
              <span>⚙️ Permisos</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
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

function updateManagementDashboard(reportData) {
  if (!reportData) return;
  const f = reportData.financials;
  if (f) {
    const todaySalesEl = document.getElementById('mgmtTodaySales');
    const grossProfitEl = document.getElementById('mgmtGrossProfit');
    const patientsEl = document.getElementById('mgmtPatientsCount');
    const avgTicketEl = document.getElementById('mgmtAvgTicket');
    const marginEl = document.getElementById('mgmtGrossMargin');

    const displaySales = f.todaySales > 0 ? f.todaySales : f.monthSales;
    if (todaySalesEl) todaySalesEl.innerText = `S/ ${Number(displaySales).toFixed(2)}`;
    if (grossProfitEl) grossProfitEl.innerText = `S/ ${Number(f.estimatedProfit).toFixed(2)}`;
    const totalCount = (f.todayVouchers && f.todayVouchers > 0) ? f.todayVouchers : f.monthVouchers;
    if (patientsEl) patientsEl.innerText = `${totalCount} Comprobantes`;
    if (avgTicketEl) avgTicketEl.innerHTML = `Ticket promedio: <strong>S/ ${Number(f.averageTicket).toFixed(2)}</strong>`;
    if (marginEl) marginEl.innerHTML = `Margen comercial: <strong>${f.profitMarginPercent}%</strong>`;
  }

  const inv = reportData.inventoryFefo;
  if (inv) {
    const lowStockEl = document.getElementById('mgmtLowStockCount');
    if (lowStockEl) lowStockEl.innerText = `${inv.warningLots} Lotes`;
  }
}

// =============================================================
// 12. INICIALIZACIÓN GLOBAL & SINCRONIZACIÓN CON BACKEND (POSTGRESQL)
// =============================================================
let authManager, accessibilityEngine, appNav, counterApp, cashApp, warehouseApp, digemidApp, staffApp;

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
      if (warehouseApp) warehouseApp.render();
    }

    // 2. Cargar recetas DIGEMID desde PostgreSQL
    const rxRes = await window.api.getRecipes();
    if (rxRes && rxRes.data && rxRes.data.length > 0) {
      digemidMockRecords = rxRes.data;
      if (digemidApp) digemidApp.render();
    }

    // 3. Cargar turno de caja activo desde PostgreSQL
    const cashRes = await window.api.getCashShift();
    if (cashRes && cashRes.data && cashRes.data.shift) {
      if (cashApp) {
        cashApp.openingBalance = cashRes.data.shift.openingBalance;
        cashApp.cashSales = cashRes.data.shift.cashSales;
        cashApp.digitalSales = cashRes.data.shift.digitalSales;
        cashApp.expenses = cashRes.data.shift.expenses;
        cashApp.expectedBalance = cashRes.data.shift.expectedBalance;
        cashApp.calculateAudit();
      }
    }

    // 4. Cargar personal de turno desde PostgreSQL
    const userRes = await window.api.getUsers();
    if (userRes && userRes.data) {
      if (userRes.data.profiles) mockStaffProfiles = userRes.data.profiles;
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

    // 5. Cargar métricas en tiempo real de la Torre de Control (Dashboard)
    try {
      const reportRes = await window.api.getDashboardStats();
      if (reportRes && reportRes.data) {
        updateManagementDashboard(reportRes.data);
      }
    } catch (e) {
      // Endpoint de reportes opcional para roles sin permiso
    }

    showValetecToast("Sincronizado con Backend Node.js y PostgreSQL 16.", "success");
  } catch (err) {
    console.warn("Aviso en sincronización con backend:", err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  authManager = new AuthManager();
  accessibilityEngine = new AccessibilityEngine();
  appNav = new NavigationController();
  counterApp = new CounterModule();
  cashApp = new CashModule();
  warehouseApp = new WarehouseModule();
  digemidApp = new DigemidModule();
  staffApp = new StaffManagementModule();

  // Sincronización activa con Backend y Base de Datos
  syncWithBackend();

  // Restaurar sesión activa de JWT si existe
  authManager.checkActiveSession();

  // Revisar estado de conexión cada 15 segundos
  setInterval(() => {
    if (window.api) window.api.checkHealth();
  }, 15000);
});
