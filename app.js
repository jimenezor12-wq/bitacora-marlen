// OBJETO PARA MANEJAR DATOS Y LÓGICA (CORE)
const core = {
    data: JSON.parse(localStorage.getItem('atp_maestro_v3')) || {
        grupos: [
            { id: 0, nombre: "1º A", alumnos: [], historial: {} },
            { id: 1, nombre: "1º B", alumnos: [], historial: {} },
            { id: 2, nombre: "2º C", alumnos: [], historial: {} },
            { id: 3, nombre: "3º A", alumnos: [], historial: {} },
            { id: 4, nombre: "3º B", alumnos: [], historial: {} }
        ]
    },
    logoData: localStorage.getItem('bitacora_logo') || null,
    alumnoActual: null,
    grupoActual: null,

    manejarLogo(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            this.logoData = reader.result;
            localStorage.setItem('bitacora_logo', reader.result);
            const preview = document.getElementById('img-logo-preview');
            const placeholder = document.getElementById('placeholder-logo');
            if(preview) {
                preview.src = reader.result;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
            }
        };
        if (file) reader.readAsDataURL(file);
    },

    guardarConfig() {
        this.data.grupos.forEach(g => {
            const inputNombre = document.getElementById(`name-${g.id}`);
            const listaTxt = document.getElementById(`list-${g.id}`);
            if (inputNombre && listaTxt) {
                g.nombre = inputNombre.value;
                g.alumnos = listaTxt.value.split('\n').filter(l => l.trim() !== "");
            }
        });
        localStorage.setItem('atp_maestro_v3', JSON.stringify(this.data));
        ui.renderGrupos();
        ui.cerrarConfig();
    },

    registrarIncidencia() {
        const conducta = document.getElementById('reg-conducta').value;
        const accion = document.getElementById('reg-accion').value;
        const acuerdos = document.getElementById('reg-acuerdos').value; 
        const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const grupo = this.data.grupos[this.grupoActual];
        if (!grupo.historial) grupo.historial = {}; 
        if (!grupo.historial[this.alumnoActual]) grupo.historial[this.alumnoActual] = [];
        
        let relatoFinal = `El día ${fecha}, el alumno ${conducta} Ante esta situación, ${accion}`;
        if(acuerdos.trim() !== "") {
            relatoFinal += ` ACUERDOS TRAS REUNIÓN: ${acuerdos}`;
        }

        const nuevaEntrada = {
            fecha: fecha,
            relato: relatoFinal,
            archivado: false
        };

        grupo.historial[this.alumnoActual].push(nuevaEntrada);
        localStorage.setItem('atp_maestro_v3', JSON.stringify(this.data));
        
        document.getElementById('reg-acuerdos').value = "";

        const hits = grupo.historial[this.alumnoActual].filter(h => !h.archivado).length;
        if(hits >= 4) {
            alert("🚨 ALERTA: 4 Incidencias alcanzadas. Se recomienda generar el citatorio formal.");
        }

        ui.cerrarRegistro();
        ui.verAlumnos(this.grupoActual); 
    },

    generarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format: 'legal' }); 
        const g = this.data.grupos[this.grupoActual];
        const alumno = g.alumnos[this.alumnoActual];
        const historial = g.historial[this.alumnoActual] || [];
        const fechaCita = document.getElementById('pdf-fecha-cita').value;
        const horaCita = document.getElementById('pdf-hora-cita').value;

        if (historial.length === 0) return alert("No hay registros para este alumno.");
        if (this.logoData) doc.addImage(this.logoData, 'PNG', 20, 10, 22, 22);
        
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text("REPORTE DE INCIDENCIAS Y SEGUIMIENTO ACADÉMICO", 105, 20, { align: 'center' });

        doc.setDrawColor(180); doc.rect(20, 35, 175, 25); 
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text(`DOCENTE: MARLEN JIMENEZ ORTIZ`, 25, 42);
        doc.text(`ALUMNO: ${alumno.toUpperCase()}`, 25, 54);
        doc.text(`GRADO Y GRUPO: ${g.nombre}`, 120, 42);
        doc.text(`CICLO ESCOLAR: 2025-2026`, 120, 48);

        doc.setFont("helvetica", "bold"); doc.text("RELATORÍA DE HECHOS Y ACCIONES PEDAGÓGICAS:", 20, 70);
        doc.line(20, 72, 195, 72);

        let y = 80;
        doc.setFontSize(8.5);
        historial.slice(-4).forEach((h, i) => {
            doc.setFillColor(248, 248, 248); doc.rect(20, y - 4, 175, 5, 'F');
            doc.setFont("helvetica", "bold"); doc.text(`REGISTRO #${i+1} - FECHA: ${h.fecha}`, 22, y);
            y += 6; 
            
            doc.setFont("helvetica", "normal");
            const partes = h.relato.split(" ACUERDOS TRAS REUNIÓN: ");
            const lines = doc.splitTextToSize(partes[0], 170);
            doc.text(lines, 22, y, { align: 'justify', maxWidth: 170 });
            y += (lines.length * 4.5) + 2;

            if(partes[1]) {
                doc.setFont("helvetica", "bolditalic");
                doc.setTextColor(0, 50, 150);
                const lineasAcuerdo = doc.splitTextToSize(`ACUERDO PREVIO: ${partes[1]}`, 165);
                doc.text(lineasAcuerdo, 25, y, { maxWidth: 165 });
                y += (lineasAcuerdo.length * 4) + 2;
                doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
            }
            y += 4;
            if (y > 200) { doc.addPage(); y = 25; }
        });
