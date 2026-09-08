const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziOBMxs0Xy1tO4gc18j5ZchSU-e8cN3IEEL0U3kw1ymGl7Gf8XA-Fqwp0O2CIIljT13A/exec";
let stockDisponible = [];

document.addEventListener("DOMContentLoaded", () => { obtenerDatosAPI(); });

function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT).then(r => r.json()).then(datos => actualizarDashboard(datos))
  .catch(e => { document.getElementById('loader').innerHTML = `<p style="color:red; font-weight:bold;">Error de red.</p>`; });
}

function limpiarTexto(txt) { return String(txt).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

function actualizarDashboard(datos) {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';

  let moneda = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });

  let elSaldo = document.getElementById('val-saldo');
  elSaldo.innerText = moneda.format(datos.saldoCaja || 0);
  elSaldo.style.color = (datos.saldoCaja || 0) < 0 ? "#ef4444" : "#10b981";

  document.getElementById('val-capital').innerText = moneda.format(datos.capitalInventario || 0);
  document.getElementById('val-taller').innerText = moneda.format(datos.proyeccionTaller || 0);

  stockDisponible = datos.productosStock || [];
  let selectVenta = document.getElementById('ven-producto');
  selectVenta.innerHTML = '<option value="">Selecciona qué vas a vender...</option>';
  stockDisponible.forEach(prod => { selectVenta.innerHTML += `<option value="${prod.id}">${prod.nombre} - ${moneda.format(prod.precio)}</option>`; });

  // Listas con Botón Editar
  let ulStock = document.getElementById('ul-stock');
  ulStock.innerHTML = '';
  if (datos.listaInventario && datos.listaInventario.length > 0) {
    datos.listaInventario.forEach(item => {
      if(item.stock > 0) {
        ulStock.innerHTML += `<li>
          <div class="lista-texto"><strong>${item.desc}</strong><br>${moneda.format(item.precio)}</div> 
          <div style="display:flex; gap:5px; align-items:center;">
            <span class="badge-stock">${item.stock}</span>
            <button class="btn-edit" onclick="abrirEditInv('${item.id}', '${item.tipo}', '${limpiarTexto(item.desc)}', ${item.costo}, ${item.precio}, ${item.stock}, ${item.minimo})"><i class="fas fa-pen"></i></button>
          </div>
        </li>`;
      }
    });
  } else { ulStock.innerHTML = "<li>No hay productos en stock.</li>"; }

  let ulTaller = document.getElementById('ul-taller');
  ulTaller.innerHTML = '';
  if (datos.listaTaller && datos.listaTaller.length > 0) {
    datos.listaTaller.forEach(item => {
      ulTaller.innerHTML += `<li>
        <div class="lista-texto"><strong>${item.cliente}</strong><br>${item.equipo}</div> 
        <div style="display:flex; gap:5px;">
          <button onclick="abrirCobro('${item.id}', '${limpiarTexto(item.cliente)}', '${limpiarTexto(item.equipo)}', ${item.presupuesto})" style="background:var(--success); color:white; border:none; padding:8px 10px; border-radius:8px; font-weight:bold; cursor:pointer;">Cobrar</button>
          <button class="btn-edit" onclick="abrirEditTaller('${item.id}', '${limpiarTexto(item.cliente)}', '${limpiarTexto(item.equipo)}', '${limpiarTexto(item.falla)}', ${item.presupuesto})"><i class="fas fa-pen"></i></button>
        </div>
      </li>`;
    });
  } else { ulTaller.innerHTML = "<li>No hay equipos pendientes.</li>"; }

  let ulDeudas = document.getElementById('ul-deudas');
  ulDeudas.innerHTML = '';
  if (datos.listaDeudas && datos.listaDeudas.length > 0) {
    datos.listaDeudas.forEach(item => {
      let colorVenc = item.venceEn <= 5 ? "color:var(--danger);" : "color:var(--primary);";
      let textoVenc = item.venceEn < 0 ? "¡Vencido!" : (item.venceEn === 0 ? "Vence HOY" : `En ${item.venceEn} d.`);
      ulDeudas.innerHTML += `<li>
        <div class="lista-texto"><strong style="${colorVenc}">${item.acreedor}</strong><br><span style="font-size:0.8rem; color:#64748b;">${item.cuotaInfo} - ${textoVenc}</span></div>
        <div style="display:flex; gap:5px;">
          <button onclick="abrirPagoDeuda(${item.fila}, '${limpiarTexto(item.acreedor)}', ${item.monto})" style="background:var(--accent); color:white; border:none; padding:8px 10px; border-radius:8px; font-weight:bold; cursor:pointer;">Pagar</button>
          <button class="btn-edit" onclick="abrirEditDeuda(${item.fila}, '${limpiarTexto(item.acreedor)}', '${item.montoTotal}', '${item.montoCuota}', '${item.cuotaActual}', '${item.cuotasTotales}', '${item.diaVenc}')"><i class="fas fa-pen"></i></button>
        </div>
      </li>`;
    });
  } else { ulDeudas.innerHTML = "<li>No hay obligaciones registradas.</li>"; }

  let lista = document.getElementById('lista-alertas');
  lista.innerHTML = '';
  let hayAlertas = false;
  if (datos.stockBajo && datos.stockBajo.length > 0) {
    datos.stockBajo.forEach(aviso => { lista.innerHTML += `<li><span><i class="fas fa-box" style="color:#f59e0b"></i> ${aviso}</span><span class="texto-rojo">Comprar</span></li>`; hayAlertas = true; });
  }
  if (datos.alertasDeuda && datos.alertasDeuda.length > 0) {
    datos.alertasDeuda.forEach(deuda => {
      let estadoTxt = deuda.diasFaltantes < 0 ? "¡VENCIDO!" : (deuda.diasFaltantes === 0 ? "Vence HOY" : `En ${deuda.diasFaltantes} días`);
      lista.innerHTML += `<li><span><i class="fas fa-file-invoice-dollar" style="color:#ef4444"></i> ${deuda.acreedor} ${deuda.cuotaInfo}</span><span class="texto-rojo">${estadoTxt}</span></li>`;
      hayAlertas = true;
    });
  }
  if (!hayAlertas) { lista.innerHTML = '<li><span style="color: #10b981; font-weight:bold;"><i class="fas fa-check-circle"></i> Todo en orden.</span></li>'; }
}

