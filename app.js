// La URL de ejecución de tu Google Apps Script
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziOBMxs0Xy1tO4gc18j5ZchSU-e8cN3IEEL0U3kw1ymGl7Gf8XA-Fqwp0O2CIIljT13A/exec";

// Se ejecuta automáticamente al abrir la página
document.addEventListener("DOMContentLoaded", () => {
  obtenerDatosAPI();
});

// Función para hacer la llamada (Fetch) a tu hoja de cálculo
function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT)
    .then(respuesta => respuesta.json())
    .then(datos => actualizarDashboard(datos))
    .catch(error => mostrarError(error));
}

// Función que recibe los datos y pinta los números en el HTML
function actualizarDashboard(datos) {
  // Ocultar la animación de carga
  document.getElementById('loader').style.display = 'none';
  
  // Mostrar el panel de tarjetas y los botones
  document.getElementById('dashboard').style.display = 'grid';
  document.getElementById('acciones-menu').style.display = 'flex';

  // Inyectar los datos en cada tarjeta
  document.getElementById('val-stock').innerText = datos.stockNotebooks;
  document.getElementById('val-rep').innerText = datos.reparacionesPendientes;
  
  // Formatear el monto con el formato de moneda de Paraguay (Gs.)
  let deudaFormateada = new Intl.NumberFormat('es-PY', { 
    style: 'currency', 
    currency: 'PYG' 
  }).format(datos.deudaTotal);
  
  document.getElementById('val-deuda').innerText = deudaFormateada;
}

// Función por si la conexión falla o los permisos de Google fallan
function mostrarError(error) {
  document.getElementById('loader').innerHTML = `
    <p style="color:red; font-weight:bold;">
      <i class="fas fa-exclamation-triangle"></i> 
      Error de conexión. Verifica la URL o los permisos del Script de Google.
    </p>`;
  console.error("Detalles del error:", error);
}