// --- DESPUÉS DE LOS REGISTROS Y ANTES DEL CITATORIO ---
        y += 4;
        
        // Verificamos si necesitamos otra página para las firmas
        if (y > 250) { doc.addPage(); y = 25; }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("ACUERDOS Y COMPROMISOS DERIVADOS DE ESTA ETAPA:", 20, y);
        
        // Dibujamos el cuadro grande para escribir acuerdos a mano o ver los impresos
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(20, y + 2, 175, 35); // Cuadro de acuerdos
        
        y += 50; // Espacio para las firmas

        // Líneas de firma
        doc.setLineWidth(0.2);
        doc.line(25, y, 75, y);   // Firma Docente
        doc.line(82, y, 132, y);  // Firma Padre
        doc.line(139, y, 189, y); // Firma Alumno

        doc.setFontSize(8);
        doc.text("FIRMA DE LA DOCENTE", 50, y + 5, { align: 'center' });
        doc.text("FIRMA DEL PADRE/TUTOR", 107, y + 5, { align: 'center' });
        doc.text("FIRMA DEL ALUMNO", 164, y + 5, { align: 'center' });

        // --- SECCIÓN DE CITATORIO RECORTABLE (ESTO YA LO TENÍAS, PERO VA ABAJO) ---
        doc.setLineDashPattern([2, 2], 0);
        doc.line(0, 245, 215, 245); 
        doc.setFontSize(8);
        doc.text("RECORTAR POR AQUÍ (PARA ACUSE DE RECIBO)", 105, 243, { align: 'center' });
        // ... (el resto del citatorio oficial que ya pegamos antes)
        // --- CITATORIO ---
        doc.setLineDashPattern([2, 2], 0); doc.line(0, 245, 215, 245); 
        const tieneAntecedentes = historial.some(h => h.archivado);
        const tituloCitatorio = tieneAntecedentes ? "CITATORIO (SEGUNDA NOTIFICACIÓN)" : "CITATORIO";

        doc.setLineDashPattern([], 0); 
        if (this.logoData) doc.addImage(this.logoData, 'PNG', 20, 250, 18, 18); 

        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        if(tieneAntecedentes) doc.setTextColor(200, 0, 0);
        doc.text(tituloCitatorio, 105, 260, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        let cuerpoMsj = tieneAntecedentes 
            ? `Por medio de la presente, se le comunica que debido a la REINCIDENCIA en las conductas detectadas y al seguimiento previo de acuerdos, se requiere su presencia de carácter URGENTE para tratar el desempeño de su hijo(a) ${alumno.toUpperCase()}.`
            : `Por medio de la presente, se solicita su presencia de manera formal para tratar asuntos relacionados con el desempeño académico de su hijo(a) ${alumno.toUpperCase()}.`;

        doc.text("Estimado padre de familia o tutor:", 20, 275);
        doc.text(doc.splitTextToSize(cuerpoMsj, 175), 20, 282, { align: 'justify', maxWidth: 175 });
        doc.setFont("helvetica", "bold");
        doc.text(`Día: ${fechaCita} | Hora: ${horaCita} hrs.`, 20, 298);
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text("Agradezco su puntual asistencia y corresponsabilidad educativa.", 20, 308);
        doc.text("Mtra. Marlen Jimenez Ortiz - Asignatura de Español", 20, 325);

        doc.save(`Reporte_Final_${alumno.replace(/\s+/g, '_')}.pdf`);
    },

    generarPDFInasistencia() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format: 'letter' }); 
        const g = this.data.grupos[this.grupoActual];
        const alumno = g.alumnos[this.alumnoActual];
        const historial = g.historial[this.alumnoActual] || [];
        const fechaCita = document.getElementById('pdf-fecha-cita').value;
        const horaCita = document.getElementById('pdf-hora-cita').value;

        const tieneAntecedentes = historial.some(h => h.archivado);
        const tituloDoc = tieneAntecedentes 
            ? "CONSTANCIA DE INASISTENCIA REINCIDENTE DEL TUTOR" 
            : "CONSTANCIA DE INASISTENCIA DE PADRE DE FAMILIA / TUTOR";

        if (this.logoData) doc.addImage(this.logoData, 'PNG', 20, 10, 20, 20);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        if(tieneAntecedentes) doc.setTextColor(180, 0, 0);
        doc.text(tituloDoc, 105, 20, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        doc.setDrawColor(180); doc.rect(20, 32, 175, 22); 
        doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
        doc.text(`DOCENTE: MARLEN JIMENEZ ORTIZ`, 25, 38);
        doc.text(`ALUMNO: ${alumno.toUpperCase()}`, 25, 48);
        doc.text(`GRADO Y GRUPO: ${g.nombre}`, 120, 38);

        doc.setFont("helvetica", "bold"); doc.text("HECHOS:", 20, 62);
        const intro = `Se hace constar que el día ${fechaCita} a las ${horaCita} hrs, el tutor de ${alumno.toUpperCase()} NO ASISTIÓ a la cita programada para establecer acuerdos de mejora académica.`;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(doc.splitTextToSize(intro, 175), 20, 72, { align: 'justify', maxWidth: 175 });

        let y = 88;
        doc.setFont("helvetica", "bold"); doc.text("ANTECEDENTES ACUMULADOS:", 20, y); y += 6;
        doc.setFontSize(8);
        historial.slice(-5).forEach((h, i) => {
            doc.setFillColor(248, 248, 248); doc.rect(20, y - 4, 175, 5, 'F');
            doc.text(`REGISTRO #${i+1} - FECHA: ${h.fecha} ${h.archivado ? '(CICLO ANTERIOR)' : ''}`, 22, y); y += 6;
            const lines = doc.splitTextToSize(h.relato, 170);
            doc.text(lines, 22, y, { align: 'justify', maxWidth: 170 });
            y += (lines.length * 4) + 6;
        });

        doc.save(`Inasistencia_${alumno.replace(/\s+/g, '_')}.pdf`);
    }
};

