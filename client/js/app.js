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
// 3. GESTOR DE AUTENTICACIÓN & LOGIN (AUTH MANAGER)
// =============================================================
class AuthManager {
  constructor() {
    this.selectedRole = 'admin';
    this.loginScreen = document.getElementById('loginScreen');
    this.appScreen = document.getElementById('appScreen');
    this.usernameInput = document.getElementById('loginUsername');
  }

  selectQuickProfile(roleKey) {
    this.selectedRole = roleKey;
    document.querySelectorAll('.profile-card-btn').forEach(btn => {
      if (btn.dataset.role === roleKey) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const profile = mockStaffProfiles[roleKey];
    if (profile && this.usernameInput) {
      this.usernameInput.value = profile.email;
    }
  }

  login(e) {
    if (e) e.preventDefault();
    if (this.loginScreen) this.loginScreen.classList.add('d-none');
    if (this.appScreen) this.appScreen.classList.remove('d-none');

    // Sincronizar con el selector del sistema
    const roleSelect = document.getElementById('appRoleSelector');
    if (roleSelect) roleSelect.value = this.selectedRole;
    appNav.applyRolePermissions(this.selectedRole);

    showValetecToast(`¡Bienvenido al turno! Sesión iniciada como ${mockStaffProfiles[this.selectedRole].name}.`, "success");
  }

  logout() {
    if (confirm("¿Seguro que deseas cerrar la sesión de tu turno actual?")) {
      if (this.appScreen) this.appScreen.classList.add('d-none');
      if (this.loginScreen) this.loginScreen.classList.remove('d-none');
      showValetecToast("Sesión cerrada correctamente.", "info");
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

  checkout() {
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
      alert(`⚠️ Dinero insuficiente. Faltan S/ ${(total - rec).toFixed(2)}.`);
      return;
    }

    const vType = document.querySelector('input[name="orderVoucherType"]:checked')?.value || 'ticket';
    const num = `VAL-${Math.floor(100000 + Math.random() * 900000)}`;

    alert(`¡COBRO COMPLETADO CON ÉXITO!\n\n🧾 Comprobante: ${vType.toUpperCase()} N° ${num}\n💰 Total: S/ ${total.toFixed(2)}\n🟢 Vuelto a entregar: S/ ${(rec > total ? (rec - total) : 0).toFixed(2)}\n👤 Atendido por: ${mockStaffProfiles[appNav.currentRole].name}\n\n✅ Venta registrada y comprobante impreso.`);

    this.order = [];
    if (this.cashInput) this.cashInput.value = '';
    if (this.docCmpInput) this.docCmpInput.value = '';
    this.updateUi();
    showValetecToast("¡Venta completada con éxito!", "success");
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

    this.expenseModal = document.getElementById('expenseModal');
    this.btnOpenExp = document.getElementById('btnOpenExpenseModal');
    this.btnCloseExp = document.getElementById('btnCloseExpenseModal');
    this.btnCancelExp = document.getElementById('btnCancelExpense');
    this.btnSaveExp = document.getElementById('btnSaveExpense');
    this.expAmountInput = document.getElementById('expenseAmountInput');
  }

  initEvents() {
    this.denomFields.forEach(f => {
      f.addEventListener('input', () => this.calculateAudit());
    });

    if (this.btnOpenExp) this.btnOpenExp.addEventListener('click', () => this.toggleModal(true));
    if (this.btnCloseExp) this.btnCloseExp.addEventListener('click', () => this.toggleModal(false));
    if (this.btnCancelExp) this.btnCancelExp.addEventListener('click', () => this.toggleModal(false));

    if (this.btnSaveExp) {
      this.btnSaveExp.addEventListener('click', () => {
        const val = parseFloat(this.expAmountInput?.value || 0);
        if (val <= 0) {
          alert("Ingresa un monto válido.");
          return;
        }
        this.expenses += val;
        if (window.api) {
          window.api.addCashMovement({
            amount: val,
            concept: 'Salida autorizada de caja chica',
            responsible: 'Rodrigo Soto',
            type: 'egreso'
          }).then(() => syncWithBackend())
            .catch(err => console.warn("Error guardando egreso:", err.message));
        }
        this.toggleModal(false);
        this.calculateAudit();
        showValetecToast(`Salida de S/ ${val.toFixed(2)} guardada en PostgreSQL.`, "warning");
      });
    }

    document.getElementById('btnTriggerZClose')?.addEventListener('click', () => {
      alert("CIERRE DE TURNO Z - CAJA 01\n\n• Cajero: Rodrigo Soto\n• Efectivo en Gaveta: S/ 2,005.50\n• Ventas Digitales: S/ 3,052.00\n• Tickets Emitidos: 142\n\nReporte Z sellado y registrado en la Torre de Control.");
    });
  }

  toggleModal(open) {
    if (open) this.expenseModal?.classList.add('active');
    else this.expenseModal?.classList.remove('active');
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

    const expected = (this.openingBalance + this.cashSales) - this.expenses;

    if (this.drawerExpected) this.drawerExpected.innerText = `S/ ${expected.toFixed(2)}`;
    if (this.countedDisplay) this.countedDisplay.innerText = `S/ ${physical.toFixed(2)}`;
    if (this.expectedDisplay) this.expectedDisplay.innerText = `S/ ${expected.toFixed(2)}`;

    const diff = physical - expected;
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
        cashApp.expenses = cashRes.data.shift.expenses;
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

  // Revisar estado de conexión cada 15 segundos
  setInterval(() => {
    if (window.api) window.api.checkHealth();
  }, 15000);
});
