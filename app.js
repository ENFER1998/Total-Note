const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziOBMxs0Xy1tO4gc18j5ZchSU-e8cN3IEEL0U3kw1ymGl7Gf8XA-Fqwp0O2CIIljT13A/exec";
let stockDisponible = [];

document.addEventListener("DOMContentLoaded", () => { 
  let cache = localStorage.getItem("totalNote_datos");
  if (cache) actualizarUI(JSON.parse(cache));
  obtenerDatosAPI(); 
  setInterval(obtenerDatosSilencioso, 12000);
});

function toggleMenu() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('menu-overlay').classList.toggle('mostrar'); }
function cerrarMenu() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('menu-overlay').classList.remove('mostrar'); }

function cambiarVista(vistaId) {
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  document.getElementById(vistaId).classList.add('activa');
  cerrarMenu();
}

function abrirModal(id) { document.getElementById(id).classList.add('mostrar'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('mostrar'); }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.classList.remove('mostrar'); }
function limpiarTexto(txt) { return String(txt).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

function mostrarToast(mensaje) {
  let toast = document.getElementById('toast-notificacion');
  toast.innerText = mensaje;
  toast.classList.add('mostrar');
  setTimeout(() => toast.classList.remove('mostrar'), 3000);
}

function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT).then(r => r.json()).then(datos => {
    localStorage.setItem("totalNote_datos", JSON.stringify(datos));
    actualizarUI(datos);
  }).catch(e => console.log("Cargando desde caché"));
}

function obtenerDatosSilencioso() {
  fetch(URL_APPS_SCRIPT).then(r => r.json()).then(datos => {
    let cacheActual = localStorage.getItem("totalNote_datos");
    if(JSON.stringify(datos) !== cacheActual) {
      localStorage.setItem("totalNote_datos", JSON.stringify(datos));
      actualizarUI(datos);
    }
  }).catch(e => console.log("Sincronización pausada"));
}

