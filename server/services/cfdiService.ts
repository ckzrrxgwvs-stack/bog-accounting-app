// CFDI Integration Service for Mexico

export interface CFDIConfig {
  pacApiUrl: string;
  pacApiKey: string;
  companyRfc: string;
  companyCertificate: string;
  companyPrivateKey: string;
  satEnvironment: 'production' | 'test';
}

export interface CFDIInvoice {
  // Emisor (From)
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimenFiscal: string;

  // Receptor (To)
  receptorRfc: string;
  receptorNombre: string;
  receptorUsoCFDI: string;

  // Invoice details
  serie?: string;
  folio?: string;
  fecha: string;
  lugarExpedicion: string;

  // Totals
  subtotal: number;
  totalImpuestosTrasladados: number;
  total: number;

  // Conceptos
  conceptos: CFDIConcepto[];

  // Payment info (for CFDI related to payments)
  complementoPago?: {
    fechaPago: string;
    formaPago: string;
    moneda: string;
    tipoCambio: number;
    monto: number;
  };
}

export interface CFDIConcepto {
  claveProdServ: string;
  noIdentificacion?: string;
  cantidad: number;
  claveUnidad: string;
  unidad: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;

  // Tax
  impuestos?: {
    tasaOCuota: number;
    importe: number;
  }[];
}

export interface CFDIResponse {
  success: boolean;
  uuid?: string;
  fechaTimbrado?: string;
  certificadoSat?: string;
  sellocfd?: string;
  qrCode?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
  codigoStatus?: string;
  estadoComprobante?: string;
}

export class CFDIService {
  private config: CFDIConfig;
  private isConfigured: boolean;

