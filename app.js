// TU ENLACE DE APPS SCRIPT
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziOBMxs0Xy1tO4gc18j5ZchSU-e8cN3IEEL0U3kw1ymGl7Gf8XA-Fqwp0O2CIIljT13A/exec";
let stockDisponible = [];

// Iniciar al cargar la página
document.addEventListener("DOMContentLoaded", () => { obtenerDatosAPI(); });

// Función principal de conexión
function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT)
    .then(r => r.json())
    .then(datos => actualizarDashboard(datos))
    .catch(e => { document.getElementById('loader').innerHTML = `<p style="color:red; font-weight:bold;">Error de red. Verifica tu conexión o el enlace de Apps Script.</p>`; });
}

// Pintar la pantalla con los datos
function actualizarDashboard(datos) {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';

  let moneda = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });

  // 1. Balance y Patrimonio
  document.getElementById('val-ingresos').innerText = moneda.format(datos.ingresosMes || 0);
  document.getElementById('val-egresos').innerText = moneda.format(datos.egresosMes || 0);
  
  let neto = (datos.ingresosMes || 0) - (datos.egresosMes || 0);
  let elNeto = document.getElementById('val-neto');
  elNeto.innerText = moneda.format(neto);
  elNeto.style.color = neto < 0 ? "#ef4444" : "#10b981";

  document.getElementById('val-capital').innerText = moneda.format(datos.capitalInventario || 0);
  document.getElementById('val-taller').innerText = moneda.format(datos.proyeccionTaller || 0);

  // 2. Select Venta (Menú desplegable)
  stockDisponible = datos.productosStock || [];
  let selectVenta = document.getElementById('ven-producto');
  selectVenta.innerHTML = '<option value="">Selecciona qué vas a vender...</option>';
  stockDisponible.forEach(prod => {
    selectVenta.innerHTML += `<option value="${prod.id}">${prod.nombre} - ${moneda.format(prod.precio)}</option>`;
  });

  // 3. Renderizar Listas de Visualización
  let ulStock = document.getElementById('ul-stock');
  ulStock.innerHTML = '';
  if (datos.listaInventario && datos.listaInventario.length > 0) {
    datos.listaInventario.forEach(item => {
      if(item.stock > 0) {
        ulStock.innerHTML += `<li><div class="lista-texto"><strong>${item.desc}</strong><br>${moneda.format(item.precio)}</div> <span class="badge-stock">${item.stock} en stock</span></li>`;
      }
    });
  } else { ulStock.innerHTML = "<li>No hay productos en stock.</li>"; }

  let ulTaller = document.getElementById('ul-taller');
  ulTaller.innerHTML = '';
  if (datos.listaTaller && datos.listaTaller.length > 0) {
    datos.listaTaller.forEach(item => {
      ulTaller.innerHTML += `<li><div class="lista-texto"><strong>${item.cliente}</strong><br>${item.equipo} - <span style="color:#64748b;">${item.falla}</span></div> <span class="badge-taller">${item.estado}</span></li>`;
    });
  } else { ulTaller.innerHTML = "<li>No hay equipos pendientes.</li>"; }

  // 4. Alertas Inteligentes
  let lista = document.getElementById('lista-alertas');
  lista.innerHTML = '';
  let hayAlertas = false;

  // Alerta de Stock Bajo
  if (datos.stockBajo && datos.stockBajo.length > 0) {
    datos.stockBajo.forEach(aviso => {
      lista.innerHTML += `<li><span><i class="fas fa-box" style="color:#f59e0b"></i> ${aviso}</span><span class="texto-rojo">Comprar</span></li>`;
      hayAlertas = true;
    });
  }
  // Alerta de Deudas y Vencimientos
  if (datos.alertasDeuda && datos.alertasDeuda.length > 0) {
    datos.alertasDeuda.forEach(deuda => {
      let estadoTxt = deuda.diasFaltantes < 0 ? "¡VENCIDO!" : (deuda.diasFaltantes === 0 ? "Vence HOY" : `En ${deuda.diasFaltantes} días`);
      lista.innerHTML += `<li><span><i class="fas fa-file-invoice-dollar" style="color:#ef4444"></i> ${deuda.acreedor} ${deuda.cuotaInfo}<br><b>${moneda.format(deuda.monto)}</b></span><span class="texto-rojo">${estadoTxt}</span></li>`;
      hayAlertas = true;
    });
  }
  
  if (!hayAlertas) { 
    lista.innerHTML = '<li><span style="color: #10b981; font-weight:bold;"><i class="fas fa-check-circle"></i> Todo en orden. No hay alertas urgentes.</span></li>'; 
  }
}

// ================= FUNCIONES INTERACTIVAS =================

