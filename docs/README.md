# VALETEC PHARMA SUITE v2.0 - CENTRO DE DOCUMENTACIÓN

Bienvenido al centro oficial de documentación, manuales operativos y guías técnicas de **VALETEC PHARMA SUITE v2.0**.

Esta suite documental ha sido diseñada siguiendo estándares de la industria farmacéutica y directrices normativas de **DIGEMID (MINSA)** y **SUNAT**, estructurada en tres tomos modulares según el perfil del usuario:

---

## 📚 Tomos Documentales

| Tomo | Documento | Audiencia Principal | Contenido Clave |
| :---: | :--- | :--- | :--- |
| **01** | [**1_DOCUMENTACION_TECNICA.md**](./1_DOCUMENTACION_TECNICA.md) | Ingenieros de Software, Arquitectos y Auditores de Sistemas | • Arquitectura física y de contenedores Docker (Mermaid)<br>• Flujo de datos MVC y capas de seguridad<br>• Diccionario de datos canónico de las 14 tablas relacionales<br>• Catálogo completo de endpoints REST y matriz RBAC |
| **02** | [**2_MANUAL_OPERATIVO_SOP.md**](./2_MANUAL_OPERATIVO_SOP.md) | Químicos Farmacéuticos (Regentes), Técnicos de Farmacia y Cajeros | • **SOP-01:** Atención en mostrador, venta fraccionada (caja/blíster/unidad) y cobro POS<br>• **SOP-02:** Almacén, ingreso de lotes, semáforo FEFO y mermas con firma RBAC<br>• **SOP-03:** Libro oficial de controlados DIGEMID, recetas foliadas y balance sanitario<br>• **SOP-04:** Arqueo de gaveta, control de egresos menores y Cierre Z |
| **03** | [**3_DEVOPS_Y_CONTINGENCIAS.md**](./3_DEVOPS_Y_CONTINGENCIAS.md) | Administradores de Sistemas, DevOps y Soporte de Infraestructura TI | • Puesta en marcha rápida con Docker Compose en producción<br>• Monitoreo de recursos y lectura de logs<br>• Políticas de respaldo diario automatizado y plan de *Disaster Recovery* con `pg_dump`<br>• Matriz de resolución de incidentes (Troubleshooting) |

---

## 🏛️ Marco Normativo y Cumplimiento
* **R.M. 554-2022/MINSA:** Manual de Buenas Prácticas de Oficina Farmacéutica (BPOF) y Libro Oficial de Controlados.
* **R.M. 132-2015/MINSA:** Manual de Buenas Prácticas de Almacenamiento (BPA) y trazabilidad FEFO.
* **SUNAT UBL 2.1:** Estándar de comprobantes de pago electrónicos (Boletas, Facturas y Notas asociadas).
