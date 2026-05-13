/**
 * ARCHIVO: script.js
 * Descripción: Maneja la lógica de búsqueda de VIN y Matrículas, simulador de carga, 
 * renderización de reportes y comunicación con WhatsApp.
 */

// 1. VARIABLES DE ESTADO Y CARGA DE DATOS
let listaVehiculos = []; // Empezamos con el array vacío
let currentVIN = "";
let datosEncontrados = null;
const telefonoSoporte = "584226395595";

// Función para cargar los datos desde el JSON externo
async function cargarBaseDeDatos() {
    try {
        const respuesta = await fetch('datos.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar el archivo JSON");
        listaVehiculos = await respuesta.ok ? await respuesta.json() : [];
        console.log("Base de datos cargada correctamente");
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    await cargarBaseDeDatos(); // Carga tu datos.json primero

    // Evento para el botón de búsqueda de matrícula
    const btnSearchPlate = document.getElementById('btn-search-plate');
    if (btnSearchPlate) {
        btnSearchPlate.addEventListener('click', procesarBusquedaPlaca);
    }

    // También para que funcione al presionar "Enter"
    const plateInput = document.getElementById('plate-input');
    if (plateInput) {
        plateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') procesarBusquedaPlaca();
        });
    }
});

// El resto de tus funciones (procesarBusquedaVIN, procesarBusquedaPlaca, ejecutarFlujoReporte, etc.)
// SE MANTIENEN EXACTAMENTE IGUAL, ya que siguen usando la variable global 'listaVehiculos'.


// 2. INICIALIZACIÓN Y EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    // Eventos para VIN
    const btnSearch = document.getElementById('btn-search');
    const vinInput = document.getElementById('vin-input');
    if(btnSearch) btnSearch.addEventListener('click', procesarBusquedaVIN);
    if(vinInput) vinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') procesarBusquedaVIN();
    });

    // --- NUEVO: Eventos para Matrícula (Plate) ---
    const btnSearchPlate = document.getElementById('btn-search-plate');
    const plateInput = document.getElementById('plate-input');
    
    if(btnSearchPlate) btnSearchPlate.addEventListener('click', procesarBusquedaPlaca);
    if(plateInput) plateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') procesarBusquedaPlaca();
    });

    configurarWhatsApp();
});

// 3. LÓGICA DE BÚSQUEDA VIN
function procesarBusquedaVIN() {
    const vinValue = document.getElementById('vin-input').value.trim().toUpperCase();

    if (vinValue.length < 5) {
        alert("Por favor, ingrese un VIN válido.");
        return;
    }

    currentVIN = vinValue;
    datosEncontrados = listaVehiculos.find(v => v.vin === vinValue);

    if (datosEncontrados) {
        ejecutarFlujoReporte(vinValue);
    } else {
        mostrarErrorBusqueda(vinValue, "VIN");
    }
}

function procesarBusquedaPlaca() {
    const plateInput = document.getElementById('plate-input');
    const stateSelect = document.getElementById('state-select');

    const plateValue = plateInput.value.trim().toUpperCase();
    const stateValue = stateSelect.value; // El valor del estado seleccionado (ej: "TX")

    // Buscamos el vehículo que coincida con la PLACA Y TAMBIÉN con el ESTADO
    datosEncontrados = listaVehiculos.find(v => 
        v.plate.toUpperCase() === plateValue && v.state === stateValue
    );

    if (datosEncontrados) {
        // Si coinciden AMBOS, mostramos el reporte
        currentVIN = datosEncontrados.vin;
        ejecutarFlujoReporte(datosEncontrados.vin);
    } else {
        // Si la placa existe pero el estado es diferente (o no existe ninguno), da error
        alert(`Error: No existe un registro para la placa ${plateValue} en el estado de ${stateValue}.`);
    }
}


