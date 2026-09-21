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
function cambiarVista(vistaId) { document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa')); document.getElementById(vistaId).classList.add('activa'); cerrarMenu(); }
function abrirModal(id) { document.getElementById(id).classList.add('mostrar'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('mostrar'); }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.classList.remove('mostrar'); }
function limpiarTexto(txt) { return String(txt).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

function mostrarToast(mensaje) {
  let toast = document.getElementById('toast-notificacion');
  toast.innerText = mensaje; toast.classList.add('mostrar');
  setTimeout(() => toast.classList.remove('mostrar'), 3000);
}

function toggleAlertas() {
  document.getElementById('contenedor-alertas').classList.toggle('abierto');
  let icono = document.getElementById('icono-alertas');
  icono.style.transform = icono.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
}

function obtenerDatosAPI() {
  fetch(URL_APPS_SCRIPT).then(r => r.json()).then(datos => {
    localStorage.setItem("totalNote_datos", JSON.stringify(datos)); actualizarUI(datos);
  }).catch(e => console.log("Cargando desde caché"));
}

function obtenerDatosSilencioso() {
  fetch(URL_APPS_SCRIPT).then(r => r.json()).then(datos => {
    let cacheActual = localStorage.getItem("totalNote_datos");
    if(JSON.stringify(datos) !== cacheActual) { localStorage.setItem("totalNote_datos", JSON.stringify(datos)); actualizarUI(datos); }
  }).catch(e => console.log("Sincronización pausada"));
}

function actualizarUI(datos) {
  try {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    if (datos.error) {
        console.error("Error del backend:", datos.error);
        // Si el backend tira error, usamos el caché local para que no desaparezca la info
        let cache = localStorage.getItem("totalNote_datos");
        if (cache) datos = JSON.parse(cache);
    }

    let moneda = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });

    let pagosLocales = JSON.parse(localStorage.getItem("pagos_locales") || "{}");
    let fechaHoy = new Date();
    let diaAct = fechaHoy.getDate().toString().padStart(2, '0');
    let mesAct = (fechaHoy.getMonth() + 1).toString().padStart(2, '0');
    let anioAct = fechaHoy.getFullYear();
    let fechaFijaHoy = `${diaAct}/${mesAct}/${anioAct}`; // Ej: 21/09/2026
    let sufijoMesActual = `/${mesAct}/${anioAct}`; // Ej: /09/2026
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    let nombreMesActual = nombresMeses[fechaHoy.getMonth()];

    // ========================================================
    // 0. AUTO-REPARADOR DE FECHAS (Hace que la App sea invencible)
    // ========================================================
    if (datos.listaCaja && datos.listaCaja.length > 0) {
      datos.listaCaja.forEach(mov => {
        let raw = String(mov.fecha || "").trim();
        if (!raw || raw === "Sin fecha" || raw === "") {
          mov.fecha = fechaFijaHoy; // Repara al instante
        } else {
          // Limpia formatos sucios como "8/9/2026, 7:01 p. m." a "08/09/2026"
          let s = raw.split(",")[0].split(" ")[0];
          let p = s.includes("/") ? s.split("/") : s.split("-");
          if (p.length >= 3) {
            let d = p[0].padStart(2, '0');
            let m = p[1].padStart(2, '0');
            let a = p[2].substring(0,4);
            mov.fecha = `${d}/${m}/${a}`;
          } else {
            mov.fecha = fechaFijaHoy;
          }
        }
        if (!mov.metodo) mov.metodo = "Efectivo";
      });
    }

    // ========================================================
    // CÁLCULOS REALES (Sobrescriben errores de Google Sheets)
    // ========================================================
    let listaEgresosMes = (datos.listaCaja || []).filter(m => m.tipo === "Egreso" && m.fecha.includes(sufijoMesActual));
    let ingresosRealesMes = (datos.listaCaja || []).filter(m => m.tipo === "Ingreso" && m.fecha.includes(sufijoMesActual)).reduce((acc, m) => acc + (parseFloat(m.monto)||0), 0);
    let egresosRealesMes = listaEgresosMes.reduce((acc, m) => acc + (parseFloat(m.monto)||0), 0);
    let neto = ingresosRealesMes - egresosRealesMes;

    // 1. Dashboard - Tarjetas de Resumen
    document.getElementById('val-ingresos').innerText = moneda.format(ingresosRealesMes);
    document.getElementById('val-egresos').innerText = moneda.format(egresosRealesMes);
    let elNeto = document.getElementById('val-neto');
    elNeto.innerText = moneda.format(neto);
    elNeto.style.color = neto < 0 ? "#ef4444" : "#10b981";
    document.getElementById('val-saldo').innerText = moneda.format(datos.saldoCaja || 0);
    document.getElementById('val-capital').innerText = moneda.format(datos.capitalInventario || 0);
    document.getElementById('val-taller').innerText = moneda.format(datos.proyeccionTaller || 0);

    // ========================================================
    // DASHBOARD - GASTOS DEL MES (TOTAL DESPLEGABLE)
    // ========================================================
    let contGastos = document.getElementById('grafico-gastos');
    if (contGastos) {
      let cardGastos = contGastos.parentElement;
      let h3Original = cardGastos.querySelector('h3');
      if (h3Original) h3Original.style.display = 'none';
      cardGastos.style.padding = '0'; contGastos.style.marginTop = '0';

      let htmlGastos = `
        <details style="width: 100%;">
          <summary style="list-style: none; cursor: pointer; padding: 15px; display: flex; justify-content: space-between; align-items: center; outline: none; background: white;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-chart-pie" style="color: var(--primary); font-size: 1.2rem;"></i>
              <h3 style="margin: 0; color: var(--primary); font-size: 1.1rem;">Gastos de ${nombreMesActual}</h3>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <strong style="color: var(--danger); font-size: 1.15rem;">${moneda.format(egresosRealesMes)}</strong>
              <i class="fas fa-chevron-down" style="color: #94a3b8;"></i>
            </div>
          </summary>
          <div style="padding: 15px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
      `;

      if (listaEgresosMes.length > 0) {
        let gastosAgrup = listaEgresosMes.reduce((acc, mov) => {
          let cat = mov.categoria || "Otros"; let conc = mov.concepto || "Varios";
          if (!acc[cat]) { acc[cat] = { total: 0, conceptos: {} }; }
          acc[cat].total += parseFloat(mov.monto) || 0;
          if (!acc[cat].conceptos[conc]) { acc[cat].conceptos[conc] = 0; }
          acc[cat].conceptos[conc] += parseFloat(mov.monto) || 0;
          return acc;
        }, {});

        let arrayGastos = Object.keys(gastosAgrup).map(cat => ({
          categoria: cat, total: gastosAgrup[cat].total,
          conceptos: Object.keys(gastosAgrup[cat].conceptos).map(c => ({ nombre: c, monto: gastosAgrup[cat].conceptos[c] })).sort((a, b) => b.monto - a.monto)
        })).sort((a, b) => b.total - a.total);

        let max = arrayGastos.length > 0 ? arrayGastos[0].total : 1;

        arrayGastos.forEach(g => {
          let pct = (g.total / max) * 100;
          htmlGastos += `
          <details style="margin-bottom:12px; background:white; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
            <summary style="list-style:none; cursor:pointer; padding:12px;">
              <div style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:bold; color:var(--primary);">
                <span><i class="fas fa-chevron-down" style="color:#94a3b8; margin-right:6px; font-size:0.8rem;"></i> ${g.categoria}</span>
                <span style="color:var(--danger);">${moneda.format(g.total)}</span>
              </div>
              <div style="background:#e2e8f0; border-radius:5px; height:6px; width:100%; margin-top:8px;">
                <div style="background:var(--danger); height:100%; border-radius:5px; width:${pct}%;"></div>
              </div>
            </summary>
            <div style="padding: 10px 15px; border-top: 1px solid #f1f5f9; background:#ffffff;">
              <ul style="list-style:none; padding:0; margin:0; font-size:0.8rem;">
                ${g.conceptos.map(c => `
                  <li style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #cbd5e1;">
                    <span style="color:#64748b;"><i class="fas fa-angle-right" style="margin-right:4px; font-size:0.7rem; color:#cbd5e1;"></i> ${c.nombre}</span>
                    <span style="color:#475569; font-weight:bold;">${moneda.format(c.monto)}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </details>`;
        });
      } else { htmlGastos += '<p style="font-size:0.9rem; color:#64748b; padding:5px; margin:0;">No hay gastos registrados este mes.</p>'; }
      htmlGastos += `</div></details>`;
      contGastos.innerHTML = htmlGastos;
    }

    // ========================================================
    // INVENTARIO Y VENTAS
    // ========================================================
    stockDisponible = datos.productosStock || [];
    let selectVenta = document.getElementById('ven-producto');
    if(selectVenta) {
      selectVenta.innerHTML = '<option value="">Selecciona qué vas a vender...</option>';
      stockDisponible.forEach(prod => { selectVenta.innerHTML += `<option value="${prod.id}">${prod.nombre} - ${moneda.format(prod.precio)}</option>`; });
    }

    let ulStock = document.getElementById('ul-stock');
    if(ulStock) {
      ulStock.innerHTML = ''; let htmlStock = "";
      if (datos.listaInventario && datos.listaInventario.length > 0) {
        datos.listaInventario.forEach(item => {
          htmlStock += `<li>
            <div class="lista-texto"><strong>${item.desc}</strong><br>Costo: ${moneda.format(item.costo)} | Venta: ${moneda.format(item.precio)}</div>
            <div style="display:flex; gap:5px; align-items:center;"><span class="badge-stock">${item.stock}</span><button class="btn-edit" onclick="abrirEditInv('${item.id}', '${item.tipo}', '${limpiarTexto(item.desc)}', ${item.costo}, ${item.precio}, ${item.stock}, ${item.minimo})"><i class="fas fa-pen"></i></button></div>
          </li>`;
        });
      } else { htmlStock += "<li style='justify-content:center; color:#64748b;'>Inventario vacío.</li>"; }

      let ventasList = (datos.listaCaja || []).filter(mov => mov.categoria === "Ventas" && mov.tipo === "Ingreso");
      let totalVentas = ventasList.reduce((acc, v) => acc + (parseFloat(v.monto) || 0), 0);

      htmlStock += `
        <li style="background: transparent; border: none; padding: 0; margin-top: 25px; box-shadow: none;">
          <details style="width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <summary style="padding: 15px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; outline: none;">
              <span style="color: var(--primary); font-size: 1.05rem;"><i class="fas fa-shopping-cart"></i> Historial de Ventas</span>
              <span style="color: var(--success); font-size: 1.1rem;">${moneda.format(totalVentas)}</span>
            </summary>
            <div style="padding: 15px; border-top: 1px solid #e2e8f0;">
              <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem;">
      `;

      if (ventasList.length > 0) {
        ventasList.forEach(v => {
          htmlStock += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #cbd5e1;">
              <span style="color: #475569; line-height: 1.4;">
                <strong style="color:var(--primary);">${v.concepto}</strong><br>
                <small style="color: #94a3b8;"><i class="far fa-calendar-alt"></i> ${v.fecha} - ${v.metodo}</small>
              </span>
              <span style="color: var(--success); font-weight: bold; font-size: 1rem;">+ ${moneda.format(v.monto)}</span>
            </li>
          `;
        });
      } else { htmlStock += `<p style="color: #64748b; margin:0; text-align:center;">No hay ventas registradas aún.</p>`; }
      htmlStock += `</ul></div></details></li>`;
      ulStock.innerHTML = htmlStock;
    }

    // Taller
    let ulTaller = document.getElementById('ul-taller');
    if(ulTaller) {
      ulTaller.innerHTML = '';
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
    }

    // 5. Vista DEUDAS
    let ulDeudas = document.getElementById('ul-deudas');
    if(ulDeudas) {
      ulDeudas.innerHTML = '';
      if (datos.listaDeudas && datos.listaDeudas.length > 0) {
        let mesActualStrDeuda = `${anioAct}-${mesAct}`;
        datos.listaDeudas.forEach(item => {
          let pagadoLocal = pagosLocales[item.acreedor + "_" + mesActualStrDeuda];
          let estaPagado = item.pagadoEsteMes || pagadoLocal;
          let colorVenc = item.venceEn <= 5 ? "color:var(--danger);" : "color:var(--primary);";
          let textoVenc = item.venceEn < 0 ? "¡Vencido!" : (item.venceEn === 0 ? "Vence HOY" : `En ${item.venceEn} d.`);

          let botonAccion = estaPagado
            ? `<button style="background:var(--success); color:white; border:none; padding:8px 10px; border-radius:8px; font-weight:bold; font-size:0.85rem;" disabled><i class="fas fa-check"></i> Al día</button>`
            : `<button class="btn-action-pay" onclick="abrirPagoDeuda(${item.fila}, '${limpiarTexto(item.acreedor)}', ${item.monto})">Pagar</button>`;

          let detalleEstado = estaPagado
            ? '<span style="color:var(--success); font-weight:bold;"><i class="fas fa-check-circle"></i> Pagado este mes</span>'
            : `<span>${item.cuotaInfo} - ${textoVenc}</span>`;

          ulDeudas.innerHTML += `<li>
            <div class="lista-texto">
              <strong style="${estaPagado ? 'color:var(--primary);' : colorVenc}">${item.acreedor}</strong><br>
              ${detalleEstado}<br>
              <strong>${moneda.format(item.monto)}</strong>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px;">
              ${botonAccion}
              <button class="btn-edit" onclick="abrirEditDeuda(${item.fila}, '${limpiarTexto(item.acreedor)}', '${item.montoTotal}', '${item.montoCuota}', '${item.cuotaActual}', '${item.cuotasTotales}', '${item.diaVenc}')"><i class="fas fa-pen"></i> Editar</button>
            </div>
          </li>`;
        });
      } else { ulDeudas.innerHTML = "<li style='justify-content:center; color:#64748b;'>No hay deudas activas.</li>"; }
    }

    // ========================================================
    // 6. Vista CAJA
    // ========================================================
    let ulCaja = document.getElementById('ul-caja');
    if(ulCaja) {
      ulCaja.innerHTML = '';
      if (datos.listaCaja && datos.listaCaja.length > 0) {
        const egresos = datos.listaCaja.filter(mov => mov.tipo === "Egreso");
        const ingresos = datos.listaCaja.filter(mov => mov.tipo === "Ingreso");

        let totalEgresos = egresos.reduce((acc, mov) => acc + (parseFloat(mov.monto) || 0), 0);
        let totalIngresos = ingresos.reduce((acc, mov) => acc + (parseFloat(mov.monto) || 0), 0);

        let htmlCaja = "";

        // DESPLEGABLE SALIDAS
        htmlCaja += `
          <details style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px;" open>
            <summary style="padding: 15px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; outline: none;">
              <span style="color: var(--danger); font-size: 1.1rem;"><i class="fas fa-arrow-down"></i> Historial de Salidas</span>
              <strong style="color: var(--danger); font-size: 1.1rem;">${moneda.format(totalEgresos)}</strong>
            </summary>
            <div style="padding: 10px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
        `;

        const gastosAgrupados = egresos.reduce((acc, mov) => {
          if (!acc[mov.categoria]) acc[mov.categoria] = { total: 0, detalles: [] };
          acc[mov.categoria].total += parseFloat(mov.monto) || 0;
          acc[mov.categoria].detalles.push(mov);
          return acc;
        }, {});

        if (Object.keys(gastosAgrupados).length > 0) {
          for (const categoria in gastosAgrupados) {
            const grupo = gastosAgrupados[categoria];
            htmlCaja += `
              <details style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px;">
                <summary style="padding: 12px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none;">
                  <span><i class="fas fa-folder-open" style="color:#94a3b8; margin-right:5px;"></i> ${categoria}</span>
                  <span style="color: var(--danger);">${moneda.format(grupo.total)}</span>
                </summary>
                <div style="padding: 10px 15px; border-top: 1px solid #e2e8f0;">
                  <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem;">
                    ${grupo.detalles.map(d => `
                      <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;">
                        <span>${d.concepto} <br><small style="color:#94a3b8;"><i class="far fa-calendar-alt"></i> ${d.fecha} -${d.metodo}</small></span>
                        <span style="font-weight:600; color:#475569;">${moneda.format(d.monto)}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </details>`;
          }
        } else { htmlCaja += `<p style="color: #64748b; font-size: 0.9rem; margin: 5px;">No hay salidas registradas.</p>`; }
        htmlCaja += `</div></details>`;

        // DESPLEGABLE ENTRADAS
        htmlCaja += `
          <details style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px;">
            <summary style="padding: 15px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; outline: none;">
              <span style="color: var(--success); font-size: 1.1rem;"><i class="fas fa-arrow-up"></i> Historial de Entradas</span>
              <strong style="color: var(--success); font-size: 1.1rem;">${moneda.format(totalIngresos)}</strong>
            </summary>
            <div style="padding: 10px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
        `;

        if (ingresos.length > 0) {
          htmlCaja += `<ul style="list-style: none; padding: 0; margin: 0;">`;
          ingresos.forEach(ing => {
            htmlCaja += `
              <li style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div style="line-height:1.4;">
                  <strong style="color:var(--primary);">${ing.concepto}</strong><br>
                  <small style="color:#64748b;"><i class="far fa-calendar-alt"></i> ${ing.fecha} - ${ing.metodo}</small>
                </div>
                <strong style="color:var(--success); font-size:1.05rem;">+ ${moneda.format(ing.monto)}</strong>
              </li>`;
          });
          htmlCaja += `</ul>`;
        } else { htmlCaja += `<p style="color: #64748b; font-size: 0.9rem; margin: 5px;">No hay entradas registradas.</p>`; }
        htmlCaja += `</div></details>`;

        ulCaja.innerHTML = htmlCaja;
      } else { ulCaja.innerHTML = "<li style='justify-content:center; color:#64748b;'>Sin movimientos.</li>"; }
    }

    // ========================================================
    // 7. ALERTAS DASHBOARD
    // ========================================================
    let listaA = document.getElementById('lista-alertas');
    if(listaA) {
      listaA.innerHTML = ''; let numAlertas = 0;
      
      if (datos.stockBajo && datos.stockBajo.length > 0) {
        datos.stockBajo.forEach(aviso => {
          listaA.innerHTML += `<li>
            <span style="color:var(--primary); font-weight:bold; flex: 1;"><i class="fas fa-box" style="color:#f59e0b;"></i> ${aviso}</span>
            <span class="texto-rojo" style="white-space: nowrap;">Comprar</span>
          </li>`;
          numAlertas++;
        });
      }

      if (datos.alertasDeuda && datos.alertasDeuda.length > 0) {
        let mesActualStrAlerta = `${anioAct}-${mesAct}`;
        datos.alertasDeuda.forEach(deuda => {
          let pagadoLocal = pagosLocales[deuda.acreedor + "_" + mesActualStrAlerta];
          let deudaEnListaPrincipal = (datos.listaDeudas || []).find(d => d.acreedor === deuda.acreedor);
          if (deuda.pagadoEsteMes || (deudaEnListaPrincipal && deudaEnListaPrincipal.pagadoEsteMes) || pagadoLocal) return;

          let estadoTxt = deuda.diasFaltantes < 0 ? "¡VENCIDO!" : (deuda.diasFaltantes === 0 ? "Vence HOY" : `En ${deuda.diasFaltantes} días`);
          listaA.innerHTML += `<li>
            <span style="color:var(--primary); line-height: 1.4; flex: 1; padding-right: 10px;">
              <strong><i class="fas fa-file-invoice-dollar" style="color:#ef4444;"></i> ${deuda.acreedor}</strong><br>
              <span style="font-size:0.85rem; color:#64748b;">${deuda.cuotaInfo}</span><br>
              <strong style="font-size:1.05rem;">${moneda.format(deuda.monto)}</strong>
            </span>
            <span class="texto-rojo" style="white-space: nowrap; font-weight: bold; text-align: right; display: flex; align-items: center;">${estadoTxt}</span>
          </li>`;
          numAlertas++;
        });
      }

      let badge = document.getElementById('badge-alertas');
      if (numAlertas === 0) {
        listaA.innerHTML = '<li style="color:#10b981; font-weight:bold; justify-content:center; border:none;"><i class="fas fa-check-circle"></i> Todo en orden.</li>';
        badge.innerHTML = '<i class="fas fa-check"></i>'; badge.style.background = 'var(--success)';
      } else {
        badge.innerText = numAlertas; badge.style.background = 'var(--danger)';
      }
    }
  } catch (errorFatal) {
    console.error("Error al actualizar la pantalla:", errorFatal);
  }
}

function autocompletarPrecio() { let id = document.getElementById('ven-producto').value; let prod = stockDisponible.find(p => p.id == id); if (prod) document.getElementById('ven-total').value = prod.precio * (document.getElementById('ven-cantidad').value || 1); }
function abrirCobro(id, cli, eq, pres) { document.getElementById('cob-id').value = id; document.getElementById('cob-info').value = cli + " - " + eq; document.getElementById('cob-monto').value = pres; abrirModal('modal-cobro'); }
function abrirPagoDeuda(fila, acreedor, monto) { document.getElementById('pag-fila').value = fila; document.getElementById('pag-acreedor').value = acreedor; document.getElementById('pag-monto').value = monto || ""; document.getElementById('pag-info').innerText = "Destino: " + acreedor; abrirModal('modal-pago-confirmar'); }
function abrirEditInv(id, tipo, desc, costo, precio, stock, min) { document.getElementById('ei-id').value = id; document.getElementById('ei-tipo').value = tipo; document.getElementById('ei-desc').value = desc; document.getElementById('ei-costo').value = costo; document.getElementById('ei-precio').value = precio; document.getElementById('ei-stock').value = stock; document.getElementById('ei-min').value = min; abrirModal('modal-edit-inv'); }
function abrirEditTaller(id, cli, eq, falla, pres) { document.getElementById('et-id').value = id; document.getElementById('et-cliente').value = cli; document.getElementById('et-equipo').value = eq; document.getElementById('et-falla').value = falla; document.getElementById('et-presupuesto').value = pres; abrirModal('modal-edit-taller'); }
function abrirEditDeuda(fila, acre, total, cuota, act, tot, dia) { document.getElementById('ed-fila').value = fila; document.getElementById('ed-acreedor').value = acre; document.getElementById('ed-total').value = total; document.getElementById('ed-monto').value = cuota; document.getElementById('ed-cuota-actual').value = act; document.getElementById('ed-cuota-total').value = tot; document.getElementById('ed-dia').value = dia; abrirModal('modal-edit-deuda'); }

function enviarVenta(e) { e.preventDefault(); let idProd = document.getElementById('ven-producto').value; let prodNombre = document.getElementById('ven-producto').options[document.getElementById('ven-producto').selectedIndex].text.split(" - ")[0]; procesarEnvio({accion: 'venta', idProducto: idProd, producto: prodNombre, cantidad: document.getElementById('ven-cantidad').value, total: document.getElementById('ven-total').value, metodo: document.getElementById('ven-metodo').value}, 'modal-venta', 'form-venta', 'btn-ven'); }
function enviarCaja(e) { e.preventDefault(); procesarEnvio({accion: 'caja', tipo: document.getElementById('caja-tipo').value, categoria: document.getElementById('caja-categoria').value, concepto: document.getElementById('caja-concepto').value, monto: document.getElementById('caja-monto').value, metodo: document.getElementById('caja-metodo').value}, 'modal-caja', 'form-caja', 'btn-caja'); }
function enviarTaller(e) { e.preventDefault(); procesarEnvio({accion: 'taller', cliente: document.getElementById('tal-cliente').value, equipo: document.getElementById('tal-equipo').value, falla: document.getElementById('tal-falla').value, presupuesto: document.getElementById('tal-presupuesto').value}, 'modal-taller', 'form-taller', 'btn-tal'); }
function enviarInventario(e) { e.preventDefault(); procesarEnvio({accion: 'inventario', tipo: document.getElementById('inv-tipo').value, descripcion: document.getElementById('inv-desc').value, costo: document.getElementById('inv-costo').value, precio: document.getElementById('inv-precio').value, stock: document.getElementById('inv-stock').value, minimo: document.getElementById('inv-min').value, registrarGasto: document.getElementById('inv-gasto').checked}, 'modal-inventario', 'form-inventario', 'btn-inv'); }
function enviarCobroTaller(e) { e.preventDefault(); procesarEnvio({accion: 'cobrar_taller', idOrden: document.getElementById('cob-id').value, concepto: document.getElementById('cob-info').value, montoCobrado: document.getElementById('cob-monto').value, metodo: document.getElementById('cob-metodo').value}, 'modal-cobro', 'form-cobro', 'btn-cob'); }
function enviarEditInv(e) { e.preventDefault(); procesarEnvio({accion: 'editar_inventario', id: document.getElementById('ei-id').value, tipo: document.getElementById('ei-tipo').value, descripcion: document.getElementById('ei-desc').value, costo: document.getElementById('ei-costo').value, precio: document.getElementById('ei-precio').value, stock: document.getElementById('ei-stock').value, minimo: document.getElementById('ei-min').value}, 'modal-edit-inv', 'form-edit-inv', 'btn-ei'); }
function enviarEditTaller(e) { e.preventDefault(); procesarEnvio({accion: 'editar_taller', id: document.getElementById('et-id').value, cliente: document.getElementById('et-cliente').value, equipo: document.getElementById('et-equipo').value, falla: document.getElementById('et-falla').value, presupuesto: document.getElementById('et-presupuesto').value}, 'modal-edit-taller', 'form-edit-taller', 'btn-et'); }
function enviarEditDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'editar_deuda', fila: document.getElementById('ed-fila').value, acreedor: document.getElementById('ed-acreedor').value, montoTotal: document.getElementById('ed-total').value || "", montoCuota: document.getElementById('ed-monto').value || "", cuotaActual: document.getElementById('ed-cuota-actual').value || "", cuotasTotales: document.getElementById('ed-cuota-total').value || "", diaVenc: document.getElementById('ed-dia').value}, 'modal-edit-deuda', 'form-edit-deuda', 'btn-ed'); }

function enviarDeuda(e) { e.preventDefault(); procesarEnvio({accion: 'deuda', categoria: document.getElementById('deu-categoria').value, acreedor: document.getElementById('deu-acreedor').value, montoTotal: document.getElementById('deu-monto-total').value, cuotaActual: document.getElementById('deu-cuota-actual').value, cuotaTotal: document.getElementById('deu-cuota-total').value, montoCuota: document.getElementById('deu-monto-cuota').value, diaVencimiento: document.getElementById('deu-dia').value}, 'modal-deuda', 'form-deuda', 'btn-deu'); }

function enviarPagoDeuda(e) { 
  e.preventDefault(); 
  let acreedor = document.getElementById('pag-acreedor').value;
  procesarEnvio(
    {accion: 'pagar_deuda', fila: document.getElementById('pag-fila').value, acreedor: acreedor, monto: document.getElementById('pag-monto').value, metodo: document.getElementById('pag-metodo').value}, 
    'modal-pago-confirmar', 'form-pago-deuda', 'btn-pagar', 
    function() {
      let pagosLocales = JSON.parse(localStorage.getItem("pagos_locales") || "{}");
      let fecha = new Date();
      let mesActual = fecha.getFullYear() + "-" + (fecha.getMonth() + 1).toString().padStart(2, '0');
      pagosLocales[acreedor + "_" + mesActual] = true;
      localStorage.setItem("pagos_locales", JSON.stringify(pagosLocales));
    }
  ); 
}

function procesarEnvio(datos, idModal, idForm, idBtn, callbackExito = null) {
  let btn = document.getElementById(idBtn); let textoOrig = btn.innerText; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
  fetch(URL_APPS_SCRIPT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
  .then(r => r.json()).then(res => {
    if (res.exito) { 
      cerrarModal(idModal); document.getElementById(idForm).reset(); mostrarToast("¡Guardado correctamente!");
      if(callbackExito) callbackExito(); obtenerDatosSilencioso();
    } else alert("Error: " + res.error);
  }).catch(e => alert("Error de red.")).finally(() => { btn.innerText = textoOrig; btn.disabled = false; });
}