function autocompletarPrecio() {
  let id = document.getElementById('ven-producto').value;
  let prod = stockDisponible.find(p => p.id == id);
  if (prod) document.getElementById('ven-total').value = prod.precio * (document.getElementById('ven-cantidad').value || 1);
}

function abrirModal(id) { document.getElementById(id).classList.add('mostrar'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('mostrar'); }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.classList.remove('mostrar'); }

function abrirCobro(id, cliente, equipo, presupuesto) { document.getElementById('cob-id').value = id; document.getElementById('cob-info').value = cliente + " - " + equipo; document.getElementById('cob-monto').value = presupuesto; cerrarModal('modal-lista-taller'); abrirModal('modal-cobro'); }
function abrirPagoDeuda(fila, acreedor, monto) { document.getElementById('pag-fila').value = fila; document.getElementById('pag-acreedor').value = acreedor; document.getElementById('pag-monto').value = monto || ""; document.getElementById('pag-info').innerText = "Destino: " + acreedor; cerrarModal('modal-lista-deudas'); abrirModal('modal-pago-confirmar'); }

// Llenar formularios de Edición
function abrirEditInv(id, tipo, desc, costo, precio, stock, min) { document.getElementById('ei-id').value = id; document.getElementById('ei-tipo').value = tipo; document.getElementById('ei-desc').value = desc; document.getElementById('ei-costo').value = costo; document.getElementById('ei-precio').value = precio; document.getElementById('ei-stock').value = stock; document.getElementById('ei-min').value = min; cerrarModal('modal-lista-stock'); abrirModal('modal-edit-inv'); }
function abrirEditTaller(id, cli, eq, falla, pres) { document.getElementById('et-id').value = id; document.getElementById('et-cliente').value = cli; document.getElementById('et-equipo').value = eq; document.getElementById('et-falla').value = falla; document.getElementById('et-presupuesto').value = pres; cerrarModal('modal-lista-taller'); abrirModal('modal-edit-taller'); }
function abrirEditDeuda(fila, acre, total, cuota, act, tot, dia) { document.getElementById('ed-fila').value = fila; document.getElementById('ed-acreedor').value = acre; document.getElementById('ed-total').value = total; document.getElementById('ed-monto').value = cuota; document.getElementById('ed-cuota-actual').value = act; document.getElementById('ed-cuota-total').value = tot; document.getElementById('ed-dia').value = dia; cerrarModal('modal-lista-deudas'); abrirModal('modal-edit-deuda'); }

