/**
 * ARCHIVO: script.js
 * Descripción: Maneja la lógica de búsqueda de VIN, Matrículas y Pólizas con validación de estado,
 * renderización de reportes profesionales y generación de PDF.
 */

// 1. VARIABLES DE ESTADO Y CARGA DE DATOS
let listaVehiculos = []; 
let currentVIN = "";
let datosEncontrados = null;
let tipoBusquedaActual = "general"; 
let tipoFiltroActivo = "MATRÍCULA"; // Controla de forma estricta el modo según la pestaña activa
const telefonoSoporte = "13016602019";

// Función para cargar los datos desde el JSON externo
async function cargarBaseDeDatos() {
    try {
        const respuesta = await fetch('https://safevinusa.com/js/datos.json');
        
        if (!respuesta.ok) {
            throw new Error("No se pudo cargar el archivo JSON");
        }
        
        listaVehiculos = await respuesta.json();
        console.log("Base de datos cargada correctamente");
        
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

// 2. INICIALIZACIÓN Y EVENTOS
document.addEventListener('DOMContentLoaded', async () => {
    await cargarBaseDeDatos();

    // --- DETECTOR AUTOMÁTICO DE PESTAÑAS (TABS) ---
    // Mapea dinámicamente los clics de la interfaz para cambiar el tipo de filtro sin alterar el HTML
    const elementosTabs = document.querySelectorAll('.hero tr td, .tab, button, a, [class*="tab"]');
    elementosTabs.forEach(elemento => {
        if (elemento.innerText) {
            const textoEnMayusculas = elemento.innerText.toUpperCase();
            
            if (textoEnMayusculas.includes('POLICY')) {
                elemento.addEventListener('click', () => {
                    tipoFiltroActivo = "PÓLIZA";
                    console.log("Filtro de interfaz cambiado a: PÓLIZA");
                });
            }
            if (textoEnMayusculas.includes('LICENSE') || textoEnMayusculas.includes('PLATE')) {
                elemento.addEventListener('click', () => {
                    tipoFiltroActivo = "MATRÍCULA";
                    console.log("Filtro de interfaz cambiado a: MATRÍCULA");
                });
            }
        }
    });
    // -----------------------------------------------

    // Eventos para búsqueda por VIN
    const btnSearchVIN = document.getElementById('btn-search');
    const vinInput = document.getElementById('vin-input');
    if(btnSearchVIN) btnSearchVIN.addEventListener('click', procesarBusquedaVIN);
    if(vinInput) vinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') procesarBusquedaVIN();
    });

    // Eventos para búsqueda General (Placa o Póliza con Validación de Estado)
    const btnSearchGeneral = document.getElementById('btn-search-plate');
    const plateInput = document.getElementById('plate-input');
    
    if(btnSearchGeneral) btnSearchGeneral.addEventListener('click', manejarBusquedaGeneral);
    if(plateInput) plateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') manejarBusquedaGeneral();
    });

    configurarWhatsApp();
    configurarGeneradorPDF();
});

// 3. LÓGICA DE DETECCIÓN INTELIGENTE Y VALIDACIÓN
function manejarBusquedaGeneral() {
    const inputPrincipal = document.getElementById('plate-input').value.trim().toUpperCase();
    const estadoSeleccionado = document.getElementById('state-select').value;

    if (!inputPrincipal) {
        alert("Por favor, ingrese un dato para buscar.");
        return;
    }

    // Se eliminó la adivinanza por longitud (.length). Ahora evalúa según la pestaña activa en tu UI.
    if (tipoFiltroActivo === "PÓLIZA" || inputPrincipal.includes('-')) {
        console.log("Detectado como PÓLIZA");
        buscarPorPolizaDirecto(inputPrincipal, estadoSeleccionado);
    } else {
        console.log("Detectado como MATRÍCULA");
        buscarPorMatriculaDirecto(inputPrincipal, estadoSeleccionado);
    }
}

// 4. FUNCIONES DE BÚSQUEDA ESPECÍFICAS
function procesarBusquedaVIN() {
    const vinValue = document.getElementById('vin-input').value.trim().toUpperCase();
    if (vinValue.length < 5) {
        alert("Por favor, ingrese un VIN válido.");
        return;
    }

    tipoBusquedaActual = "general";
    datosEncontrados = listaVehiculos.find(v => v.vin === vinValue);

    if (datosEncontrados) {
        currentVIN = vinValue;
        ejecutarFlujoReporte(vinValue);
    } else {
        mostrarErrorBusqueda(vinValue, "VIN");
    }
}

function buscarPorMatriculaDirecto(valorPlaca, estado) {
    tipoBusquedaActual = "general";
    // Validación de Placa + Estado
    datosEncontrados = listaVehiculos.find(v => 
        v.plate.toUpperCase() === valorPlaca && v.state === estado
    );

    if (datosEncontrados) {
        currentVIN = datosEncontrados.vin;
        ejecutarFlujoReporte(datosEncontrados.vin);
    } else {
        alert(`Error: No existe un registro para la placa ${valorPlaca} en el estado de ${estado}.`);
    }
}

