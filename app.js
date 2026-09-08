// =========================================================================
// 3. MOTOR DE ESCRITURA DEFINITIVO (Recibe datos de la web y los guarda)
// =========================================================================
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let p = JSON.parse(e.postData.contents);
    
    // Obtener fecha y hora de Asunción, Paraguay
    let fechaHoy = new Date().toLocaleString("es-PY", {timeZone: "America/Asuncion"});
    let idUnico = Math.floor(Math.random() * 100000);

    if (p.accion === "venta") {
      // 1. Registrar ingreso en Caja (Precio de venta)
      ss.getSheetByName("Caja_General").appendRow(["TX-VEN-"+idUnico, fechaHoy, "Ingreso", "Ventas", p.producto, p.total, p.metodo]);
      // 2. Descontar stock
      let hojaInv = ss.getSheetByName("Inventario");
      let dataInv = hojaInv.getDataRange().getValues();
      for (let i = 1; i < dataInv.length; i++) {
        if (dataInv[i][0] == p.idProducto) { // Buscar por ID
          let stockActual = parseInt(dataInv[i][5]) || 0;
          hojaInv.getRange(i + 1, 6).setValue(stockActual - parseInt(p.cantidad));
          break;
        }
      }
    } 
    else if (p.accion === "caja") {
      // Registrar cualquier Gasto o Ingreso extra
      ss.getSheetByName("Caja_General").appendRow(["TX-"+p.tipo.substring(0,3)+"-"+idUnico, fechaHoy, p.tipo, p.categoria, p.concepto, p.monto, p.metodo]);
    }
    else if (p.accion === "taller") {
      // Ingresar equipo a reparar
      ss.getSheetByName("Taller").appendRow(["REP-"+idUnico, fechaHoy, p.cliente, p.equipo, p.falla, "Pendiente", 0, 0]);
    }
    else if (p.accion === "inventario") {
      // Comprar nueva mercadería
      ss.getSheetByName("Inventario").appendRow(["PROD-"+idUnico, p.tipo, p.descripcion, p.costo, p.precio, p.stock, p.minimo]);
      // Opcional: Registrar el gasto de esta compra en caja
      if(p.registrarGasto) {
         ss.getSheetByName("Caja_General").appendRow(["TX-COM-"+idUnico, fechaHoy, "Egreso", "Compra Mercadería", p.descripcion, (p.costo * p.stock), "Efectivo"]);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ "exito": true })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "exito": false, "error": error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
