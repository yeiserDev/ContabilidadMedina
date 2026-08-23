/* ============================================================
   ESCENAS DEL DETALLE — un dibujo por tipo de gasto
   ------------------------------------------------------------
   El detalle de un movimiento abría siempre igual: un monto y una
   ficha. Aquí cada gasto estrena una escena que cuenta de qué va
   —el camión repostando, el motorizado del delivery, la ruta en el
   mapa— para reconocerlo antes de leer una sola palabra.

   La escena se elige por palabras del rubro y, si el rubro no dice
   nada, de la descripción. Los rubros los escribe el usuario ("Petróleo
   Eduardo", "Viático Eduardo"), así que no hay lista cerrada que
   valga: se busca por raíces, sin tildes y en minúscula.

   Cada dibujo es SVG plano sobre el mismo lienzo de 320x130, con la
   paleta de la casa. Nada de imágenes externas: son unos pocos kB de
   marcado que además siguen el tema oscuro sin repintarse.
   ============================================================ */
(function () {
    'use strict';

    /* Sin tildes y en minúscula: "petróleo", "Petroleo" y "PETRÓLEO"
       tienen que caer en el mismo sitio. */
    function normalizar(t) {
        return (t || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '');
    }

    /* El orden importa: gana la primera familia que encaje. Las más
       específicas van arriba —"mantenimiento carro" es taller, no
       servicios— y la genérica queda fuera de la lista, como respaldo. */
    var FAMILIAS = [
        { id: 'combustible', claves: ['petroleo', 'gasolina', 'combustible', 'grifo', 'diesel', 'gas ', 'galon', 'gasohol'] },
        { id: 'comida', claves: ['comida', 'cena', 'almuerzo', 'desayuno', 'menu', 'restaurant', 'delivery', 'pollo', 'polleria', 'snack', 'cafe', 'chifa', 'pizza', 'mercado', 'viveres'] },
        { id: 'viaje', claves: ['viaje', 'viatico', 'pasaje', 'ruta', 'taxi', 'bus', 'vuelo', 'peaje', 'hospedaje', 'hotel', 'traslado'] },
        { id: 'taller', claves: ['mecanic', 'llanta', 'mantenimiento', 'taller', 'carro', 'auto', 'repuesto', 'aceite', 'bateria', 'lavado'] },
        { id: 'educacion', claves: ['universidad', 'colegio', 'matricula', 'pension', 'curso', 'academia', 'libro', 'estudio', 'instituto'] },
        { id: 'salud', claves: ['salud', 'vacuna', 'inyeccion', 'clinica', 'medicina', 'farmacia', 'doctor', 'hospital', 'dentista', 'consulta'] },
        { id: 'servicios', claves: ['internet', 'luz', 'agua', 'recibo', 'telefon', 'cable', 'celular', 'wifi', 'plan ', 'netflix', 'suscripcion'] },
        { id: 'banco', claves: ['banco', 'comision', 'interes', 'transferencia', 'contador', 'itf', 'mantenimiento de cuenta'] },
        { id: 'multa', claves: ['papeleta', 'multa', 'infraccion', 'sat', 'tramite', 'notaria'] },
        { id: 'prestamo', claves: ['prestamo', 'devolucion', 'deuda', 'presto', 'presta'] }
    ];

    function familia(texto) {
        var t = normalizar(texto);
        for (var i = 0; i < FAMILIAS.length; i++) {
            var c = FAMILIAS[i].claves;
            for (var j = 0; j < c.length; j++) {
                if (t.indexOf(c[j]) !== -1) return FAMILIAS[i].id;
            }
        }
        return null;
    }

    /* ---- Piezas repetidas ---- */
    var SUELO = '<path class="es-suelo" d="M14 108 H306" stroke-linecap="round"/>';

    var ESCENAS = {

        /* El camión cisterna repostando de verdad: la manguera entra por la
           boca del tanque, el nivel sube dentro de la cisterna y el
           marcador del surtidor avanza con él. Mismo trazo de dibujo que
           la escena del reparto: contorno negro y color plano. */
        combustible:
            '<defs><clipPath id="esCisterna">' +
            '<rect x="152" y="52" width="144" height="42" rx="21"/>' +
            '</clipPath></defs>' +
            /* mancha clara del fondo */
            '<path d="M40 14 C 120 -8 250 -6 292 22 C 322 44 314 96 262 112 C 190 132 70 126 38 104 C 10 84 8 30 40 14 Z" ' +
            'fill="#FFFFFF" opacity="0.38"/>' +

            '<g stroke="#17130F" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">' +
            /* ---- surtidor ---- */
            '<path d="M18 108 V48 q0 -8 8 -8 h30 q8 0 8 8 v60 z" fill="#3D3A34"/>' +
            '<path d="M12 108 h58 v8 h-58 z" fill="#2A2825"/>' +
            '<path d="M26 50 h30 v22 h-30 z" fill="#0E2B1B"/>' +
            '<rect class="es-marcador" x="29" y="62" width="24" height="6" rx="3" fill="#5FCB89" stroke="none"/>' +
            '<circle cx="34" cy="56" r="2.5" fill="#5FCB89" stroke="none"/>' +
            '<path d="M28 82 h26" stroke-width="2.6"/>' +
            /* ---- manguera y pistola ---- */
            '<path d="M66 62 C 104 62 100 30 134 28 C 148 27 156 32 162 38" fill="none" stroke-width="5"/>' +
            '<path d="M158 30 h16 q4 0 4 4 v8 q0 4 -4 4 h-16 z" fill="#2A2825"/>' +
            '<path d="M174 40 v8" stroke-width="5"/>' +

            /* ---- camión ---- */
            '<path d="M96 96 h204 v8 h-204 z" fill="#2A2825"/>' +
            '<path d="M96 92 V60 q0 -8 8 -8 h30 q6 0 8 5 l10 27 v8 z" fill="#B8460A"/>' +
            '<path d="M104 62 h24 l8 20 h-32 z" fill="#FBD9C4"/>' +
            '<rect x="152" y="52" width="144" height="42" rx="21" fill="#E05E10"/>' +
            /* el nivel, recortado por la silueta de la cisterna */
            '<g clip-path="url(#esCisterna)" stroke="none">' +
            '<rect class="es-nivel" x="152" y="52" width="144" height="42" fill="#F7C24A"/>' +
            '</g>' +
            '<rect x="152" y="52" width="144" height="42" rx="21" fill="none"/>' +
            '<path d="M196 52 v42 M252 52 v42" stroke-width="2.6" opacity="0.55"/>' +
            '<path d="M170 52 v-8 q0 -4 4 -4 h12 q4 0 4 4 v8 z" fill="#B8460A"/>' +
            /* ---- ruedas ---- */
            '<circle cx="124" cy="100" r="14" fill="#17130F"/>' +
            '<circle cx="212" cy="100" r="14" fill="#17130F"/>' +
            '<circle cx="248" cy="100" r="14" fill="#17130F"/>' +
            '<g><circle cx="124" cy="100" r="6.5" fill="#FFF6EE"/></g>' +
            '<g><circle cx="212" cy="100" r="6.5" fill="#FFF6EE"/></g>' +
            '<g><circle cx="248" cy="100" r="6.5" fill="#FFF6EE"/></g>' +
            '</g>' +
            /* gotas que caen por la boca mientras carga */
            '<g class="es-gota" fill="#F7C24A" stroke="none">' +
            '<ellipse cx="178" cy="46" rx="3" ry="4"/>' +
            '</g>',

        /* El repartidor con la caja en alto, al modo de la ilustración de la
           referencia: contorno negro, uniforme naranja y su mancha clara
           detrás. Es la única escena que se mueve en bucle —rueda, líneas de
           velocidad y humo—, porque de eso iba el encargo.

           Las piezas van de atrás hacia delante (ruedas, carrocería, piloto,
           llantas, caja) y todas llevan su contorno: sin él, dos naranjas que
           se tocan se funden en una mancha sola. */
        comida:
            /* mancha clara, sólo bajo el repartidor */
            '<path d="M40 12 C 96 -8 168 -2 200 22 C 232 48 224 96 178 110 C 128 124 56 120 30 100 C 4 78 6 28 40 12 Z" ' +
            'fill="#FFFFFF" opacity="0.42"/>' +
            '<path class="es-brillo" d="M28 14 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#FFF3E9" opacity="0.85"/>' +
            '<path class="es-brillo es-brillo--b" d="M186 16 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 z" fill="#FFF3E9" opacity="0.7"/>' +

            /* ---- el local del que acaba de salir ----
               Va detrás y en tonos claros: si compitiera en color con el
               repartidor habría dos protagonistas y ninguno. */
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            '<path d="M206 110 V48 h104 v62 z" fill="#FFF3E6"/>' +
            '<path d="M240 70 h30 v40 h-30 z" fill="#8A4A20"/>' +
            '<circle cx="246" cy="90" r="2" fill="#FFF3E6" stroke="none"/>' +
            '<path d="M282 68 h24 v24 h-24 z" fill="#CBDCE9"/>' +
            '<path d="M294 68 v24 M282 80 h24" stroke-width="2"/>' +
            '<path d="M200 50 h116 v-8 q0 -8 -8 -8 h-100 q-8 0 -8 8 z" fill="#E05E10"/>' +
            '<path d="M200 50 q7 9 14.5 0 q7 9 14.5 0 q7 9 14.5 0 q7 9 14.5 0 q7 9 14.5 0 q7 9 14.5 0 q7 9 14.5 0 q7 9 14.5 0" ' +
            'fill="#E05E10"/>' +
            '<path d="M232 16 h52 q4 0 4 4 v10 q0 4 -4 4 h-52 q-4 0 -4 -4 v-10 q0 -4 4 -4 z" fill="#FFF3E6"/>' +
            '<path d="M246 21 v8 M250 21 v8 M254 21 v8 M250 29 v-2" stroke-width="2"/>' +
            '<path d="M266 21 q5 3 0 8 v0" stroke-width="2" fill="none"/>' +
            '</g>' +

            '<g class="es-veloz" stroke="#FFF3E9" stroke-width="5" stroke-linecap="round" opacity="0.75">' +
            '<path d="M186 34 h30"/><path d="M196 50 h22"/><path d="M190 66 h26"/>' +
            '</g>' +
            '<g class="es-humo" fill="#FFF6EE">' +
            '<circle cx="194" cy="104" r="8"/><circle cx="206" cy="100" r="10"/><circle cx="218" cy="104" r="7"/>' +
            '<rect x="192" y="99" width="32" height="12" rx="6"/>' +
            '</g>' +

            /* El vehículo entero se achica y se corre a la izquierda: en un
               lienzo tan ancho, a tamaño completo parecía estirado. */
            '<g transform="translate(-30 8) scale(0.86)">' +
            '<g class="es-bota" stroke="#17130F" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round">' +
            /* ---- neumáticos ---- */
            '<circle cx="86" cy="100" r="18" fill="#17130F"/>' +
            '<circle cx="222" cy="100" r="18" fill="#17130F"/>' +
            /* ---- carrocería ---- */
            '<path d="M182 98 C 180 74 196 62 216 62 C 240 62 250 78 248 98 Z" fill="#E05E10"/>' +
            '<path d="M196 70 C 218 64 238 74 244 92" fill="none" stroke-width="2.4" opacity="0.45"/>' +
            '<path d="M124 90 h60 v10 h-66 z" fill="#E05E10"/>' +
            '<path d="M104 98 C 96 80 92 62 96 44 C 98 35 110 33 116 40 C 122 58 126 80 128 98 Z" fill="#E05E10"/>' +
            '<path d="M64 94 C 66 78 84 70 100 76" fill="none" stroke-width="7" stroke="#E05E10"/>' +
            '<circle cx="106" cy="56" r="10" fill="#FFF6EE"/>' +
            '<circle cx="106" cy="56" r="4" fill="#F6C9A6" stroke-width="2"/>' +
            '<path d="M86 34 h34" stroke-width="5"/>' +
            '<path d="M82 30 h10 v8 h-10 z" fill="#17130F"/>' +
            '<path d="M114 30 h10 v8 h-10 z" fill="#17130F"/>' +
            '<path d="M180 62 h52 q10 0 10 8 t-10 8 h-52 q-8 0 -8 -8 t8 -8 z" fill="#17130F"/>' +
            /* ---- piloto ---- */
            '<path d="M200 76 L 160 86" fill="none" stroke="#F5813C" stroke-width="16"/>' +
            '<path d="M160 86 L 150 98" fill="none" stroke="#F5813C" stroke-width="14"/>' +
            '<path d="M136 94 h18 q6 0 6 6 v4 h-28 q-2 -6 4 -10 z" fill="#FFF6EE"/>' +
            '<path d="M190 38 C 174 46 170 64 178 78 L 214 76 C 222 60 210 38 198 36 Z" fill="#F5813C"/>' +
            '<path d="M180 60 q18 4 32 -2" fill="none" stroke-width="2.4" opacity="0.45"/>' +
            '<path d="M194 50 C 162 54 128 48 112 40" fill="none" stroke="#F5813C" stroke-width="13"/>' +
            '<circle cx="108" cy="38" r="7" fill="#F6C9A6"/>' +
            '<path d="M196 42 L 176 32 L 158 26" fill="none" stroke="#F5813C" stroke-width="13"/>' +
            '<circle cx="156" cy="26" r="7" fill="#F6C9A6"/>' +
            /* ---- cabeza ---- */
            '<circle cx="188" cy="26" r="15" fill="#F6C9A6"/>' +
            '<path d="M174 22 C 174 8 202 6 204 20 L 204 26 L 174 28 Z" fill="#E05E10"/>' +
            '<path d="M174 26 C 162 26 158 30 160 33 L 178 30 Z" fill="#E05E10"/>' +
            '<circle cx="182" cy="28" r="2.1" fill="#17130F" stroke="none"/>' +
            '<circle cx="194" cy="28" r="2.1" fill="#17130F" stroke="none"/>' +
            '<path d="M182 34 q6 6 12 0" fill="none" stroke-width="2.4"/>' +
            '<circle cx="178" cy="33" r="3" fill="#F59A8E" stroke="none" opacity="0.7"/>' +
            '<circle cx="199" cy="33" r="3" fill="#F59A8E" stroke="none" opacity="0.7"/>' +
            /* ---- llantas y caja ---- */
            '<g class="es-llanta"><circle cx="86" cy="100" r="9" fill="#FFF6EE"/>' +
            '<path d="M86 93 v14 M79 100 h14" stroke-width="2.4"/></g>' +
            '<g class="es-llanta es-llanta--b"><circle cx="222" cy="100" r="9" fill="#FFF6EE"/>' +
            '<path d="M222 93 v14 M215 100 h14" stroke-width="2.4"/></g>' +
            '<path d="M132 4 h48 q4 0 4 4 v10 q0 4 -4 4 h-48 q-4 0 -4 -4 v-10 q0 -4 4 -4 z" fill="#FFF6EE"/>' +
            '<path d="M128 13 h56" stroke-width="2.4"/>' +
            '</g>' +
            '</g>',

        /* El mapa con la ruta y el camión recorriéndola. El vehículo va
           montado sobre la misma curva que dibuja el trazo (offset-path),
           así que camino y recorrido no pueden descuadrarse: si mañana se
           retoca la curva, el camión la sigue sin tocar nada más.

           Verde donde arranca, naranja donde termina: los dos colores con
           los que la app dice entra y sale. */
        viaje: (function () {
            var RUTA = 'M62 94 C 96 94 88 64 122 62 C 152 60 152 40 188 38 C 216 36 232 44 254 44';
            return '<defs>' +
                '<clipPath id="esMapaCorte"><rect x="8" y="8" width="304" height="114" rx="14"/></clipPath>' +
                '<linearGradient id="esRutaColor" x1="0" y1="0" x2="1" y2="0">' +
                '<stop offset="0" stop-color="#F5934F"/><stop offset="1" stop-color="#CF4500"/>' +
                '</linearGradient>' +
                '</defs>' +
                '<g clip-path="url(#esMapaCorte)">' +
                '<rect x="8" y="8" width="304" height="114" fill="#EAE3DA"/>' +
                '<rect x="26" y="80" width="44" height="28" rx="5" fill="#D8E4D6"/>' +
                '<rect x="212" y="16" width="52" height="26" rx="5" fill="#D8E4D6"/>' +
                '<path d="M304 4 C 272 38 296 72 262 126" fill="none" stroke="#CBDCE9" stroke-width="10" stroke-linecap="round"/>' +
                '<path d="M4 42 H316 M4 82 H316 M58 4 V126 M132 4 V126 M204 4 V126" stroke="#DCD2C4" stroke-width="3.5"/>' +
                '<path d="M4 22 H316 M4 62 H316 M4 102 H316 M26 4 V126 M92 4 V126 M166 4 V126 M240 4 V126 M284 4 V126" ' +
                'stroke="#E4DCD0" stroke-width="1.8"/>' +
                '<path d="M92 62 L 132 22 M166 102 L 204 62" stroke="#E4DCD0" stroke-width="1.8"/>' +
                '</g>' +
                /* el recorrido: reborde claro y encima el trazo de color */
                '<path d="' + RUTA + '" fill="none" stroke="#FBF8F4" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path class="es-traza" d="' + RUTA + '" fill="none" stroke="url(#esRutaColor)" ' +
                'stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                /* extremos */
                '<g class="es-entra">' +
                '<circle class="es-pulso" cx="254" cy="44" r="9" fill="none" stroke="#CF4500" stroke-width="3"/>' +
                '<circle cx="62" cy="94" r="9" fill="#FBF8F4"/><circle cx="62" cy="94" r="6" fill="#15803D"/>' +
                '<circle cx="254" cy="44" r="9" fill="#FBF8F4"/><circle cx="254" cy="44" r="6" fill="#CF4500"/>' +
                '</g>' +
                /* el camión, montado sobre la curva */
                '<g class="es-camion" style="offset-path:path(\'' + RUTA + '\');offset-rotate:0deg">' +
                /* La escala va en el grupo de dentro: el de fuera lo mueve
                   offset-path y ahí un transform propio se pisaría con él. */
                '<g transform="scale(1.18)" stroke="#17130F" stroke-width="1.5" stroke-linejoin="round">' +
                '<path d="M-16 -8 h20 v14 h-20 z" fill="#E05E10"/>' +
                '<path d="M4 -6 h6 l5 6 v6 h-11 z" fill="#B8460A"/>' +
                '<path d="M6 -4 h4 l3 4 h-7 z" fill="#FBD9C4"/>' +
                '<path d="M-12 -4 h12" stroke-width="1.4" opacity="0.5"/>' +
                '<circle cx="-9" cy="7" r="3.4" fill="#17130F"/>' +
                '<circle cx="8" cy="7" r="3.4" fill="#17130F"/>' +
                '<circle cx="-9" cy="7" r="1.2" fill="#FFF6EE" stroke="none"/>' +
                '<circle cx="8" cy="7" r="1.2" fill="#FFF6EE" stroke="none"/>' +
                '</g></g>' +
                /* la chapa del sitio */
                '<g class="es-flota">' +
                '<rect x="18" y="16" width="52" height="19" rx="7" fill="#141413" opacity="0.72"/>' +
                '<text x="44" y="30" text-anchor="middle" font-family="Sofia Sans, Arial" font-size="11" ' +
                'font-weight="700" fill="#F3F0EE">RUTA</text>' +
                '</g>';
        })(),

        /* El carro en el taller, con la llave */
        taller:
            SUELO +
            '<g class="es-flota">' +
            '<path d="M74 88 v-16 q0 -8 10 -10 l14 -16 q3 -4 9 -4 h44 q6 0 9 4 l14 16 q10 2 10 10 v16 z" fill="#3860BE"/>' +
            '<path d="M108 48 h40 l10 14 h-60 z" fill="#CFE0FA"/>' +
            '<rect x="74" y="66" width="110" height="6" rx="3" fill="#2A4E96"/>' +
            '<circle cx="100" cy="90" r="12" fill="#2A2825"/><circle cx="100" cy="90" r="4" fill="#8A857C"/>' +
            '<circle cx="158" cy="90" r="12" fill="#2A2825"/><circle cx="158" cy="90" r="4" fill="#8A857C"/>' +
            '</g>' +
            '<g class="es-gira" style="transform-origin:228px 60px">' +
            '<path d="M212 34 a16 16 0 0 0 12 28 l22 30 a9 9 0 0 0 14 -10 l-22 -30 a16 16 0 0 0 -12 -28 l8 11 -6 10 -12 1 z" fill="#8A857C"/>' +
            '</g>',

        /* Birrete y libro */
        educacion:
            SUELO +
            '<g class="es-flota">' +
            '<path d="M160 30 l72 26 -72 26 -72 -26 z" fill="#3860BE"/>' +
            '<path d="M112 66 v22 q48 22 96 0 v-22 l-48 18 z" fill="#2A4E96"/>' +
            '<path d="M232 56 v30" stroke="#CF4500" stroke-width="4" stroke-linecap="round"/>' +
            '<circle cx="232" cy="90" r="5" fill="#CF4500"/>' +
            '</g>' +
            '<path d="M62 94 h44 v-30 h-44 z M62 94 q-10 -6 0 -12 v-24 q10 -6 44 0 v30" fill="#EFE9E2" stroke="#C9BFB2" stroke-width="3" stroke-linejoin="round"/>',

        /* Cruz de salud y jeringa */
        salud:
            SUELO +
            '<g class="es-flota">' +
            '<path d="M112 34 h34 v26 h26 v34 h-26 v14 h-34 v-14 h-26 v-34 h26 z" fill="#DCE7DA"/>' +
            '<path d="M120 42 h18 v26 h26 v18 h-26 v14 h-18 v-14 h-26 v-18 h26 z" fill="#15803D"/>' +
            '</g>' +
            '<g class="es-entra">' +
            '<path d="M196 92 l44 -44" stroke="#8A857C" stroke-width="12" stroke-linecap="round"/>' +
            '<path d="M232 40 l16 16" stroke="#3D3A34" stroke-width="10" stroke-linecap="round"/>' +
            '<path d="M186 102 l12 -12" stroke="#8A857C" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M206 60 l10 10 M216 50 l10 10" stroke="#EFE9E2" stroke-width="4" stroke-linecap="round"/>' +
            '</g>',

        /* La casa conectada y el recibo */
        servicios:
            SUELO +
            '<path d="M64 96 v-38 l40 -28 40 28 v38 z" fill="#EFE9E2" stroke="#C9BFB2" stroke-width="3"/>' +
            '<path d="M54 60 l50 -34 50 34" fill="none" stroke="#3D3A34" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<rect x="90" y="70" width="28" height="26" rx="3" fill="#CF4500"/>' +
            '<g class="es-onda">' +
            '<path d="M176 74 a10 10 0 0 1 16 0" fill="none" stroke="#3860BE" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M168 62 a22 22 0 0 1 32 0" fill="none" stroke="#3860BE" stroke-width="5" stroke-linecap="round" opacity="0.7"/>' +
            '<path d="M160 50 a34 34 0 0 1 48 0" fill="none" stroke="#3860BE" stroke-width="5" stroke-linecap="round" opacity="0.4"/>' +
            '<circle cx="184" cy="86" r="5" fill="#3860BE"/>' +
            '</g>' +
            '<g class="es-flota">' +
            '<path d="M228 30 h48 v66 l-8 -6 -8 6 -8 -6 -8 6 -8 -6 -8 6 z" fill="#FDF3EC" stroke="#E7C7B0" stroke-width="3"/>' +
            '<path d="M238 46 h28 M238 58 h28 M238 70 h16" stroke="#CF4500" stroke-width="4" stroke-linecap="round"/>' +
            '</g>',

        /* El banco y su moneda */
        banco:
            SUELO +
            '<path d="M76 46 l52 -24 52 24 z" fill="#3D3A34"/>' +
            '<rect x="76" y="46" width="104" height="8" fill="#5A554C"/>' +
            '<rect x="88" y="58" width="12" height="34" fill="#8A857C"/>' +
            '<rect x="122" y="58" width="12" height="34" fill="#8A857C"/>' +
            '<rect x="156" y="58" width="12" height="34" fill="#8A857C"/>' +
            '<rect x="72" y="92" width="112" height="8" rx="3" fill="#3D3A34"/>' +
            '<g class="es-flota">' +
            '<circle cx="230" cy="62" r="28" fill="#F0A05A"/>' +
            '<circle cx="230" cy="62" r="21" fill="#CF4500"/>' +
            '<path d="M238 50 h-12 a6 6 0 0 0 0 12 h8 a6 6 0 0 1 0 12 h-12" fill="none" stroke="#FDF3EC" stroke-width="4" stroke-linecap="round"/>' +
            '</g>',

        /* La papeleta con su sello */
        multa:
            SUELO +
            '<g class="es-flota">' +
            '<path d="M96 22 h122 q8 0 8 8 v72 q0 8 -8 8 h-122 q-8 0 -8 -8 v-72 q0 -8 8 -8 z" fill="#FDF3EC" stroke="#E7C7B0" stroke-width="3"/>' +
            '<path d="M104 42 h72 M104 56 h94 M104 70 h58" stroke="#C9BFB2" stroke-width="5" stroke-linecap="round"/>' +
            '<circle cx="196" cy="80" r="22" fill="none" stroke="#CF4500" stroke-width="4" opacity="0.9"/>' +
            '<path d="M196 68 v14" stroke="#CF4500" stroke-width="5" stroke-linecap="round"/>' +
            '<circle cx="196" cy="90" r="3" fill="#CF4500"/>' +
            '</g>',

        /* El billete que va y vuelve */
        prestamo:
            SUELO +
            '<g class="es-flota">' +
            '<rect x="92" y="44" width="136" height="52" rx="8" fill="#DCE7DA" stroke="#9FC3A8" stroke-width="3"/>' +
            '<circle cx="160" cy="70" r="15" fill="#15803D"/>' +
            '<path d="M166 62 h-8 a5 5 0 0 0 0 10 h4 a5 5 0 0 1 0 10 h-8" fill="none" stroke="#DCE7DA" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="110" cy="58" r="5" fill="#9FC3A8"/><circle cx="210" cy="82" r="5" fill="#9FC3A8"/>' +
            '</g>' +
            '<path class="es-ruta" d="M64 34 q96 -22 192 0" fill="none" stroke="#CF4500" stroke-width="4" stroke-linecap="round" stroke-dasharray="9 8"/>' +
            '<path d="M250 28 l10 6 -10 6" fill="none" stroke="#CF4500" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',

        /* Respaldo para cualquier gasto: la bolsa de la compra */
        compras:
            SUELO +
            '<g class="es-flota">' +
            '<path d="M112 44 h96 l10 54 q1 8 -8 8 h-100 q-9 0 -8 -8 z" fill="#CF4500"/>' +
            '<path d="M136 50 v-8 a24 24 0 0 1 48 0 v8" fill="none" stroke="#9A3A0A" stroke-width="6" stroke-linecap="round"/>' +
            '<path d="M150 68 h20 M144 80 h32" stroke="#FBD9C4" stroke-width="5" stroke-linecap="round"/>' +
            '</g>' +
            '<g class="es-entra">' +
            '<path d="M222 34 h34 v34 l-30 30 -34 -34 z" fill="#F0A05A"/>' +
            '<circle cx="240" cy="52" r="7" fill="#FDF3EC"/>' +
            '</g>',

        /* Los ingresos: la alcancía */
        ingreso:
            SUELO +
            '<g class="es-flota">' +
            '<path d="M96 62 q0 -26 40 -26 h30 q40 0 40 30 q0 14 -12 24 v14 h-18 v-8 q-10 2 -20 2 h-10 v6 h-18 v-10 q-16 -8 -22 -20 h-10 q-8 0 -8 -8 v-8 z" fill="#3860BE"/>' +
            '<circle cx="188" cy="62" r="5" fill="#EAF0FC"/>' +
            '<path d="M132 44 h34" stroke="#2A4E96" stroke-width="6" stroke-linecap="round"/>' +
            '<path d="M206 46 q14 -4 16 -14" fill="none" stroke="#3860BE" stroke-width="6" stroke-linecap="round"/>' +
            '</g>' +
            '<g class="es-cae">' +
            '<circle cx="150" cy="24" r="14" fill="#F0A05A"/>' +
            '<path d="M156 16 h-8 a4 4 0 0 0 0 9 h4 a4 4 0 0 1 0 9 h-8" fill="none" stroke="#FDF3EC" stroke-width="3" stroke-linecap="round"/>' +
            '</g>'
    };

    /* Cada familia con su fondo, para que la escena no flote sobre la nada */
    var FONDOS = {
        combustible: ['#FFF0E4', '#FBDCC6'],
        comida: ['#F5813C', '#CF4F06'],
        viaje: ['#F6F1EA', '#E7DFD3'],
        taller: ['#EFF4FF', '#DAE4F8'],
        educacion: ['#F1F4FF', '#DEE5FA'],
        salud: ['#EFF8F1', '#D9EDDF'],
        servicios: ['#F4F2EE', '#E4DED4'],
        banco: ['#F5F3EF', '#E5DFD6'],
        multa: ['#FFF3EC', '#FBDDCB'],
        prestamo: ['#F0F7F1', '#DAEBDF'],
        compras: ['#FFF2E9', '#FBDCC9'],
        ingreso: ['#F0F5FF', '#DCE6FA']
    };

    /* Devuelve el SVG de la escena que le toca a este movimiento.
       tipo: 'deposit' | 'expense' */
    window.escenaMovimiento = function (tipo, rubro, descripcion) {
        var id = tipo === 'deposit'
            ? 'ingreso'
            : (familia(rubro) || familia(descripcion) || 'compras');

        var f = FONDOS[id] || FONDOS.compras;
        var g = 'esg' + id;

        return '<svg class="es es--' + id + '" viewBox="0 0 320 130" role="img" aria-label="Ilustración del movimiento">' +
            '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0.3" y2="1">' +
            '<stop offset="0" stop-color="' + f[0] + '"/><stop offset="1" stop-color="' + f[1] + '"/>' +
            '</linearGradient></defs>' +
            '<rect width="320" height="130" fill="url(#' + g + ')"/>' +
            ESCENAS[id] +
            '</svg>';
    };

    /* Para poder mirarlas todas de un vistazo al añadir una nueva */
    window.escenaMovimiento.familias = Object.keys(ESCENAS);
})();