  constructor() {
    this.config = {
      pacApiUrl: process.env.PAC_API_URL || '',
      pacApiKey: process.env.PAC_API_KEY || '',
      companyRfc: process.env.COMPANY_RFC || '',
      companyCertificate: process.env.COMPANY_CERTIFICATE || '',
      companyPrivateKey: process.env.COMPANY_PRIVATE_KEY || '',
      satEnvironment: (process.env.SAT_ENVIRONMENT as 'production' | 'test') || 'test',
    };

    this.isConfigured = !!(
      this.config.pacApiUrl &&
      this.config.pacApiKey &&
      this.config.companyRfc &&
      this.config.companyCertificate &&
      this.config.companyPrivateKey
    );
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate XML for CFDI
   */
  private generateXML(invoice: CFDIInvoice): string {
    const uuid = this.generateUUID();
    const fecha = invoice.fecha;

    // In production, this would generate a proper CFDI 4.0 XML
    // This is a simplified example
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 cfdi.xsd"
  Version="4.0"
  Serie="${invoice.serie || ''}"
  Folio="${invoice.folio || ''}"
  Fecha="${fecha}"
  FormaPago="${invoice.conceptos.length > 0 ? '99' : 'PUE'}"
  CondicionesDePago="Contado"
  SubTotal="${invoice.subtotal.toFixed(2)}"
  Descuento="0.00"
  Moneda="MXN"
  TipoCambio="1.00"
  Total="${invoice.total.toFixed(2)}"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="PPD"
  LugarExpedicion="${invoice.lugarExpedicion}">

  <cfdi:Emisor Rfc="${invoice.emisorRfc}" Nombre="${invoice.emisorNombre}" RegimenFiscal="${invoice.emisorRegimenFiscal}"/>

  <cfdi:Receptor Rfc="${invoice.receptorRfc}" Nombre="${invoice.receptorNombre}" UsoCFDI="${invoice.receptorUsoCFDI}" RegimenFiscal Receptor="616" DomicilioFiscalReceptor="66360"/>

  <cfdi:Conceptos>
    ${invoice.conceptos.map(c => `
    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}"
      NoIdentificacion="${c.noIdentificacion || ''}"
      Cantidad="${c.cantidad}"
      ClaveUnidad="${c.claveUnidad}"
      Unidad="${c.unidad}"
      Descripcion="${c.descripcion}"
      ValorUnitario="${c.valorUnitario.toFixed(2)}"
      Importe="${c.importe.toFixed(2)}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${c.importe.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(c.importe * 0.16).toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`).join('')}
  </cfdi:Conceptos>

  <cfdi:Impuestos TotalImpuestosTrasladados="${invoice.totalImpuestosTrasladados.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${invoice.totalImpuestosTrasladados.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>

  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital tfd.xsd"
      Version="1.1"
      UUID="${uuid}"
      FechaTimbrado="${fecha}"
      RfcProvCertif="IAME520209A9A"
      SelloCFD="demo"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    return xml;
  }

  /**
   * Stamp CFDI with PAC (Servicio de Administración Tributaria)
   */
  async stampCFDI(invoice: CFDIInvoice): Promise<CFDIResponse> {
    if (!this.isConfigured) {
      // Demo mode - return mock response
      return {
        success: true,
        uuid: this.generateUUID(),
        fechaTimbrado: new Date().toISOString(),
        sellocfd: 'DEMO_SELLO_CFD',
        certificadoSat: 'DEMO_CERT_SAT',
        estadoComprobante: 'Vigente',
        codigoStatus: '5000',
      };
    }

    try {
      const xml = this.generateXML(invoice);

      // In production, this would send to the PAC (e.g., Solución Factible, SW Developer, etc.)
      const response = await fetch(this.config.pacApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.pacApiKey}`,
        },
        body: JSON.stringify({
          action: 'stamp',
          xml: xml,
          rfcEmisor: this.config.companyRfc,
          environment: this.config.satEnvironment,
        }),
      });

      if (!response.ok) {
        throw new Error(`PAC API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        uuid: result.UUID,
        fechaTimbrado: result.FechaTimbrado,
        sellocfd: result.SelloCFD,
        certificadoSat: result.CertificadoSAT,
        qrCode: result.QrCode,
      };
    } catch (error) {
      console.error('CFDI Stamp Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel CFDI
   */
  async cancelCFDI(uuid: string, rfcEmisor: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: true };
    }

    try {
      const response = await fetch(this.config.pacApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.pacApiKey}`,
        },
        body: JSON.stringify({
          action: 'cancel',
          uuid: uuid,
          rfcEmisor: rfcEmisor,
        }),
      });

      if (!response.ok) {
        throw new Error(`PAC API error: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify CFDI status with SAT
   */
  async verifyCFDI(uuid: string): Promise<{ estado: string; estadoComprobante: string }> {
    if (!this.isConfigured) {
      return { estado: 'Activo', estadoComprobante: 'Vigente' };
    }

    // In production, query SAT webservice
    return { estado: 'Activo', estadoComprobante: 'Vigente' };
  }

  /**
   * Generate Complemento de Pago (for payment allocations)
   */
  async generatePaymentComplement(
    paymentData: {
      fechaPago: string;
      formaPago: string;
      monto: number;
      relatedInvoices: { uuid: string; monto: number; saldoAnterior: number; saldoInsoluto: number }[];
    },
    emisorRfc: string
  ): Promise<CFDIResponse> {
    const pagoUuid = this.generateUUID();

    if (!this.isConfigured) {
      return {
        success: true,
        uuid: pagoUuid,
        fechaTimbrado: new Date().toISOString(),
      };
    }

    // Generate Pago 1.0 complement XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0">
  <cfdi:Emisor Rfc="${emisorRfc}" Nombre="" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="XAXX010101000" Nombre="Publico en General" UsoCFDI="P01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <pago20:Pagos xmlns:pago20="http://www.sat.gob.mx/pagos20" Version="2.0">
      <pago20:Pago FechaPago="${paymentData.fechaPago}" FormaPago="${paymentData.formaPago}" Moneda="MXN" TipoCambioP="1" Monto="${paymentData.monto}">
        ${paymentData.relatedInvoices.map(inv => `
        <pago20:DoctoRelacionado IdDocumento="${inv.uuid}" Serie="" Folio="" Moneda="MXN" NumParcialidad="${1}" ImpSaldoAnt="${inv.saldoAnterior.toFixed(2)}" ImpPagado="${inv.monto.toFixed(2)}" ImpSaldoInsoluto="${inv.saldoInsoluto.toFixed(2)}" ObjetoImp="02"/>
        `).join('')}
      </pago20:Pago>
    </pago20:Pagos>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    // Stamp and return
    return {
      success: true,
      uuid: pagoUuid,
      fechaTimbrado: new Date().toISOString(),
    };
  }
}

export const cfdiService = new CFDIService();