function actualizarUI(datos) {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
  let moneda = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });

  // 1. Dashboard
  document.getElementById('val-ingresos').innerText = moneda.format(datos.ingresosMes || 0);
  document.getElementById('val-egresos').innerText = moneda.format(datos.egresosMes || 0);
  let neto = (datos.ingresosMes || 0) - (datos.egresosMes || 0);
  let elNeto = document.getElementById('val-neto');
  elNeto.innerText = moneda.format(neto);
  elNeto.style.color = neto < 0 ? "#ef4444" : "#10b981";
  document.getElementById('val-saldo').innerText = moneda.format(datos.saldoCaja || 0);
  document.getElementById('val-capital').innerText = moneda.format(datos.capitalInventario || 0);
  document.getElementById('val-taller').innerText = moneda.format(datos.proyeccionTaller || 0);

  // Gráfico Gastos
  let contGastos = document.getElementById('grafico-gastos'); contGastos.innerHTML = '';
  if (datos.gastosDashboard && datos.gastosDashboard.length > 0) {
    let max = datos.gastosDashboard[0].total;
    datos.gastosDashboard.forEach(g => {
      let pct = (g.total / max) * 100;
      contGastos.innerHTML += `<div style="margin-bottom:12px;"><div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:bold; color:var(--primary);"><span>${g.categoria}</span><span style="color:var(--danger);">${moneda.format(g.total)}</span></div><div style="background:#e2e8f0; border-radius:5px; height:8px; width:100%; margin-top:5px;"><div style="background:var(--danger); height:100%; border-radius:5px; width:${pct}%;"></div></div></div>`;
    });
  } else { contGastos.innerHTML = '<p style="font-size:0.9rem; color:#64748b;">No hay gastos registrados este mes.</p>'; }

  // 2. Selectores de Venta
  stockDisponible = datos.productosStock || [];
  let selectVenta = document.getElementById('ven-producto');
  selectVenta.innerHTML = '<option value="">Selecciona qué vas a vender...</option>';
  stockDisponible.forEach(prod => { selectVenta.innerHTML += `<option value="${prod.id}">${prod.nombre} - ${moneda.format(prod.precio)}</option>`; });

  // 3. Vista INVENTARIO
  let ulStock = document.getElementById('ul-stock'); ulStock.innerHTML = '';
  if (datos.listaInventario && datos.listaInventario.length > 0) {
    datos.listaInventario.forEach(item => {
      ulStock.innerHTML += `<li>
        <div class="lista-texto"><strong>${item.desc}</strong><br>Costo: ${moneda.format(item.costo)} | Venta: ${moneda.format(item.precio)}</div> 
        <div style="display:flex; gap:5px; align-items:center;"><span class="badge-stock">${item.stock}</span><button class="btn-edit" onclick="abrirEditInv('${item.id}', '${item.tipo}', '${limpiarTexto(item.desc)}', ${item.costo}, ${item.precio}, ${item.stock}, ${item.minimo})"><i class="fas fa-pen"></i></button></div>
      </li>`;
    });
  } else { ulStock.innerHTML = "<li style='justify-content:center; color:#64748b;'>Inventario vacío.</li>"; }

  // 4. Vista TALLER
  let ulTaller = document.getElementById('ul-taller'); ulTaller.innerHTML = '';
  if (datos.listaTaller && datos.listaTaller.length > 0) {
    datos.listaTaller.forEach(item => {
      ulTaller.innerHTML += `<li>
        <div class="lista-texto"><strong>${item.cliente}</strong><br><span>${item.equipo} - ${item.falla}</span><br><strong style="color:var(--warning); font-size:0.9rem;">Gs. ${item.presupuesto}</strong></div> 
        <div style="display:flex; flex-direction:column; gap:5px;">
          <button class="btn-action" onclick="abrirCobro('${item.id}', '${limpiarTexto(item.cliente)}', '${limpiarTexto(item.equipo)}', ${item.presupuesto})">Cobrar</button>
          <button class="btn-edit" onclick="abrirEditTaller('${item.id}', '${limpiarTexto(item.cliente)}', '${limpiarTexto(item.equipo)}', '${limpiarTexto(item.falla)}', ${item.presupuesto})"><i class="fas fa-pen"></i> Editar</button>
        </div>
      </li>`;
    });
  } else { ulTaller.innerHTML = "<li style='justify-content:center; color:#64748b;'>No hay equipos pendientes.</li>"; }

  // 5. Vista DEUDAS
  let ulDeudas = document.getElementById('ul-deudas'); ulDeudas.innerHTML = '';
  if (datos.listaDeudas && datos.listaDeudas.length > 0) {
    datos.listaDeudas.forEach(item => {
      let colorVenc = item.venceEn <= 5 ? "color:var(--danger);" : "color:var(--primary);";
      let textoVenc = item.venceEn < 0 ? "¡Vencido!" : (item.venceEn === 0 ? "Vence HOY" : `En ${item.venceEn} d.`);
      ulDeudas.innerHTML += `<li>
        <div class="lista-texto"><strong style="${colorVenc}">${item.acreedor}</strong><br><span>${item.cuotaInfo} - ${textoVenc}</span><br><strong>${moneda.format(item.monto)}</strong></div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          <button class="btn-action-pay" onclick="abrirPagoDeuda(${item.fila}, '${limpiarTexto(item.acreedor)}', ${item.monto})">Pagar</button>
          <button class="btn-edit" onclick="abrirEditDeuda(${item.fila}, '${limpiarTexto(item.acreedor)}', '${item.montoTotal}', '${item.montoCuota}', '${item.cuotaActual}', '${item.cuotasTotales}', '${item.diaVenc}')"><i class="fas fa-pen"></i> Editar</button>
        </div>
      </li>`;
    });
  } else { ulDeudas.innerHTML = "<li style='justify-content:center; color:#64748b;'>No hay deudas activas.</li>"; }

  // 6. Vista CAJA
  let ulCaja = document.getElementById('ul-caja'); ulCaja.innerHTML = '';
  if (datos.listaCaja && datos.listaCaja.length > 0) {
    datos.listaCaja.forEach(tx => {
      let f = new Date(tx.fecha).toLocaleDateString();
      let color = tx.tipo === "Ingreso" ? "color:var(--success);" : "color:var(--danger);";
      ulCaja.innerHTML += `<li>
        <div class="lista-texto"><strong>${tx.concepto}</strong><br><span>${tx.categoria} | ${f}</span></div>
        <strong style="${color}">${tx.tipo === "Egreso" ? "-" : "+"} ${moneda.format(tx.monto)}</strong>
      </li>`;
    });
  } else { ulCaja.innerHTML = "<li style='justify-content:center; color:#64748b;'>Sin movimientos.</li>"; }

  // 7. ALERTAS DASHBOARD (Corregido con letras rojas y montos)
  let listaA = document.getElementById('lista-alertas'); listaA.innerHTML = ''; let hayAlertas = false;
  
  if (datos.stockBajo && datos.stockBajo.length > 0) { 
    datos.stockBajo.forEach(aviso => { 
      listaA.innerHTML += `<li>
        <span style="color:var(--danger); font-weight:bold;"><i class="fas fa-box"></i> ${aviso}</span>
        <span class="texto-rojo">Comprar</span>
      </li>`; 
      hayAlertas = true; 
    }); 
  }
  
  if (datos.alertasDeuda && datos.alertasDeuda.length > 0) {
    datos.alertasDeuda.forEach(deuda => {
      let estadoTxt = deuda.diasFaltantes < 0 ? "¡VENCIDO!" : (deuda.diasFaltantes === 0 ? "Vence HOY" : `En ${deuda.diasFaltantes} días`);
      listaA.innerHTML += `<li>
        <span style="color:var(--danger); line-height: 1.4;">
          <strong><i class="fas fa-file-invoice-dollar"></i> ${deuda.acreedor}</strong> <span style="font-size:0.85rem; color:var(--danger);">${deuda.cuotaInfo}</span><br>
          <strong style="font-size:1.05rem;">${moneda.format(deuda.monto)}</strong>
        </span>
        <span class="texto-rojo">${estadoTxt}</span>
      </li>`; 
      hayAlertas = true;
    });
  }
  
  if (!hayAlertas) { listaA.innerHTML = '<li style="color:#10b981; font-weight:bold; justify-content:center;"><i class="fas fa-check-circle"></i> Todo en orden.</li>'; }
}

