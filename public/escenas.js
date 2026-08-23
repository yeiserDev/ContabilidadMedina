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

        /* Camión cisterna repostando en el surtidor */
        combustible:
            SUELO +
            '<g class="es-entra">' +
            '<rect x="40" y="44" width="34" height="54" rx="9" fill="#3D3A34"/>' +
            '<rect x="46" y="52" width="22" height="15" rx="3" fill="#5FCB89"/>' +
            '<rect x="50" y="74" width="14" height="4" rx="2" fill="#8A857C"/>' +
            '<path d="M74 66 C 94 66 92 56 104 56" stroke="#3D3A34" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '</g>' +
            '<g class="es-flota">' +
            '<rect x="150" y="50" width="118" height="36" rx="18" fill="#CF4500"/>' +
            '<rect x="176" y="50" width="8" height="36" fill="#9A3A0A" opacity="0.5"/>' +
            '<rect x="232" y="50" width="8" height="36" fill="#9A3A0A" opacity="0.5"/>' +
            '<path d="M104 56 h44 v30 h-52 v-20 z" fill="#9A3A0A"/>' +
            '<rect x="108" y="61" width="21" height="14" rx="3" fill="#FBD9C4"/>' +
            '<rect x="96" y="86" width="172" height="6" rx="3" fill="#2A2825"/>' +
            '<circle cx="120" cy="96" r="11" fill="#2A2825"/><circle cx="120" cy="96" r="4" fill="#8A857C"/>' +
            '<circle cx="200" cy="96" r="11" fill="#2A2825"/><circle cx="200" cy="96" r="4" fill="#8A857C"/>' +
            '<circle cx="240" cy="96" r="11" fill="#2A2825"/><circle cx="240" cy="96" r="4" fill="#8A857C"/>' +
            '</g>',

        /* El motorizado del reparto, con la caja detrás */
        comida:
            SUELO +
            '<g class="es-flota">' +
            /* caja del reparto */
            '<rect x="86" y="38" width="48" height="42" rx="8" fill="#CF4500"/>' +
            '<rect x="99" y="50" width="22" height="19" rx="4" fill="#FBD9C4"/>' +
            '<path d="M105 55 v9 M110 55 v9 M115 55 v9" stroke="#CF4500" stroke-width="2" stroke-linecap="round"/>' +
            /* chasis, asiento y manillar */
            '<path d="M128 86 h68" stroke="#3D3A34" stroke-width="9" stroke-linecap="round"/>' +
            '<path d="M200 86 l14 -26" stroke="#3D3A34" stroke-width="8" stroke-linecap="round"/>' +
            '<path d="M208 58 h20" stroke="#2A2825" stroke-width="6" stroke-linecap="round"/>' +
            '<rect x="136" y="66" width="38" height="11" rx="5" fill="#2A2825"/>' +
            /* piloto */
            '<path d="M170 54 q12 -8 22 2 l8 22 h-32 z" fill="#3860BE"/>' +
            '<path d="M192 60 l24 0" stroke="#3860BE" stroke-width="8" stroke-linecap="round"/>' +
            '<path d="M176 78 l-4 12" stroke="#2A4E96" stroke-width="8" stroke-linecap="round"/>' +
            '<circle cx="180" cy="38" r="14" fill="#3D3A34"/>' +
            '<path d="M167 38 a13 13 0 0 1 26 0 z" fill="#CF4500"/>' +
            '<path d="M192 36 l8 4 -8 5 z" fill="#8A857C"/>' +
            '</g>' +
            '<circle class="es-rueda" cx="128" cy="92" r="16" fill="none" stroke="#2A2825" stroke-width="7" stroke-dasharray="10 8"/>' +
            '<circle class="es-rueda" cx="224" cy="92" r="16" fill="none" stroke="#2A2825" stroke-width="7" stroke-dasharray="10 8"/>',

        /* La ruta marcada sobre el mapa, de origen a destino */
        viaje:
            '<rect x="30" y="18" width="260" height="94" rx="14" fill="#EFE9E2"/>' +
            '<path d="M30 78 h260 M118 18 v94 M212 18 v94" stroke="#DDD3C7" stroke-width="4"/>' +
            '<rect x="140" y="30" width="46" height="30" rx="6" fill="#DCE7DA"/>' +
            '<rect x="226" y="86" width="48" height="20" rx="6" fill="#DCE7DA"/>' +
            '<path class="es-ruta" d="M74 92 C 74 58 128 66 132 44 C 136 24 220 30 244 56" ' +
            'fill="none" stroke="#CF4500" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 9"/>' +
            '<g class="es-entra">' +
            '<path d="M74 96 c-9 -12 -13 -18 -13 -24 a13 13 0 0 1 26 0 c0 6 -4 12 -13 24 z" fill="#3860BE"/>' +
            '<circle cx="74" cy="72" r="5" fill="#EFE9E2"/>' +
            '<path d="M244 60 c-9 -12 -13 -18 -13 -24 a13 13 0 0 1 26 0 c0 6 -4 12 -13 24 z" fill="#CF4500"/>' +
            '<circle cx="244" cy="36" r="5" fill="#FDF3EC"/>' +
            '</g>',

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
        comida: ['#FFF1E8', '#FAD9C8'],
        viaje: ['#F1F5FF', '#DFE7FA'],
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