// ENVIOS CREADORES
function enviarVenta(e) { e.preventDefault(); let idProd = document.getElementById('ven-producto').value; let prodNombre = document.getElementById('ven-producto').options[document.getElementById('ven-producto').selectedIndex].text.split(" - ")[0]; procesarEnvio({accion: 'venta', idProducto: idProd, producto: prodNombre, cantidad: document.getElementById('ven-cantidad').value, total: document.getElementById('ven-total').value, metodo: document.getElementById('ven-metodo').value}, 'modal-venta', 'form-venta', 'btn-ven'); }
function enviarCaja(e) { e.preventDefault(); procesarEnvio({accion: 'caja', tipo: document.getElementById('caja-tipo').value, concepto: document.getElementById('caja-concepto').value, categoria: "Gasto Rápido", monto: document.getElementById('caja-monto').value, metodo: document.getElementById('caja-metodo').value}, 'modal-caja', 'form-caja', 'btn-caja'); }
function enviarTaller(e) { e.preventDefault(); procesarEnvio({accion: 'taller', cliente: document.getElementById('tal-cliente').value, equipo: document.getElementById('tal-equipo').value, falla: document.getElementById('tal-falla').value, presupuesto: document.getElementById('tal-presupuesto').value}, 'modal-taller', 'form-taller', 'btn-tal'); }
function enviarInventario(e) { e.preventDefault(); procesarEnvio({accion: 'inventario', tipo: document.getElementById('inv-tipo').value, descripcion: document.getElementById('inv-desc').value, costo: document.getElementById('inv-costo').value, precio: document.getElementById('inv-precio').value, stock: document.getElementById('inv-stock').value, minimo: document.getElementById('inv-min').value, registrarGasto: document.getElementById('inv-gasto').checked}, 'modal-inventario', 'form-inventario', 'btn-inv'); }
function enviarDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'deuda', acreedor: document.getElementById('deu-categoria').value + " - " + document.getElementById('deu-acreedor').value, montoTotal: document.getElementById('deu-monto-total').value || "", montoCuota: document.getElementById('deu-monto-cuota').value || "", cuotaActual: document.getElementById('deu-cuota-actual').value || "", cuotasTotales: document.getElementById('deu-cuota-total').value || "", diaVenc: document.getElementById('deu-dia').value}, 'modal-deuda', 'form-deuda', 'btn-deu'); }

// ENVIOS PAGOS Y EDICIONES
function enviarCobroTaller(e) { e.preventDefault(); procesarEnvio({accion: 'cobrar_taller', idOrden: document.getElementById('cob-id').value, concepto: document.getElementById('cob-info').value, montoCobrado: document.getElementById('cob-monto').value, metodo: document.getElementById('cob-metodo').value}, 'modal-cobro', 'form-cobro', 'btn-cob'); }
function enviarPagoDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'pagar_deuda', fila: document.getElementById('pag-fila').value, acreedor: document.getElementById('pag-acreedor').value, monto: document.getElementById('pag-monto').value, metodo: document.getElementById('pag-metodo').value}, 'modal-pago-confirmar', 'form-pago-deuda', 'btn-pagar'); }
function enviarEditInv(e) { e.preventDefault(); procesarEnvio({accion: 'editar_inventario', id: document.getElementById('ei-id').value, tipo: document.getElementById('ei-tipo').value, descripcion: document.getElementById('ei-desc').value, costo: document.getElementById('ei-costo').value, precio: document.getElementById('ei-precio').value, stock: document.getElementById('ei-stock').value, minimo: document.getElementById('ei-min').value}, 'modal-edit-inv', 'form-edit-inv', 'btn-ei'); }
function enviarEditTaller(e) { e.preventDefault(); procesarEnvio({accion: 'editar_taller', id: document.getElementById('et-id').value, cliente: document.getElementById('et-cliente').value, equipo: document.getElementById('et-equipo').value, falla: document.getElementById('et-falla').value, presupuesto: document.getElementById('et-presupuesto').value}, 'modal-edit-taller', 'form-edit-taller', 'btn-et'); }
function enviarEditDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'editar_deuda', fila: document.getElementById('ed-fila').value, acreedor: document.getElementById('ed-acreedor').value, montoTotal: document.getElementById('ed-total').value || "", montoCuota: document.getElementById('ed-monto').value || "", cuotaActual: document.getElementById('ed-cuota-actual').value || "", cuotasTotales: document.getElementById('ed-cuota-total').value || "", diaVenc: document.getElementById('ed-dia').value}, 'modal-edit-deuda', 'form-edit-deuda', 'btn-ed'); }

function procesarEnvio(datos, idModal, idForm, idBtn) {
  let btn = document.getElementById(idBtn); let textoOrig = btn.innerText; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;
  fetch(URL_APPS_SCRIPT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
  .then(r => r.json()).then(res => {
    if (res.exito) { cerrarModal(idModal); document.getElementById(idForm).reset(); document.getElementById('main-content').style.display = 'none'; document.getElementById('loader').style.display = 'block'; obtenerDatosAPI(); } else alert("Error: " + res.error);
  }).catch(e => alert("Error de red.")).finally(() => { btn.innerText = textoOrig; btn.disabled = false; });
}