function autocompletarPrecio() { let id = document.getElementById('ven-producto').value; let prod = stockDisponible.find(p => p.id == id); if (prod) document.getElementById('ven-total').value = prod.precio * (document.getElementById('ven-cantidad').value || 1); }
function abrirCobro(id, cli, eq, pres) { document.getElementById('cob-id').value = id; document.getElementById('cob-info').value = cli + " - " + eq; document.getElementById('cob-monto').value = pres; abrirModal('modal-cobro'); }
function abrirPagoDeuda(fila, acreedor, monto) { document.getElementById('pag-fila').value = fila; document.getElementById('pag-acreedor').value = acreedor; document.getElementById('pag-monto').value = monto || ""; document.getElementById('pag-info').innerText = "Destino: " + acreedor; abrirModal('modal-pago-confirmar'); }
function abrirEditInv(id, tipo, desc, costo, precio, stock, min) { document.getElementById('ei-id').value = id; document.getElementById('ei-tipo').value = tipo; document.getElementById('ei-desc').value = desc; document.getElementById('ei-costo').value = costo; document.getElementById('ei-precio').value = precio; document.getElementById('ei-stock').value = stock; document.getElementById('ei-min').value = min; abrirModal('modal-edit-inv'); }
function abrirEditTaller(id, cli, eq, falla, pres) { document.getElementById('et-id').value = id; document.getElementById('et-cliente').value = cli; document.getElementById('et-equipo').value = eq; document.getElementById('et-falla').value = falla; document.getElementById('et-presupuesto').value = pres; abrirModal('modal-edit-taller'); }
function abrirEditDeuda(fila, acre, total, cuota, act, tot, dia) { document.getElementById('ed-fila').value = fila; document.getElementById('ed-acreedor').value = acre; document.getElementById('ed-total').value = total; document.getElementById('ed-monto').value = cuota; document.getElementById('ed-cuota-actual').value = act; document.getElementById('ed-cuota-total').value = tot; document.getElementById('ed-dia').value = dia; abrirModal('modal-edit-deuda'); }

