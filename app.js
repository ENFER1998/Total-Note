// TU ENLACE ACTUAL (No lo cambies a menos que hagas un Deploy nuevo con otro link)
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziOBMxs0Xy1tO4gc18j5ZchSU-e8cN3IEEL0U3kw1ymGl7Gf8XA-Fqwp0O2CIIljT13A/exec";

// Variable global para guardar los productos y sus precios
let stockDisponible = [];

document.addEventListener("DOMContentLoaded", () => { obtenerDatosAPI(); });

function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT)
    .then(r => r.json())
    .then(datos => actualizarDashboard(datos))
    .catch(e => { document.getElementById('loader').innerHTML = `<p style="color:red;">Error de conexión.</p>`; });
}

function actualizarDashboard(datos) {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';

  let moneda = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });

  // 1. Balance Mensual
  document.getElementById('val-ingresos').innerText = moneda.format(datos.ingresosMes || 0);
  document.getElementById('val-egresos').innerText = moneda.format(datos.egresosMes || 0);
  
  let neto = (datos.ingresosMes || 0) - (datos.egresosMes || 0);
  let elNeto = document.getElementById('val-neto');
  elNeto.innerText = moneda.format(neto);
  elNeto.style.color = neto < 0 ? "#ef4444" : "#10b981"; // Rojo si pierdes, verde si ganas

  // 2. Patrimonio (Inventario y Taller)
  document.getElementById('val-capital').innerText = moneda.format(datos.capitalInventario || 0);
  document.getElementById('val-taller').innerText = moneda.format(datos.proyeccionTaller || 0);

  // 3. Rellenar opciones de Venta
  stockDisponible = datos.productosStock || [];
  let selectVenta = document.getElementById('ven-producto');
  selectVenta.innerHTML = '<option value="">Selecciona qué vas a vender...</option>';
  stockDisponible.forEach(prod => {
    // prod.id, prod.nombre, prod.precio
    selectVenta.innerHTML += `<option value="${prod.id}">${prod.nombre} - ${moneda.format(prod.precio)}</option>`;
  });

  // 4. Alertas (Stock y Deudas)
  let lista = document.getElementById('lista-alertas');
  lista.innerHTML = '';
  let hayAlertas = false;

  if (datos.stockBajo && datos.stockBajo.length > 0) {
    datos.stockBajo.forEach(aviso => {
      lista.innerHTML += `<li><span><i class="fas fa-box" style="color:#f59e0b"></i> ${aviso}</span><span class="texto-rojo">Comprar</span></li>`;
      hayAlertas = true;
    });
  }
  if (datos.alertasDeuda && datos.alertasDeuda.length > 0) {
    datos.alertasDeuda.forEach(deuda => {
      lista.innerHTML += `<li><span><i class="fas fa-file-invoice-dollar" style="color:#ef4444"></i> ${deuda.acreedor} (Cuota ${deuda.cuotaInfo})</span><span class="texto-rojo">Vence en ${deuda.diasFaltantes}d</span></li>`;
      hayAlertas = true;
    });
  }

  if (!hayAlertas) {
    lista.innerHTML = '<li><span style="color: #10b981;"><i class="fas fa-check-circle"></i> Todo está en orden. No hay alertas.</span></li>';
  }
}

// Autocompletar precio de venta
function autocompletarPrecio() {
  let idSeleccionado = document.getElementById('ven-producto').value;
  let producto = stockDisponible.find(p => p.id == idSeleccionado);
  if (producto) {
    let cant = document.getElementById('ven-cantidad').value || 1;
    document.getElementById('ven-total').value = producto.precio * cant;
  }
}

// Mostrar Modales
function abrirModal(id) { document.getElementById(id).classList.add('mostrar'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('mostrar'); }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.classList.remove('mostrar'); }

// ================= ENVIAR DATOS A GOOGLE SHEETS =================

function enviarVenta(e) {
  e.preventDefault();
  let idProd = document.getElementById('ven-producto').value;
  let prodNombre = document.getElementById('ven-producto').options[document.getElementById('ven-producto').selectedIndex].text.split(" - ")[0];
  let datos = {
    accion: 'venta',
    idProducto: idProd,
    producto: prodNombre,
    cantidad: document.getElementById('ven-cantidad').value,
    total: document.getElementById('ven-total').value,
    metodo: document.getElementById('ven-metodo').value
  };
  procesarEnvio(datos, 'modal-venta', 'form-venta', 'btn-ven');
}

function enviarCaja(e) {
  e.preventDefault();
  let datos = {
    accion: 'caja',
    tipo: document.getElementById('caja-tipo').value,
    concepto: document.getElementById('caja-concepto').value,
    categoria: document.getElementById('caja-categoria').value,
    monto: document.getElementById('caja-monto').value,
    metodo: document.getElementById('caja-metodo').value
  };
  procesarEnvio(datos, 'modal-caja', 'form-caja', 'btn-caja');
}

function enviarTaller(e) {
  e.preventDefault();
  let datos = {
    accion: 'taller',
    cliente: document.getElementById('tal-cliente').value,
    equipo: document.getElementById('tal-equipo').value,
    falla: document.getElementById('tal-falla').value
  };
  procesarEnvio(datos, 'modal-taller', 'form-taller', 'btn-tal');
}

function enviarInventario(e) {
  e.preventDefault();
  let datos = {
    accion: 'inventario',
    tipo: document.getElementById('inv-tipo').value,
    descripcion: document.getElementById('inv-desc').value,
    costo: document.getElementById('inv-costo').value,
    precio: document.getElementById('inv-precio').value,
    stock: document.getElementById('inv-stock').value,
    minimo: document.getElementById('inv-min').value,
    registrarGasto: document.getElementById('inv-gasto').checked
  };
  procesarEnvio(datos, 'modal-inventario', 'form-inventario', 'btn-inv');
}

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
      document.getElementById('main-content').style.display = 'none'; 
      document.getElementById('loader').style.display = 'block';
      obtenerDatosAPI(); // Refrescar tablero con los nuevos números
    } else alert("Error del servidor: " + res.error);
  })
  .catch(e => alert("Error de red. Revisa tu conexión."))
  .finally(() => { btn.innerText = textoOrig; btn.disabled = false; });
}
