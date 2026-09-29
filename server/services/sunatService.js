/**
 * ============================================================================
 * VALETEC PHARMA - PROXY DE COMPATIBILIDAD HACIA SUNAT SERVICE UNIFICADO
 * ============================================================================
 * Redirige todas las llamadas al módulo centralizado en server/src/services/sunat.service.js.
 * Elimina 400 líneas de código duplicado manteniendo 100% de compatibilidad.
 * ============================================================================
 */

const sunatServiceModule = require('../src/services/sunat.service');

const instance = sunatServiceModule.sunatService;
instance.numberToLetters = sunatServiceModule.numberToLetters;
instance.generateUBL21 = sunatServiceModule.generateUBL21;
instance.COMPANY_CONFIG = sunatServiceModule.COMPANY_CONFIG;
instance.getCompanyConfigFromDb = sunatServiceModule.getCompanyConfigFromDb;
instance.SunatService = sunatServiceModule.SunatService;
instance.sunatService = instance;

module.exports = instance;