// ENVIOS
function enviarVenta(e) { e.preventDefault(); let idProd = document.getElementById('ven-producto').value; let prodNombre = document.getElementById('ven-producto').options[document.getElementById('ven-producto').selectedIndex].text.split(" - ")[0]; procesarEnvio({accion: 'venta', idProducto: idProd, producto: prodNombre, cantidad: document.getElementById('ven-cantidad').value, total: document.getElementById('ven-total').value, metodo: document.getElementById('ven-metodo').value}, 'modal-venta', 'form-venta', 'btn-ven'); }
function enviarCaja(e) { e.preventDefault(); procesarEnvio({accion: 'caja', tipo: document.getElementById('caja-tipo').value, categoria: document.getElementById('caja-categoria').value, concepto: document.getElementById('caja-concepto').value, monto: document.getElementById('caja-monto').value, metodo: document.getElementById('caja-metodo').value}, 'modal-caja', 'form-caja', 'btn-caja'); }
function enviarTaller(e) { e.preventDefault(); procesarEnvio({accion: 'taller', cliente: document.getElementById('tal-cliente').value, equipo: document.getElementById('tal-equipo').value, falla: document.getElementById('tal-falla').value, presupuesto: document.getElementById('tal-presupuesto').value}, 'modal-taller', 'form-taller', 'btn-tal'); }
function enviarInventario(e) { e.preventDefault(); procesarEnvio({accion: 'inventario', tipo: document.getElementById('inv-tipo').value, descripcion: document.getElementById('inv-desc').value, costo: document.getElementById('inv-costo').value, precio: document.getElementById('inv-precio').value, stock: document.getElementById('inv-stock').value, minimo: document.getElementById('inv-min').value, registrarGasto: document.getElementById('inv-gasto').checked}, 'modal-inventario', 'form-inventario', 'btn-inv'); }
function enviarDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'deuda', acreedor: document.getElementById('deu-categoria').value + " - " + document.getElementById('deu-acreedor').value, montoTotal: document.getElementById('deu-monto-total').value || "", montoCuota: document.getElementById('deu-monto-cuota').value || "", cuotaActual: document.getElementById('deu-cuota-actual').value || "", cuotasTotales: document.getElementById('deu-cuota-total').value || "", diaVenc: document.getElementById('deu-dia').value}, 'modal-deuda', 'form-deuda', 'btn-deu'); }
function enviarCobroTaller(e) { e.preventDefault(); procesarEnvio({accion: 'cobrar_taller', idOrden: document.getElementById('cob-id').value, concepto: document.getElementById('cob-info').value, montoCobrado: document.getElementById('cob-monto').value, metodo: document.getElementById('cob-metodo').value}, 'modal-cobro', 'form-cobro', 'btn-cob'); }
function enviarPagoDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'pagar_deuda', fila: document.getElementById('pag-fila').value, acreedor: document.getElementById('pag-acreedor').value, monto: document.getElementById('pag-monto').value, metodo: document.getElementById('pag-metodo').value}, 'modal-pago-confirmar', 'form-pago-deuda', 'btn-pagar'); }
function enviarEditInv(e) { e.preventDefault(); procesarEnvio({accion: 'editar_inventario', id: document.getElementById('ei-id').value, tipo: document.getElementById('ei-tipo').value, descripcion: document.getElementById('ei-desc').value, costo: document.getElementById('ei-costo').value, precio: document.getElementById('ei-precio').value, stock: document.getElementById('ei-stock').value, minimo: document.getElementById('ei-min').value}, 'modal-edit-inv', 'form-edit-inv', 'btn-ei'); }
function enviarEditTaller(e) { e.preventDefault(); procesarEnvio({accion: 'editar_taller', id: document.getElementById('et-id').value, cliente: document.getElementById('et-cliente').value, equipo: document.getElementById('et-equipo').value, falla: document.getElementById('et-falla').value, presupuesto: document.getElementById('et-presupuesto').value}, 'modal-edit-taller', 'form-edit-taller', 'btn-et'); }
function enviarEditDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'editar_deuda', fila: document.getElementById('ed-fila').value, acreedor: document.getElementById('ed-acreedor').value, montoTotal: document.getElementById('ed-total').value || "", montoCuota: document.getElementById('ed-monto').value || "", cuotaActual: document.getElementById('ed-cuota-actual').value || "", cuotasTotales: document.getElementById('ed-cuota-total').value || "", diaVenc: document.getElementById('ed-dia').value}, 'modal-edit-deuda', 'form-edit-deuda', 'btn-ed'); }

function procesarEnvio(datos, idModal, idForm, idBtn) {
  let btn = document.getElementById(idBtn); let textoOrig = btn.innerText; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;
  
  fetch(URL_APPS_SCRIPT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
  .then(r => r.json()).then(res => {
    if (res.exito) { 
      cerrarModal(idModal); 
      document.getElementById(idForm).reset(); 
      mostrarToast("¡Guardado correctamente!");
      obtenerDatosSilencioso(); 
    } else alert("Error: " + res.error);
  }).catch(e => alert("Error de red.")).finally(() => { btn.innerText = textoOrig; btn.disabled = false; });
}
