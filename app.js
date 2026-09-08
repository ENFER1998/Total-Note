const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziOBMxs0Xy1tO4gc18j5ZchSU-e8cN3IEEL0U3kw1ymGl7Gf8XA-Fqwp0O2CIIljT13A/exec";

document.addEventListener("DOMContentLoaded", () => { obtenerDatosAPI(); });

function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT)
    .then(r => r.json())
    .then(datos => actualizarDashboard(datos))
    .catch(e => {
      document.getElementById('loader').innerHTML = `<p style="color:red;">Error de conexión.</p>`;
    });
}

function actualizarDashboard(datos) {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';

  document.getElementById('val-stock').innerText = datos.stockNotebooks || 0;
  document.getElementById('val-rep').innerText = datos.reparacionesPendientes || 0;
  
  let moneda = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });
  document.getElementById('val-deuda').innerText = moneda.format(datos.deudaTotal || 0);

  // Cargar Alertas
  let lista = document.getElementById('lista-alertas');
  lista.innerHTML = '';
  if (datos.alertas && datos.alertas.length > 0) {
    datos.alertas.forEach(alerta => {
      let estado = alerta.dias < 0 ? "¡VENCIDO!" : (alerta.dias === 0 ? "Vence HOY" : `Vence en ${alerta.dias} días`);
      let clase = alerta.dias <= 0 ? "alerta-urgente" : "";
      lista.innerHTML += `
        <li>
          <span><strong>${alerta.concepto}</strong> <br> ${moneda.format(alerta.monto)}</span>
          <span class="${clase}">${estado}</span>
        </li>`;
    });
  } else {
    lista.innerHTML = '<li><span style="color: green;">Todo al día. No hay vencimientos cercanos.</span></li>';
  }
}

// ================= MODALES =================
function abrirModal(id) { 
  document.getElementById(id).classList.add('mostrar'); // Usa Flex para centrar
}
function cerrarModal(id) { 
  document.getElementById(id).classList.remove('mostrar'); 
}

// Cierra modal si tocas el fondo oscuro
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) { event.target.classList.remove('mostrar'); }
}

// Mostrar ocultar cuotas en Finanzas
function toggleCuotas() {
  let cat = document.getElementById('fin-categoria').value;
  let divCuotas = document.getElementById('div-cuotas');
  if (cat === 'Préstamo' || cat === 'Tarjeta de Crédito') {
    divCuotas.style.display = 'flex';
  } else {
    divCuotas.style.display = 'none';
    document.getElementById('fin-cuota-actual').value = '';
    document.getElementById('fin-cuota-total').value = '';
  }
}

// ================= ENVIOS DE FORMULARIO =================

function enviarInventario(e) {
  e.preventDefault();
  let datos = {
    accion: 'inventario',
    tipo: document.getElementById('inv-tipo').value,
    detalle: document.getElementById('inv-detalle').value,
    costo: document.getElementById('inv-costo').value,
    precio: document.getElementById('inv-precio').value,
    stock: document.getElementById('inv-stock').value
  };
  mandarDatos(datos, 'modal-inventario', 'form-inventario', 'btn-inv');
}

function enviarReparacion(e) {
  e.preventDefault();
  let datos = {
    accion: 'reparacion',
    cliente: document.getElementById('rep-cliente').value,
    contacto: document.getElementById('rep-contacto').value,
    equipo: document.getElementById('rep-equipo').value,
    falla: document.getElementById('rep-falla').value,
    presupuesto: document.getElementById('rep-presupuesto').value
  };
  mandarDatos(datos, 'modal-reparacion', 'form-reparacion', 'btn-rep');
}

function enviarFinanza(e) {
  e.preventDefault();
  let datos = {
    accion: 'finanza',
    concepto: document.getElementById('fin-concepto').value,
    categoria: document.getElementById('fin-categoria').value,
    monto: document.getElementById('fin-monto').value,
    cuotaActual: document.getElementById('fin-cuota-actual').value || '',
    cuotaTotal: document.getElementById('fin-cuota-total').value || '',
    fecha: document.getElementById('fin-fecha').value
  };
  mandarDatos(datos, 'modal-finanza', 'form-finanza', 'btn-fin');
}

function mandarDatos(datos, idModal, idForm, idBtn) {
  let btn = document.getElementById(idBtn);
  let textoOrig = btn.innerText;
  btn.innerText = "Guardando..."; btn.disabled = true;

  fetch(URL_APPS_SCRIPT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
    body: JSON.stringify(datos)
  })
  .then(r => r.json())
  .then(res => {
    if (res.exito) {
      cerrarModal(idModal);
      document.getElementById(idForm).reset();
      document.getElementById('main-content').style.display = 'none';
      document.getElementById('loader').style.display = 'block';
      obtenerDatosAPI(); // Refrescar pantalla
    } else { alert("Error: " + res.error); }
  })
  .catch(e => alert("Error de conexión"))
  .finally(() => { btn.innerText = textoOrig; btn.disabled = false; });
}