// 4. ORQUESTADOR DE FLUJO VISUAL (Se mantiene igual, funciona para ambos)
async function ejecutarFlujoReporte(identificador) {
    const heroSection = document.querySelector('.hero');
    const sectionsToHide = [
        document.getElementById('info-section'),
        document.getElementById('about-plates'),
        document.getElementById('trust-section'),
        document.getElementById('achievements-section'),
        document.getElementById('support-stats'),
        document.getElementById('resources-section'),
        document.getElementById('partners-section')
    ];
    const reportContainer = document.getElementById('report-container');

    toggleLoader(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (heroSection) heroSection.style.display = 'none';
    sectionsToHide.forEach(section => {
        if (section) section.style.display = 'none';
    });
    
    renderizarDatosEnPantalla(identificador);

    toggleLoader(false);
    reportContainer.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 5. RENDERIZACIÓN DINÁMICA
function renderizarDatosEnPantalla(id) {
    const v = datosEncontrados;

    // 1. Título y VIN principal
    document.getElementById('car-name').innerText = `${v.vehiculo.anio} ${v.vehiculo.marca} ${v.vehiculo.modelo}`;
    document.getElementById('vin-number').innerText = v.vin;

    // 2. DATOS DEL COMPRADOR (Lo que se había perdido)
    // Asegúrate de que estos IDs existan en tu index.html
    if (v.comprador) {
        document.getElementById('buyer-name').innerText = v.comprador.nombre;
        document.getElementById('buyer-address').innerText = v.comprador.direccion;
        document.getElementById('buyer-email').innerText = v.comprador.correo;
        document.getElementById('expiry-date').innerText = v.comprador.vencimiento;
        document.getElementById('purchase-date').innerText = v.comprador.compra;
    }

    // 3. HISTORIAL (Checkmarks verdes)
    const listaHistorial = document.getElementById('history-list');
    listaHistorial.innerHTML = ""; 
    v.historial.forEach(item => {
        const li = document.createElement('li');
        li.innerText = item;
        listaHistorial.appendChild(li);
    });

    // 4. ESPECIFICACIONES TÉCNICAS + PÓLIZA DINÁMICA
    const tablaSpecs = document.getElementById('specs-table');
    tablaSpecs.innerHTML = ""; 

    // Primero las especificaciones base del JSON (Marca, Modelo, Color, etc.)
    for (const [propiedad, valor] of Object.entries(v.especificaciones)) {
        const fila = `<tr><td class="label"><strong>${propiedad}</strong></td><td>${valor}</td></tr>`;
        tablaSpecs.innerHTML += fila;
    }

    // Luego el Año (si no está en las especificaciones)
    tablaSpecs.innerHTML += `<tr><td class="label"><strong>Año</strong></td><td>${v.vehiculo.anio}</td></tr>`;

    // Por último, la PÓLIZA DE SEGURO (Solo si existe en el JSON)
    if (v.seguro) {
        const filaSeguro = `
            <tr>
                <td class="label"><strong>Póliza de Seguro</strong></td>
                <td style="color: #004a99; font-weight: bold;">
                    ${v.seguro.numero} (${v.seguro.tipo})
                </td>
            </tr>`;
        tablaSpecs.innerHTML += filaSeguro;
    }
}

// 6. FUNCIONES AUXILIARES
function toggleLoader(show) {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function mostrarErrorBusqueda(valor, tipo) {
    const mensaje = `El ${tipo}: ${valor} no se encuentra en nuestra base de datos.\n\n¿Deseas contactar a un agente?`;
    if (confirm(mensaje)) {
        const textoWA = encodeURIComponent(`Hola, no encontré resultados para el ${tipo}: ${valor}. ¿Me pueden ayudar?`);
        window.open(`https://wa.me/${telefonoSoporte}?text=${textoWA}`, '_blank');
    }
}

function configurarWhatsApp() {
    const whatsappBtn = document.getElementById('whatsapp-btn');
    if(whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            let mensaje = currentVIN 
                ? `Hola! 👋 Necesito asistencia con el reporte del VIN: *${currentVIN}*`
                : "Hola! 👋 Tengo una duda sobre los reportes de vehículos.";
            this.href = `https://wa.me/${telefonoSoporte}?text=${encodeURIComponent(mensaje)}`;
        });
    }
}

// Generar PDF
const btnPdf = document.getElementById('btn-download-pdf');
if(btnPdf) {
    btnPdf.addEventListener('click', () => {
        const elemento = document.getElementById('report-container');
        const opciones = {
            margin: 10,
            filename: `Reporte_Vehiculo_${currentVIN}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opciones).from(elemento).save();
    });
}


