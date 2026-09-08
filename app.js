// Tu URL de Google Apps Script
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziOBMxs0Xy1tO4gc18j5ZchSU-e8cN3IEEL0U3kw1ymGl7Gf8XA-Fqwp0O2CIIljT13A/exec";

// ================= INICIALIZACIÓN Y CARGA DE DATOS =================
document.addEventListener("DOMContentLoaded", () => {
  obtenerDatosAPI();
});

function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT)
    .then(respuesta => respuesta.json())
    .then(datos => actualizarDashboard(datos))
    .catch(error => mostrarError(error));
}

function actualizarDashboard(datos) {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('dashboard').style.display = 'grid';
  document.getElementById('acciones-menu').style.display = 'flex';

  document.getElementById('val-stock').innerText = datos.stockNotebooks || 0;
  document.getElementById('val-rep').innerText = datos.reparacionesPendientes || 0;
  
  let deudaFormateada = new Intl.NumberFormat('es-PY', { 
    style: 'currency', currency: 'PYG' 
  }).format(datos.deudaTotal || 0);
  
  document.getElementById('val-deuda').innerText = deudaFormateada;
}

function mostrarError(error) {
  document.getElementById('loader').innerHTML = `
    <p style="color:red; font-weight:bold;">
      <i class="fas fa-exclamation-triangle"></i> 
      Error de conexión. Verifica la URL de Apps Script.
    </p>`;
  console.error("Detalles del error:", error);
}


// ================= LÓGICA DE FORMULARIOS EMERGENTES =================

// Abrir y cerrar ventanas
function abrirModal(id) { document.getElementById(id).style.display = "block"; }
function cerrarModal(id) { document.getElementById(id).style.display = "none"; }

// Cerrar si se hace clic fuera del modal
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = "none";
  }
}

// Guardar Reparación
function enviarReparacion(e) {
  e.preventDefault();
  let btn = document.getElementById('btn-rep');
  btn.innerText = "Guardando..."; btn.disabled = true;
  
  let datos = {
    accion: 'reparacion',
    cliente: document.getElementById('rep-cliente').value,
    contacto: document.getElementById('rep-contacto').value,
    equipo: document.getElementById('rep-equipo').value,
    falla: document.getElementById('rep-falla').value,
    presupuesto: document.getElementById('rep-presupuesto').value
  };

  mandarDatos(datos, 'modal-reparacion', 'form-reparacion', btn, 'Guardar Ingreso');
}

// Guardar Gasto/Préstamo
function enviarGasto(e) {
  e.preventDefault();
  let btn = document.getElementById('btn-gas');
  btn.innerText = "Guardando..."; btn.disabled = true;
  
  let datos = {
    accion: 'gasto',
    concepto: document.getElementById('gas-concepto').value,
    tipo: document.getElementById('gas-tipo').value,
    monto: document.getElementById('gas-monto').value,
    fecha: document.getElementById('gas-fecha').value
  };

  mandarDatos(datos, 'modal-gasto', 'form-gasto', btn, 'Guardar Registro');
}

// Función que manda la info a Apps Script
function mandarDatos(datos, idModal, idForm, botonElemento, textoOriginalBtn) {
  fetch(URL_APPS_SCRIPT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
    body: JSON.stringify(datos)
  })
  .then(respuesta => respuesta.json())
  .then(resultado => {
    if (resultado.exito) {
      alert("¡Guardado correctamente en Excel!");
      cerrarModal(idModal);
      document.getElementById(idForm).reset(); // Limpiar inputs
      
      // Mostrar el loader y recargar los números actualizados
      document.getElementById('dashboard').style.display = 'none';
      document.getElementById('acciones-menu').style.display = 'none';
      document.getElementById('loader').style.display = 'block';
      obtenerDatosAPI(); 
      
    } else {
      alert("Error al guardar: " + resultado.error);
    }
  })
  .catch(error => {
    alert("Hubo un problema de conexión al guardar.");
    console.error(error);
  })
  .finally(() => {
    botonElemento.innerText = textoOriginalBtn;
    botonElemento.disabled = false;
  });
}