// OBJETO PARA MANEJAR INTERFAZ (UI)
const ui = {
    renderGrupos() {
        const grid = document.getElementById('view-groups');
        if(!grid) return;
        grid.innerHTML = core.data.grupos.map(g => `
            <button onclick="ui.verAlumnos(${g.id})" class="glass-card p-6 rounded-3xl text-left border-b-4 border-blue-600 transition-all active:scale-95">
                <span class="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Español</span>
                <span class="text-2xl font-black text-gray-800">${g.nombre || 'Sin Nombre'}</span>
                <p class="mt-2 text-xs font-bold text-gray-400">${g.alumnos.length} Alumnos</p>
            </button>
        `).join('');
    },

    verAlumnos(id) {
        core.grupoActual = id;
        const g = core.data.grupos[id];
        document.getElementById('view-groups').classList.add('hidden');
        document.getElementById('view-students').classList.remove('hidden');
        document.getElementById('current-group-title').innerText = g.nombre;
        
        const lista = document.getElementById('students-list');
        lista.innerHTML = g.alumnos.map((a, i) => {
            const hits = g.historial && g.historial[i] ? g.historial[i].filter(h => !h.archivado).length : 0;
            const colorHits = hits >= 4 ? 'bg-red-500 shadow-lg shadow-red-200' : (hits > 0 ? 'bg-blue-500' : 'bg-gray-200');
            return `
                <li class="glass-card p-4 rounded-2xl flex justify-between items-center bg-white shadow-sm border border-gray-100">
                    <div class="flex items-center gap-3">
                        <span class="${colorHits} text-white w-6 h-6 rounded-lg text-[10px] flex items-center justify-center font-bold">${hits}</span>
                        <span class="font-bold text-gray-700 text-sm">${a}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="ui.abrirHistorial(${i}, '${a}')" class="bg-blue-50 text-blue-600 p-2 rounded-xl">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="ui.abrirRegistro(${i}, '${a}')" class="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                            Registrar
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    },

    irAGrupos() {
        document.getElementById('view-groups').classList.remove('hidden');
        document.getElementById('view-students').classList.add('hidden');
    },

    abrirConfig() {
        // 1. Renderizamos los grupos en el editor
        const editor = document.getElementById('editor-grupos');
        if (editor) {
            editor.innerHTML = core.data.grupos.map(g => `
                <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <input id="name-${g.id}" value="${g.nombre}" class="w-full mb-3 p-3 rounded-xl border-none font-black text-blue-900" placeholder="Grado/Grupo">
                    <textarea id="list-${g.id}" class="w-full h-24 p-4 rounded-xl border-none text-xs font-medium" placeholder="Pega la lista aquí...">${g.alumnos.join('\n')}</textarea>
                </div>
            `).join('');
        }

        // 2. Cargamos la vista previa del logo si ya existe en memoria
        const preview = document.getElementById('img-logo-preview');
        const placeholder = document.getElementById('placeholder-logo');
        
        if (core.logoData && preview && placeholder) {
            preview.src = core.logoData;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else if (preview && placeholder) {
            // Si no hay logo, nos aseguramos de mostrar el icono vacío
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }

        // 3. Mostramos el modal
        const modal = document.getElementById('modal-config');
        if (modal) modal.classList.remove('hidden');
    },

    cerrarConfig() { 
        const modal = document.getElementById('modal-config');
        if (modal) modal.classList.add('hidden'); 
    },

    abrirRegistro(idx, nombre) {
        core.alumnoActual = idx;
        document.getElementById('encabezado-alumno').innerHTML = `<h4 class="text-blue-600 font-black">${nombre}</h4>`;
        document.getElementById('modal-registro').classList.remove('hidden');
    },

    cerrarRegistro() { document.getElementById('modal-registro').classList.add('hidden'); },

    abrirHistorial(idx, nombre) {
        core.alumnoActual = idx;
        document.getElementById('hist-alumno-nombre').innerText = nombre;
        const g = core.data.grupos[core.grupoActual];
        const historial = g.historial ? (g.historial[idx] || []) : [];
        const registrosActivos = historial.filter(h => !h.archivado).length;

        const container = document.getElementById('lista-registros');
        container.innerHTML = historial.length > 0 ? 
            historial.map((h, i) => {
                const partes = h.relato.split(" ACUERDOS TRAS REUNIÓN: ");
                return `
                    <div class="p-4 rounded-2xl border-l-4 ${h.archivado ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-blue-50 border-blue-400'} mb-3">
                        <div class="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-2">
                            <span>Registro #${i+1} ${h.archivado ? '(CERRADO)' : ''}</span> <span>${h.fecha}</span>
                        </div>
                        <p class="text-xs text-gray-700 leading-relaxed">${partes[0]}</p>
                        ${partes[1] ? `
                            <div class="mt-2 p-2 bg-white/50 rounded-lg border border-blue-100">
                                <p class="text-[10px] font-black text-blue-600 uppercase mb-1">🤝 Acuerdos pactados:</p>
                                <p class="text-xs text-blue-800 italic">"${partes[1]}"</p>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('') : '<p class="text-center text-gray-400 py-4 italic text-sm">Sin registros previos.</p>';

        if (registrosActivos > 0) {
            container.innerHTML += `
                <button onclick="ui.confirmarReinicio()" class="mt-4 w-full bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black text-[10px] uppercase border border-emerald-100 hover:bg-emerald-100 transition">
                    <i class="fas fa-check-circle mr-2"></i> Finalizar ciclo y reiniciar contador
                </button>
            `;
        }
        document.getElementById('modal-historial').classList.remove('hidden');
    },

    confirmarReinicio() {
        if(confirm("¿Deseas cerrar este ciclo? El contador volverá a cero pero el historial se mantiene.")) {
            const g = core.data.grupos[core.grupoActual];
            g.historial[core.alumnoActual].forEach(h => h.archivado = true);
            localStorage.setItem('atp_maestro_v3', JSON.stringify(core.data));
            ui.cerrarHistorial(); ui.verAlumnos(core.grupoActual);
        }
    },

    cerrarHistorial() { document.getElementById('modal-historial').classList.add('hidden'); },

    toggleGuiaGeneral() {
        const guia = document.getElementById('guia-rapida');
        if(guia) guia.classList.toggle('hidden');
    }
};

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    ui.renderGrupos();
    const inputLogo = document.getElementById('input-logo');
    if(inputLogo) inputLogo.addEventListener('change', (e) => core.manejarLogo(e));
});