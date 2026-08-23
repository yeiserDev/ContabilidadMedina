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

        /* El camión en el taller: la nave con su pared de herramientas, el
           carro de cajones, el gato levantando el morro y la llave apretando.
           Antes era un coche y una llave sueltos sobre el fondo; esto es un
           sitio, que es lo que cuenta el gasto. */
        taller:
            SUELO +
            /* ---- la nave ---- */
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            '<path d="M196 108 V26 q0 -6 6 -6 h104 q6 0 6 6 v82 z" fill="#DDE5F2"/>' +
            '<path d="M196 40 h116" stroke-width="2.6"/>' +
            /* panel de herramientas */
            '<path d="M208 48 h52 v34 h-52 z" fill="#C7D3E6" stroke-width="2.4"/>' +
            '<path d="M216 56 l10 10 M226 56 l-10 10" stroke-width="2.6"/>' +
            '<path d="M240 54 v14 M236 68 h8 v8 h-8 z" stroke-width="2.4" fill="#8A857C"/>' +
            '<path d="M252 54 a5 5 0 1 1 -0.1 0 z" fill="#8A857C" stroke-width="2.4"/>' +
            '<path d="M252 62 v14" stroke-width="2.6"/>' +
            /* carro de cajones */
            '<path d="M270 66 h34 v42 h-34 z" fill="#3860BE"/>' +
            '<path d="M270 80 h34 M270 94 h34" stroke-width="2.4"/>' +
            '<path d="M280 73 h14 M280 87 h14 M280 101 h14" stroke-width="2.6" stroke="#CFE0FA"/>' +
            '</g>' +

            /* ---- el camión, con el morro en alto ----
               La escala va fuera: el grupo de dentro lo mece la animación y
               ahí un transform propio se pisaría con ella. */
            '<g transform="translate(-6 4) scale(0.9)">' +
            '<g class="es-alza" stroke="#17130F" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">' +
            '<path d="M28 96 h140 v8 h-146 z" fill="#2A2825"/>' +
            '<path d="M24 92 V62 q0 -6 6 -6 h34 v36 z" fill="#B8460A"/>' +
            '<path d="M30 64 h26 v18 h-30 z" fill="#FBD9C4"/>' +
            '<path d="M64 56 h96 q6 0 6 6 v30 h-102 z" fill="#E05E10"/>' +
            '<path d="M78 56 v36 M120 56 v36" stroke-width="2.4" opacity="0.5"/>' +
            /* capó levantado sobre el morro */
            '<path d="M26 60 L 14 36 l 28 -6 l 18 26 z" fill="#C9520C"/>' +
            '<circle cx="52" cy="100" r="14" fill="#17130F"/>' +
            '<circle cx="150" cy="100" r="14" fill="#17130F"/>' +
            '<circle cx="52" cy="100" r="6.5" fill="#FFF6EE"/>' +
            '<circle cx="150" cy="100" r="6.5" fill="#FFF6EE"/>' +
            '</g>' +

            /* ---- el gato que lo sostiene ---- */
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            '<path d="M74 108 h30 l-6 -10 h-18 z" fill="#8A857C"/>' +
            '<path d="M84 98 h10 v-8 h-10 z" fill="#8A857C" stroke-width="2.4"/>' +
            '</g>' +
            '</g>' +

            /* ---- la llave apretando ---- */
            '<g class="es-llave" stroke="#17130F" stroke-width="3" stroke-linejoin="round" ' +
            'style="transform-box:fill-box;transform-origin:74% 78%">' +
            '<path d="M150 24 a13 13 0 0 0 10 23 l20 26 a8 8 0 0 0 12 -9 l-20 -26 a13 13 0 0 0 -10 -23 l7 9 -5 9 -10 1 z" ' +
            'fill="#B0AAA0"/>' +
            '</g>',

        /* El aula: la escuela al fondo y el pupitre con los libros delante */
        educacion:
            SUELO +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* fachada */
            '<path d="M198 108 V52 h108 v56 z" fill="#FFF3E6"/>' +
            '<path d="M190 52 L 252 24 l 62 28 z" fill="#3860BE"/>' +
            '<path d="M240 74 h28 v34 h-28 z" fill="#8A4A20"/>' +
            '<circle cx="262" cy="92" r="2" fill="#FFF3E6" stroke="none"/>' +
            '<path d="M212 66 h18 v16 h-18 z M278 66 h18 v16 h-18 z" fill="#CBDCE9" stroke-width="2.4"/>' +
            '<path d="M252 24 v-14" stroke-width="2.6"/>' +
            '<path class="es-bandera" d="M252 10 h20 l-5 6 5 6 h-20 z" fill="#CF4500" stroke-width="2.4" ' +
            'style="transform-box:fill-box;transform-origin:left center"/>' +
            /* pupitre */
            '<path d="M40 108 V78 h96 v30 z" fill="#C8A87C"/>' +
            '<path d="M36 74 h104 v8 h-104 z" fill="#A9855A"/>' +
            /* libros */
            '<path d="M52 74 h58 v-12 h-58 z" fill="#3860BE"/>' +
            '<path d="M58 62 h58 v-12 h-58 z" fill="#15803D"/>' +
            '<path d="M50 50 h58 v-12 h-58 z" fill="#CF4500"/>' +
            '</g>' +
            /* birrete */
            '<g class="es-flota" stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            '<path d="M78 38 l38 -14 -38 -14 -38 14 z" fill="#2A3D6B"/>' +
            '<path d="M62 30 v10 q16 8 32 0 v-10" fill="#3860BE"/>' +
            '</g>' +
            '<g class="es-borla" style="transform-box:fill-box;transform-origin:top center">' +
            '<path d="M116 24 v14" stroke="#17130F" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="116" cy="42" r="5" fill="#CF4500" stroke="#17130F" stroke-width="2.6"/>' +
            '</g>',

        /* La farmacia: el cartel de la cruz y el botiquín abierto */
        salud:
            SUELO +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* local */
            '<path d="M188 108 V44 h124 v64 z" fill="#EFF6F1"/>' +
            '<path d="M182 44 h136 v-8 q0 -6 -6 -6 h-124 q-6 0 -6 6 z" fill="#15803D"/>' +
            '<path d="M242 68 h30 v40 h-30 z" fill="#9FC3A8"/>' +
            '<path d="M198 60 h30 v24 h-30 z" fill="#CBDCE9" stroke-width="2.4"/>' +
            '<path d="M286 60 h18 v24 h-18 z" fill="#CBDCE9" stroke-width="2.4"/>' +
            /* cartel de la cruz */
            '<path d="M158 22 h6 v-6 h12 v6 h6 v12 h-6 v6 h-12 v-6 h-6 z" fill="#15803D" class="es-cruz" ' +
            'style="transform-box:fill-box;transform-origin:center"/>' +
            '<path d="M170 40 v10" stroke-width="2.6"/>' +
            /* botiquín */
            '<path d="M30 108 V70 h84 v38 z" fill="#FFF6EE"/>' +
            '<path d="M26 62 h92 v10 h-92 z" fill="#DCE7DA"/>' +
            '<path d="M62 62 v-8 q0 -4 4 -4 h12 q4 0 4 4 v8" fill="none"/>' +
            '<path d="M64 84 h16 v-10 h12 v16 h-12 v10 h-16 v-10 h-12 v-16 h12 z" fill="#15803D" stroke-width="2.6"/>' +
            '</g>' +
            /* jeringa */
            '<g class="es-jeringa">' +
            '<g stroke="#17130F" stroke-width="2.8" stroke-linejoin="round">' +
            '<path d="M120 34 h40 v14 h-40 z" fill="#FFF6EE"/>' +
            '<path d="M126 36 h20 v10 h-20 z" fill="#9FC3A8" stroke="none"/>' +
            '<path d="M160 39 h12" stroke-width="4" stroke-linecap="round"/>' +
            '<path d="M112 30 h8 v22 h-8 z" fill="#8A857C"/>' +
            '<path d="M104 36 h8 v10 h-8 z" fill="#8A857C"/>' +
            '</g></g>',

        /* La casa conectada: el contador en la pared y el recibo en el buzón */
        servicios:
            SUELO +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* casa */
            '<path d="M46 108 V58 h92 v50 z" fill="#FFF3E6"/>' +
            '<path d="M34 58 L 92 22 l 58 36 z" fill="#B8460A"/>' +
            '<path d="M78 108 V80 h28 v28 z" fill="#8A4A20"/>' +
            '<circle cx="100" cy="94" r="2" fill="#FFF3E6" stroke="none"/>' +
            '<path d="M54 66 h18 v16 h-18 z" fill="#F7C24A" stroke-width="2.4"/>' +
            /* contador de luz */
            '<path d="M116 62 h20 v22 h-20 z" fill="#DDE5F2" stroke-width="2.4"/>' +
            '<circle cx="126" cy="70" r="5" fill="#FFF6EE" stroke-width="2.2"/>' +
            '<path class="es-aguja" d="M126 70 v-4" stroke-width="2.2" stroke-linecap="round" ' +
            'style="transform-box:fill-box;transform-origin:bottom center"/>' +
            '<path d="M120 78 h12" stroke-width="2.2"/>' +
            /* poste y antena */
            '<path d="M92 22 v-8" stroke-width="2.6"/>' +
            '<circle cx="92" cy="12" r="3.5" fill="#3860BE" stroke-width="2.4"/>' +
            '</g>' +
            /* ondas */
            '<g class="es-onda" fill="none" stroke="#3860BE" stroke-linecap="round">' +
            '<path d="M104 14 a16 16 0 0 1 0 -6" stroke-width="4"/>' +
            '<path d="M114 20 a26 26 0 0 0 0 -18" stroke-width="4" opacity="0.65"/>' +
            '<path d="M124 26 a36 36 0 0 0 0 -30" stroke-width="4" opacity="0.4"/>' +
            '</g>' +
            /* buzón con el recibo asomando */
            '<g class="es-flota" stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            '<path d="M226 46 h56 v14 h-56 z" fill="#FDF3EC"/>' +
            '<path d="M232 40 h44 v6 h-44 z" fill="#FDF3EC"/>' +
            '<path d="M238 46 h32 M238 52 h20" stroke="#CF4500" stroke-width="2.6" stroke-linecap="round"/>' +
            '<path d="M212 60 h84 v46 q0 4 -4 4 h-76 q-4 0 -4 -4 z" fill="#3860BE"/>' +
            '<path d="M228 74 h52 v12 h-52 z" fill="#2A4E96" stroke-width="2.4"/>' +
            '<path d="M254 110 v-10" stroke-width="2.6"/>' +
            '</g>',

        /* El banco: la fachada y el cajero soltando un billete */
        banco:
            SUELO +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* fachada */
            '<path d="M22 46 L 92 18 l 70 28 z" fill="#3D3A34"/>' +
            '<path d="M26 46 h132 v8 h-132 z" fill="#5A554C"/>' +
            '<path d="M42 54 h14 v46 h-14 z M78 54 h14 v46 h-14 z M114 54 h14 v46 h-14 z" fill="#EFE9E2"/>' +
            '<path d="M18 100 h148 v8 h-148 z" fill="#3D3A34"/>' +
            '<path d="M84 30 h16 v10 h-16 z" fill="#F0A05A" stroke-width="2.4"/>' +
            /* cajero */
            '<path d="M214 108 V38 q0 -6 6 -6 h64 q6 0 6 6 v70 z" fill="#DDE5F2"/>' +
            '<path d="M228 48 h48 v24 h-48 z" fill="#2A4E96" stroke-width="2.4"/>' +
            '<path d="M234 56 h24 M234 64 h32" stroke="#9DB8F7" stroke-width="2.6" stroke-linecap="round"/>' +
            '<path d="M232 82 h26" stroke-width="4" stroke-linecap="round"/>' +
            '<circle cx="278" cy="84" r="5" fill="#15803D" stroke-width="2.4"/>' +
            '</g>' +
            /* el billete que sale por la ranura */
            '<g class="es-billete">' +
            '<g stroke="#17130F" stroke-width="2.6" stroke-linejoin="round">' +
            '<path d="M226 88 h40 v20 h-40 z" fill="#DCE7DA"/>' +
            '<circle cx="246" cy="98" r="6" fill="#15803D"/>' +
            '</g></g>',

        /* La papeleta en el parabrisas, con su cono al lado */
        multa:
            SUELO +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* señal de prohibido */
            '<path d="M266 108 V52" stroke-width="5"/>' +
            '<circle cx="266" cy="38" r="18" fill="#FDF3EC"/>' +
            '<circle cx="266" cy="38" r="13" fill="none" stroke="#CF4500" stroke-width="5"/>' +
            '<path d="M256 48 L 276 28" stroke="#CF4500" stroke-width="5" stroke-linecap="round"/>' +
            /* coche */
            '<path d="M34 96 V78 q0 -6 8 -8 l16 -18 q3 -4 9 -4 h44 q6 0 9 4 l16 18 q8 2 8 8 v18 z" fill="#3860BE"/>' +
            '<path d="M66 52 h38 l10 16 h-58 z" fill="#CFE0FA"/>' +
            '<path d="M34 76 h110" stroke-width="2.6" opacity="0.5"/>' +
            '<circle cx="58" cy="98" r="12" fill="#17130F"/>' +
            '<circle cx="120" cy="98" r="12" fill="#17130F"/>' +
            '<circle cx="58" cy="98" r="5" fill="#FFF6EE" stroke-width="2.4"/>' +
            '<circle cx="120" cy="98" r="5" fill="#FFF6EE" stroke-width="2.4"/>' +
            /* cono */
            '<path d="M170 104 l14 -40 h8 l14 40 z" fill="#F0783A"/>' +
            '<path d="M176 88 h24 M172 96 h32" stroke="#FFF6EE" stroke-width="4"/>' +
            '<path d="M164 104 h48 v6 h-48 z" fill="#B8460A"/>' +
            '</g>' +
            /* la papeleta, sujeta en el limpiaparabrisas */
            '<g class="es-papel" style="transform-box:fill-box;transform-origin:bottom left">' +
            '<g stroke="#17130F" stroke-width="2.6" stroke-linejoin="round">' +
            '<path d="M78 30 h44 q3 0 3 3 v30 q0 3 -3 3 h-44 q-3 0 -3 -3 v-30 q0 -3 3 -3 z" fill="#FDF3EC"/>' +
            '<path d="M86 40 h28 M86 48 h20 M86 56 h24" stroke="#CF4500" stroke-width="2.6" stroke-linecap="round"/>' +
            '</g></g>',

        /* El billete que pasa de una mano a la otra */
        prestamo:
            SUELO +
            '<defs><linearGradient id="esArcoColor" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#9FC3A8"/><stop offset="1" stop-color="#15803D"/>' +
            '</linearGradient></defs>' +
            /* el arco del trayecto */
            '<path d="M84 66 C 122 18 198 18 236 66" fill="none" stroke="url(#esArcoColor)" ' +
            'stroke-width="4" stroke-linecap="round" stroke-dasharray="9 8"/>' +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* mano que da */
            '<path d="M22 108 V88 q0 -8 10 -8 h34 q10 0 10 8 v20 z" fill="#F6C9A6"/>' +
            '<path d="M40 80 v-10 q0 -5 6 -5 t6 5 v10" fill="#F6C9A6"/>' +
            '<path d="M52 80 v-14 q0 -5 6 -5 t6 5 v14" fill="#F6C9A6"/>' +
            /* mano que recibe */
            '<path d="M244 108 V88 q0 -8 10 -8 h34 q10 0 10 8 v20 z" fill="#E8B48A"/>' +
            '<path d="M262 80 v-14 q0 -5 6 -5 t6 5 v14" fill="#E8B48A"/>' +
            '<path d="M274 80 v-10 q0 -5 6 -5 t6 5 v10" fill="#E8B48A"/>' +
            '</g>' +
            /* el billete recorriendo el arco */
            '<g class="es-viaja" style="offset-path:path(\'M84 66 C 122 18 198 18 236 66\');offset-rotate:0deg">' +
            '<g stroke="#17130F" stroke-width="2.4" stroke-linejoin="round">' +
            '<path d="M-22 -11 h44 v22 h-44 z" fill="#DCE7DA"/>' +
            '<circle cx="0" cy="0" r="7" fill="#15803D"/>' +
            '<path d="M3 -4 h-4 a3 3 0 0 0 0 5 h2 a3 3 0 0 1 0 5 h-4" fill="none" stroke="#DCE7DA" stroke-width="1.8" stroke-linecap="round"/>' +
            '</g></g>',

        /* La caja registradora soltando el ticket, con la bolsa al lado */
        compras:
            SUELO +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* mostrador */
            '<path d="M14 100 h292 v10 h-292 z" fill="#C8A87C"/>' +
            /* bolsa */
            '<path d="M40 100 V56 h60 v44 z" fill="#CF4500"/>' +
            '<path d="M56 56 v-8 a14 14 0 0 1 28 0 v8" fill="none" stroke-width="5"/>' +
            '<path d="M56 74 h28" stroke="#FBD9C4" stroke-width="5" stroke-linecap="round"/>' +
            /* registradora */
            '<path d="M176 100 V64 q0 -6 6 -6 h94 q6 0 6 6 v36 z" fill="#3860BE"/>' +
            '<path d="M190 70 h44 v16 h-44 z" fill="#CFE0FA" stroke-width="2.4"/>' +
            '<path d="M248 74 h8 v8 h-8 z M262 74 h8 v8 h-8 z M248 88 h8 v8 h-8 z M262 88 h8 v8 h-8 z" ' +
            'fill="#2A4E96" stroke-width="2.2"/>' +
            '<path d="M186 58 v-10 h58 v10" fill="#2A4E96"/>' +
            '</g>' +
            /* el ticket saliendo */
            '<g class="es-ticket" style="transform-box:fill-box;transform-origin:bottom center">' +
            '<g stroke="#17130F" stroke-width="2.6" stroke-linejoin="round">' +
            '<path d="M196 46 h40 v-38 h-40 z" fill="#FDF3EC"/>' +
            '<path d="M204 18 h24 M204 28 h16 M204 38 h20" stroke="#CF4500" stroke-width="2.4" stroke-linecap="round"/>' +
            '</g></g>',

        /* La alcancía en la mesa, con la moneda cayendo */
        ingreso:
            SUELO +
            '<g stroke="#17130F" stroke-width="3" stroke-linejoin="round">' +
            /* alcancía */
            '<path d="M92 66 q0 -26 42 -26 h30 q42 0 42 30 q0 15 -13 25 v13 h-19 v-8 q-10 2 -20 2 h-10 v6 h-19 v-11 ' +
            'q-16 -8 -22 -20 h-10 q-8 0 -8 -8 v-3 z" fill="#3860BE"/>' +
            '<circle cx="190" cy="64" r="4.5" fill="#EAF0FC" stroke-width="2.4"/>' +
            '<path d="M132 46 h34" stroke-width="6" stroke-linecap="round"/>' +
            '<path d="M206 50 q14 -4 16 -14" fill="none" stroke-width="6" stroke-linecap="round"/>' +
            /* torre de monedas */
            '<path d="M236 108 h44 v-8 h-44 z M236 100 h44 v-8 h-44 z M236 92 h44 v-8 h-44 z" fill="#F0A05A"/>' +
            '</g>' +
            /* la moneda que entra */
            '<g class="es-cae">' +
            '<g stroke="#17130F" stroke-width="2.6">' +
            '<circle cx="150" cy="20" r="13" fill="#F0A05A"/>' +
            '<path d="M156 12 h-8 a4 4 0 0 0 0 9 h4 a4 4 0 0 1 0 9 h-8" fill="none" stroke="#FDF3EC" stroke-width="2.6" stroke-linecap="round"/>' +
            '</g></g>'
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