function buscarPorPolizaDirecto(valorPoliza, estado) {
    tipoBusquedaActual = "policy"; 
    // Validación de Póliza + Estado
    datosEncontrados = listaVehiculos.find(v => 
        v.seguro && 
        v.seguro.numero.toUpperCase() === valorPoliza && 
        v.state === estado
    );

    if (datosEncontrados) {
        currentVIN = datosEncontrados.vin;
        ejecutarFlujoReporte(datosEncontrados.vin);
    } else {
        alert(`Error: La póliza ${valorPoliza} no existe o no corresponde al estado de ${estado}.`);
    }
}

// 5. ORQUESTADOR DE FLUJO VISUAL
async function ejecutarFlujoReporte(identificador) {
    const heroSection = document.querySelector('.hero');
    const sectionsToHide = [
        document.getElementById('info-section'),
        document.getElementById('about-plates'),
        document.getElementById('trust-section'),
        document.getElementById('achievements-section'),
        document.getElementById('support-stats'),
        document.getElementById('resources-section'),
        document.getElementById('partners-section'),
        document.getElementById('insurance-info')
    ];
    const reportContainer = document.getElementById('report-container');

    toggleLoader(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (heroSection) heroSection.style.display = 'none';
    sectionsToHide.forEach(section => {
        if (section) section.style.display = 'none';
    });
    
    renderizarDatosEnPantalla();

    toggleLoader(false);
    reportContainer.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 6. RENDERIZACIÓN DINÁMICA DEL REPORTE
function renderizarDatosEnPantalla() {
    const v = datosEncontrados;

    // Título y VIN
    document.getElementById('car-name').innerText = `${v.vehiculo.anio} ${v.vehiculo.marca} ${v.vehiculo.modelo}`;
    document.getElementById('vin-number').innerText = v.vin;

    // Datos del Comprador dinámicos
    if (v.comprador) {
        document.getElementById('buyer-name').innerHTML = `<strong>Name:</strong> ${v.comprador.nombre}`;
        document.getElementById('buyer-address').innerHTML = `<strong>Address:</strong> ${v.comprador.direccion}`;
        document.getElementById('buyer-email').innerHTML = `<strong>Email:</strong> ${v.comprador.correo}`;
        document.getElementById('expiry-date').innerHTML = `<strong>Expiration Date:</strong> ${v.comprador.vencimiento}`;
        document.getElementById('purchase-date').innerHTML = `<strong>Purchase Date:</strong> ${v.comprador.compra}`;
    }

    // Historial
    const listaHistorial = document.getElementById('history-list');
    listaHistorial.innerHTML = ""; 
    v.historial.forEach(item => {
        const li = document.createElement('li');
        li.innerText = item;
        listaHistorial.appendChild(li);
    });

    // Especificaciones Técnicas + Póliza
    const tablaSpecs = document.getElementById('specs-table');
    tablaSpecs.innerHTML = ""; 

    let htmlSpecs = "";
    let anioYaAgregado = false;

    for (const [propiedad, valor] of Object.entries(v.especificaciones)) {
        let propiedadIngles = propiedad;
        
        if (propiedad.toLowerCase() === "marca") propiedadIngles = "Make";
        if (propiedad.toLowerCase() === "modelo") propiedadIngles = "Model";
        if (propiedad.toLowerCase() === "color") propiedadIngles = "Color";
        if (propiedad.toLowerCase().includes("añ") || propiedad.toLowerCase() === "año" || propiedad.toLowerCase() === "anio") {
            propiedadIngles = "Year";
            anioYaAgregado = true;
        }

        htmlSpecs += `<tr><td class="label"><strong>${propiedadIngles}</strong></td><td>${valor}</td></tr>`;
    }
    
    if (tipoBusquedaActual === "policy" && v.seguro) {
        htmlSpecs += `<tr><td class="label"><strong>Insurance Policy</strong></td><td style="color: #004a99; font-weight: bold;">${v.seguro.numero} (${v.seguro.tipo})</td></tr>`;
    } else if (!anioYaAgregado) {
        htmlSpecs += `<tr><td class="label"><strong>Year</strong></td><td>${v.vehiculo.anio}</td></tr>`;
    }

    tablaSpecs.innerHTML = htmlSpecs;
}

// 7. FUNCIONES AUXILIARES Y PDF
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

function configurarGeneradorPDF() {
    const btnPdf = document.getElementById('btn-download-pdf');
    if(btnPdf) {
        btnPdf.addEventListener('click', () => {
            const elemento = document.getElementById('report-container');
            const opciones = {
                margin: [10, 10],
                filename: `Reporte_FaxVin_${currentVIN}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opciones).from(elemento).save();
        });
    }
}