// Autocompletar el precio total cuando eliges un producto para vender
function autocompletarPrecio() {
  let idSeleccionado = document.getElementById('ven-producto').value;
  let producto = stockDisponible.find(p => p.id == idSeleccionado);
  if (producto) {
    let cant = document.getElementById('ven-cantidad').value || 1;
    document.getElementById('ven-total').value = producto.precio * cant;
  }
}

// Ocultar o mostrar los campos de cuotas en Servicios/Deudas
function toggleSuscripcion() {
  let cat = document.getElementById('deu-categoria').value;
  let divCuotas = document.getElementById('div-deuda-cuotas');
  
  if (cat === 'Préstamo' || cat === 'Tarjeta de Crédito') {
    divCuotas.style.display = 'flex';
  } else {
    divCuotas.style.display = 'none';
    document.getElementById('deu-monto-total').value = '';
    document.getElementById('deu-cuota-actual').value = '';
    document.getElementById('deu-cuota-total').value = '';
  }
}

// Abrir y cerrar ventanas (Modales)
function abrirModal(id) { document.getElementById(id).classList.add('mostrar'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('mostrar'); }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.classList.remove('mostrar'); }


// ================= FUNCIONES DE ENVÍO AL EXCEL =================

function enviarVenta(e) { 
  e.preventDefault(); 
  let idProd = document.getElementById('ven-producto').value; 
  let prodNombre = document.getElementById('ven-producto').options[document.getElementById('ven-producto').selectedIndex].text.split(" - ")[0]; 
  procesarEnvio({
    accion: 'venta', 
    idProducto: idProd, 
    producto: prodNombre, 
    cantidad: document.getElementById('ven-cantidad').value, 
    total: document.getElementById('ven-total').value, 
    metodo: document.getElementById('ven-metodo').value
  }, 'modal-venta', 'form-venta', 'btn-ven'); 
}

function enviarCaja(e) { 
  e.preventDefault(); 
  procesarEnvio({
    accion: 'caja', 
    tipo: document.getElementById('caja-tipo').value, 
    concepto: document.getElementById('caja-concepto').value, 
    categoria: "Gasto Rápido", 
    monto: document.getElementById('caja-monto').value, 
    metodo: document.getElementById('caja-metodo').value
  }, 'modal-caja', 'form-caja', 'btn-caja'); 
}

function enviarTaller(e) { 
  e.preventDefault(); 
  procesarEnvio({
    accion: 'taller', 
    cliente: document.getElementById('tal-cliente').value, 
    equipo: document.getElementById('tal-equipo').value, 
    falla: document.getElementById('tal-falla').value, 
    presupuesto: document.getElementById('tal-presupuesto').value
  }, 'modal-taller', 'form-taller', 'btn-tal'); 
}

function enviarInventario(e) { 
  e.preventDefault(); 
  procesarEnvio({
    accion: 'inventario', 
    tipo: document.getElementById('inv-tipo').value, 
    descripcion: document.getElementById('inv-desc').value, 
    costo: document.getElementById('inv-costo').value, 
    precio: document.getElementById('inv-precio').value, 
    stock: document.getElementById('inv-stock').value, 
    minimo: document.getElementById('inv-min').value
  }, 'modal-inventario', 'form-inventario', 'btn-inv'); 
}

function enviarDeuda(e) { 
  e.preventDefault(); 
  let categoria = document.getElementById('deu-categoria').value;
  let nombre = document.getElementById('deu-acreedor').value;
  
  procesarEnvio({
    accion: 'deuda', 
    acreedor: categoria + " - " + nombre, 
    montoTotal: document.getElementById('deu-monto-total').value || "", 
    montoCuota: document.getElementById('deu-monto-cuota').value, 
    cuotaActual: document.getElementById('deu-cuota-actual').value || "", 
    cuotasTotales: document.getElementById('deu-cuota-total').value || "", 
    diaVenc: document.getElementById('deu-dia').value
  }, 'modal-deuda', 'form-deuda', 'btn-deu'); 
}

// Función maestra de comunicación con Google Sheets
function procesarEnvio(datos, idModal, idForm, idBtn) {
  let btn = document.getElementById(idBtn); 
  let textoOrig = btn.innerText; 
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; 
  btn.disabled = true;

  fetch(URL_APPS_SCRIPT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
  .then(r => r.json())
  .then(res => {
    if (res.exito) {
      cerrarModal(idModal); 
      document.getElementById(idForm).reset();
      
      // Mostrar pantalla de carga y actualizar los números
      document.getElementById('main-content').style.display = 'none'; 
      document.getElementById('loader').style.display = 'block';
      obtenerDatosAPI(); 
    } else {
      alert("Error interno: " + res.error);
    }
  })
  .catch(e => alert("Error de red. Asegúrate de tener conexión a internet."))
  .finally(() => { 
    btn.innerText = textoOrig; 
    btn.disabled = false; 
  });
}
