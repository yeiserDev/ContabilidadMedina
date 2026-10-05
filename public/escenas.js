// ============================================================
// ESCENAS DE MOVIMIENTO — Ilustraciones 2.5D Diorama de Alta Gama
// Autogenerado para coherencia visual absoluta, máxima fidelidad y velocidad.
// ============================================================
(function () {
    'use strict';

    var FAMILIAS = {
        "combustible": {
                "color": "#EA580C",
                "claves": [
                        "combustible",
                        "gasolina",
                        "petroleo",
                        "petróleo",
                        "diesel",
                        "gnv",
                        "glp",
                        "grifo",
                        "repsol",
                        "primax",
                        "pecsa",
                        "turing",
                        "tanqueo",
                        "tanque"
                ]
        },
        "comida": {
                "color": "#E11D48",
                "claves": [
                        "almuerzo",
                        "desayuno",
                        "cena",
                        "comida",
                        "menu",
                        "menú",
                        "restaurante",
                        "chifa",
                        "polleria",
                        "pollería",
                        "pollo",
                        "kfc",
                        "kentucky",
                        "bembos",
                        "mcdonald",
                        "burger",
                        "pizza",
                        "hamburguesa",
                        "chifa",
                        "ceviche",
                        "cebiche",
                        "tacos",
                        "snack",
                        "cafe",
                        "café",
                        "starbucks",
                        "gaseosa",
                        "postre",
                        "panaderia",
                        "panadería",
                        "comi",
                        "comer"
                ]
        },
        "viaje": {
                "color": "#0284C7",
                "claves": [
                        "viaje",
                        "pasaje",
                        "pasajes",
                        "peaje",
                        "peajes",
                        "ruta",
                        "hotel",
                        "hospedaje",
                        "transporte",
                        "bus",
                        "vuelo",
                        "aeropuerto",
                        "terminal",
                        "uber",
                        "taxi",
                        "indrive",
                        "didi",
                        "colectivo",
                        "viatico",
                        "viático",
                        "flete",
                        "mudanza"
                ]
        },
        "taller": {
                "color": "#2563EB",
                "claves": [
                        "taller",
                        "mecanico",
                        "mecánico",
                        "repuesto",
                        "repuestos",
                        "llanta",
                        "llantas",
                        "aceite",
                        "bateria",
                        "batería",
                        "freno",
                        "frenos",
                        "lavado",
                        "carwash",
                        "mantenimiento",
                        "afinamiento",
                        "polarizado",
                        "luna",
                        "lunas",
                        "parabrisas",
                        "faros",
                        "pintura",
                        "planchado",
                        "revision",
                        "revisión",
                        "soat",
                        "auto",
                        "camion",
                        "camión",
                        "moto"
                ]
        },
        "educacion": {
                "color": "#7C3AED",
                "claves": [
                        "universidad",
                        "pension",
                        "pensión",
                        "matricula",
                        "matrícula",
                        "colegio",
                        "instituto",
                        "nayli",
                        "curso",
                        "capacitacion",
                        "capacitación",
                        "taller educativo",
                        "libro",
                        "libros",
                        "cuaderno",
                        "utiles",
                        "útiles",
                        "estudio",
                        "estudios",
                        "clase",
                        "diplomado",
                        "examen",
                        "mensualidad",
                        "nay"
                ]
        },
        "salud": {
                "color": "#059669",
                "claves": [
                        "salud",
                        "farmacia",
                        "medicina",
                        "medicinas",
                        "pastilla",
                        "pastillas",
                        "inkafarma",
                        "mifarma",
                        "botica",
                        "doctor",
                        "medico",
                        "médico",
                        "clinica",
                        "clínica",
                        "hospital",
                        "consulta",
                        "analisis",
                        "análisis",
                        "receta",
                        "dentista",
                        "odontologia",
                        "odontología",
                        "lentes",
                        "optica",
                        "óptica"
                ]
        },
        "servicios": {
                "color": "#D97706",
                "claves": [
                        "luz",
                        "agua",
                        "internet",
                        "telefono",
                        "teléfono",
                        "celular",
                        "recibo",
                        "enel",
                        "sedapal",
                        "claro",
                        "movistar",
                        "entel",
                        "bitel",
                        "gas",
                        "calidda",
                        "cálidda",
                        "cable",
                        "netflix",
                        "spotify",
                        "servicios",
                        "alquiler",
                        "departamento",
                        "local"
                ]
        },
        "banco": {
                "color": "#4F46E5",
                "claves": [
                        "banco",
                        "bcp",
                        "bbva",
                        "interbank",
                        "scotiabank",
                        "comision",
                        "comisión",
                        "tarjeta",
                        "interes",
                        "interés",
                        "seguro",
                        "afp",
                        "itf",
                        "mantenimiento cuenta",
                        "abono",
                        "transferencia bancaria"
                ]
        },
        "multa": {
                "color": "#DC2626",
                "claves": [
                        "multa",
                        "papeleta",
                        "sat",
                        "sutran",
                        "infraccion",
                        "infracción",
                        "coima",
                        "deposito municipal",
                        "depósito municipal",
                        "tramite",
                        "trámite",
                        "notaria",
                        "notaría",
                        "sunarp",
                        "licencia",
                        "brevete"
                ]
        },
        "prestamo": {
                "color": "#0D9488",
                "claves": [
                        "prestamo",
                        "préstamo",
                        "prestado",
                        "devolucion",
                        "devolución",
                        "deuda",
                        "pago a",
                        "adelanto",
                        "presté",
                        "preste",
                        "devolucion dinero prestado"
                ]
        },
        "compras": {
                "color": "#EA580C",
                "claves": [
                        "compra",
                        "compras",
                        "supermercado",
                        "metro",
                        "plaza vea",
                        "tottus",
                        "wong",
                        "mercado",
                        "tienda",
                        "bodega",
                        "ropa",
                        "zapatillas",
                        "ferreteria",
                        "ferretería",
                        "sodimac",
                        "promart",
                        "maestro"
                ]
        },
        "ingreso": {
                "color": "#16A34A",
                "claves": [
                        "ingreso",
                        "sueldo",
                        "deposito",
                        "depósito",
                        "cobro",
                        "pago recibido",
                        "adelanto cobrado",
                        "venta",
                        "ganancia",
                        "honorarios"
                ]
        }
};

    function normalize(str) {
        return (str || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function familia(texto) {
        var n = normalize(texto);
        if (!n) return null;
        for (var k in FAMILIAS) {
            var claves = FAMILIAS[k].claves;
            for (var i = 0; i < claves.length; i++) {
                var c = normalize(claves[i]);
                if (n.indexOf(c) !== -1) return k;
            }
        }
        return null;
    }

    var ESCENAS = {
        taller: "<svg class=\"es es--taller\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Taller y Polarizado Automotriz\"><defs><clipPath id=\"esTalClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esTalWall\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#0F172A\"/><stop offset=\"100%\" stop-color=\"#1E293B\"/></linearGradient><linearGradient id=\"esCarGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#38BDF8\"/><stop offset=\"35%\" stop-color=\"#2563EB\"/><stop offset=\"100%\" stop-color=\"#1E40AF\"/></linearGradient><linearGradient id=\"esTintGlass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#38BDF8\" stop-opacity=\"0.85\"/><stop offset=\"45%\" stop-color=\"#0F172A\" stop-opacity=\"0.95\"/><stop offset=\"100%\" stop-color=\"#020617\"/></linearGradient><linearGradient id=\"esToolChest\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#EF4444\"/><stop offset=\"100%\" stop-color=\"#991B1B\"/></linearGradient><filter id=\"esTalShadow\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"130%\"><feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"3.5\" flood-color=\"#020617\" flood-opacity=\"0.25\"/></filter></defs><g clip-path=\"url(#esTalClip)\"><!-- Pared del Taller --><rect width=\"340\" height=\"148\" fill=\"url(#esTalWall)\"/><!-- Piso del taller con línea de seguridad --><rect x=\"0\" y=\"100\" width=\"340\" height=\"48\" fill=\"#334155\"/><line x1=\"0\" y1=\"102\" x2=\"340\" y2=\"102\" stroke=\"#F59E0B\" stroke-width=\"3\" stroke-dasharray=\"16 10\"/><!-- Fondo: Panel perforado de herramientas (Pegboard) --><g filter=\"url(#esTalShadow)\"><rect x=\"200\" y=\"14\" width=\"124\" height=\"74\" rx=\"6\" fill=\"#1E293B\" stroke=\"#475569\" stroke-width=\"1.5\"/><!-- Ganchos y herramientas metálicas --><line x1=\"216\" y1=\"26\" x2=\"216\" y2=\"56\" stroke=\"#94A3B8\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"216\" cy=\"24\" r=\"3.5\" fill=\"#64748B\"/><line x1=\"234\" y1=\"22\" x2=\"234\" y2=\"60\" stroke=\"#CBD5E1\" stroke-width=\"4.5\" stroke-linecap=\"round\"/><polygon points=\"231,20 237,20 236,25 232,25\" fill=\"#94A3B8\"/><line x1=\"252\" y1=\"28\" x2=\"252\" y2=\"52\" stroke=\"#94A3B8\" stroke-width=\"3.5\" stroke-linecap=\"round\"/><!-- Taladro inalámbrico en pared --><path d=\"M 276 26 h 16 l 3 12 h -8 l -2 12 h -7 Z\" fill=\"#2563EB\" stroke=\"#0F172A\" stroke-width=\"1.2\"/><rect x=\"295\" y=\"30\" width=\"8\" height=\"4\" rx=\"1\" fill=\"#94A3B8\"/><!-- Gabinete de herramientas móvil estilo Snap-On --><rect x=\"250\" y=\"62\" width=\"66\" height=\"52\" rx=\"4\" fill=\"url(#esToolChest)\" stroke=\"#0F172A\" stroke-width=\"1.5\"/><rect x=\"254\" y=\"68\" width=\"58\" height=\"7\" rx=\"1.5\" fill=\"#1E293B\"/><line x1=\"264\" y1=\"71.5\" x2=\"302\" y2=\"71.5\" stroke=\"#E2E8F0\" stroke-width=\"2\" stroke-linecap=\"round\"/><rect x=\"254\" y=\"78\" width=\"58\" height=\"7\" rx=\"1.5\" fill=\"#1E293B\"/><line x1=\"264\" y1=\"81.5\" x2=\"302\" y2=\"81.5\" stroke=\"#E2E8F0\" stroke-width=\"2\" stroke-linecap=\"round\"/><rect x=\"254\" y=\"88\" width=\"58\" height=\"7\" rx=\"1.5\" fill=\"#1E293B\"/><line x1=\"264\" y1=\"91.5\" x2=\"302\" y2=\"91.5\" stroke=\"#E2E8F0\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"258\" cy=\"116\" r=\"3\" fill=\"#0F172A\"/><circle cx=\"308\" cy=\"116\" r=\"3\" fill=\"#0F172A\"/></g><!-- Sombra del automóvil en el piso --><ellipse cx=\"118\" cy=\"128\" rx=\"86\" ry=\"10\" fill=\"rgba(2,6,23,0.38)\"/><!-- AUTOMÓVIL DEPORTIVO 2.5D (LUNA POLARIZADA & DETALLADO) --><g class=\"es-bota\"><!-- Haz de luz LED proyectado hacia la derecha --><polygon points=\"198,102 245,92 245,116 198,110\" fill=\"#FEF08A\" opacity=\"0.22\" stroke=\"none\"/><!-- Chasis y Carrocería del auto --><path d=\"M 28 116 L 36 96 Q 44 82 58 80 L 92 78 Q 104 60 120 58 L 165 58 Q 182 60 192 78 L 208 92 Q 216 96 216 106 L 214 118 Z\" fill=\"url(#esCarGrad)\" stroke=\"#0F172A\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><!-- LUNA POLARIZADA (Windshield & Side Window) --><!-- Ventana trasera --><path d=\"M 96 76 L 118 62 H 144 V 76 Z\" fill=\"url(#esTintGlass)\" stroke=\"#1E293B\" stroke-width=\"1.8\"/><!-- Parabrisas delantero tintado con reflejo nítido --><path d=\"M 148 62 H 164 Q 176 64 186 76 H 148 Z\" fill=\"url(#esTintGlass)\" stroke=\"#1E293B\" stroke-width=\"1.8\"/><!-- Destello de polarizado diagonal --><line x1=\"152\" y1=\"64\" x2=\"178\" y2=\"74\" stroke=\"#38BDF8\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\"0.8\"/><!-- Moldura lateral y manija cromada --><line x1=\"88\" y1=\"88\" x2=\"160\" y2=\"88\" stroke=\"#1E3A8A\" stroke-width=\"2\"/><rect x=\"126\" y=\"85\" width=\"10\" height=\"2.5\" rx=\"1.2\" fill=\"#E2E8F0\"/><!-- Faros delanteros LED cristalinos --><path d=\"M 204 94 Q 212 96 214 102 H 202 Z\" fill=\"#FEF08A\" stroke=\"#0F172A\" stroke-width=\"1.5\"/><!-- Luz trasera roja --><rect x=\"30\" y=\"96\" width=\"6\" height=\"10\" rx=\"2\" fill=\"#DC2626\"/><!-- Ruedas deportivas con frenos de disco y cálipers rojos --><!-- Rueda Delantera --><g transform=\"translate(178, 120)\"><circle cx=\"0\" cy=\"0\" r=\"15\" fill=\"#0F172A\" stroke=\"#020617\" stroke-width=\"1.5\"/><circle cx=\"0\" cy=\"0\" r=\"9.5\" fill=\"#64748B\"/><!-- Cáliper de freno rojo --><path d=\"M -6 -5 A 8 8 0 0 1 -2 -8 L -4 -4 Z\" fill=\"#DC2626\"/><!-- Rin deportivo 5 aspas animado --><g class=\"es-llanta\"><circle cx=\"0\" cy=\"0\" r=\"4.5\" fill=\"#E2E8F0\"/><line x1=\"0\" y1=\"-8\" x2=\"0\" y2=\"8\" stroke=\"#CBD5E1\" stroke-width=\"2.2\"/><line x1=\"-8\" y1=\"-3\" x2=\"8\" y2=\"3\" stroke=\"#CBD5E1\" stroke-width=\"2.2\"/><line x1=\"-6\" y1=\"6\" x2=\"6\" y2=\"-6\" stroke=\"#CBD5E1\" stroke-width=\"2.2\"/></g></g><!-- Rueda Trasera --><g transform=\"translate(68, 120)\"><circle cx=\"0\" cy=\"0\" r=\"15\" fill=\"#0F172A\" stroke=\"#020617\" stroke-width=\"1.5\"/><circle cx=\"0\" cy=\"0\" r=\"9.5\" fill=\"#64748B\"/><path d=\"M -6 -5 A 8 8 0 0 1 -2 -8 L -4 -4 Z\" fill=\"#DC2626\"/><g class=\"es-llanta es-llanta--b\"><circle cx=\"0\" cy=\"0\" r=\"4.5\" fill=\"#E2E8F0\"/><line x1=\"0\" y1=\"-8\" x2=\"0\" y2=\"8\" stroke=\"#CBD5E1\" stroke-width=\"2.2\"/><line x1=\"-8\" y1=\"-3\" x2=\"8\" y2=\"3\" stroke=\"#CBD5E1\" stroke-width=\"2.2\"/><line x1=\"-6\" y1=\"6\" x2=\"6\" y2=\"-6\" stroke=\"#CBD5E1\" stroke-width=\"2.2\"/></g></g></g><!-- Destellos de luz brillante sobre la luna polarizada y pintura recién detallada --><g class=\"es-brillo\" transform=\"translate(172, 60)\"><polygon points=\"0,-7 2,-2 7,0 2,2 0,7 -2,2 -7,0 -2,-2\" fill=\"#38BDF8\"/></g><g class=\"es-brillo es-brillo--b\" transform=\"translate(116, 78)\"><polygon points=\"0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5\" fill=\"#FFFFFF\"/></g></g></svg>",
        educacion: "<svg class=\"es es--educacion\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Educación Universitaria\"><defs><clipPath id=\"esEduClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esEduSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#EEF2FF\"/><stop offset=\"100%\" stop-color=\"#E0E7FF\"/></linearGradient><linearGradient id=\"esDeskGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#9A3412\"/><stop offset=\"60%\" stop-color=\"#7C2D12\"/><stop offset=\"100%\" stop-color=\"#431407\"/></linearGradient><linearGradient id=\"esCapGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#1E293B\"/><stop offset=\"50%\" stop-color=\"#0F172A\"/><stop offset=\"100%\" stop-color=\"#020617\"/></linearGradient><filter id=\"esEduShadow\" x=\"-15%\" y=\"-15%\" width=\"130%\" height=\"135%\"><feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"3.5\" flood-color=\"#1E1B4B\" flood-opacity=\"0.14\"/></filter></defs><g clip-path=\"url(#esEduClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esEduSky)\"/><rect x=\"0\" y=\"104\" width=\"340\" height=\"44\" fill=\"#C7D2FE\"/><!-- FONDO: FACULTAD / UNIVERSIDAD NEOCLÁSICA 2.5D --><g transform=\"translate(180, 18)\" filter=\"url(#esEduShadow)\"><!-- Frontón triangular con relieve --><polygon points=\"70,6 0,38 140,38\" fill=\"#4F46E5\" stroke=\"#3730A3\" stroke-width=\"2\"/><polygon points=\"70,12 14,36 126,36\" fill=\"#6366F1\" opacity=\"0.6\"/><circle cx=\"70\" cy=\"26\" r=\"6\" fill=\"#FDE047\"/><!-- Cúpula central con reloj y banderín universitario --><path d=\"M 60 6 Q 70 -8 80 6 Z\" fill=\"#3730A3\"/><line x1=\"70\" y1=\"-8\" x2=\"70\" y2=\"-20\" stroke=\"#475569\" stroke-width=\"2\"/><path d=\"M 70 -20 L 88 -14 L 70 -8 Z\" fill=\"#EF4444\" class=\"es-bandera\"/><!-- Arquitrabe --><rect x=\"6\" y=\"38\" width=\"128\" height=\"8\" rx=\"2\" fill=\"#E2E8F0\"/><!-- 4 Columnas Romanas estriadas --><rect x=\"14\" y=\"46\" width=\"14\" height=\"52\" rx=\"2\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1\"/><rect x=\"44\" y=\"46\" width=\"14\" height=\"52\" rx=\"2\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1\"/><rect x=\"82\" y=\"46\" width=\"14\" height=\"52\" rx=\"2\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1\"/><rect x=\"112\" y=\"46\" width=\"14\" height=\"52\" rx=\"2\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1\"/><!-- Puerta arqueada central --><path d=\"M 64 68 A 12 12 0 0 1 76 68 V 98 H 64 Z\" fill=\"#1E1B4B\"/><!-- Escalinata de piedra --><rect x=\"0\" y=\"98\" width=\"140\" height=\"6\" rx=\"2\" fill=\"#94A3B8\"/><rect x=\"-6\" y=\"104\" width=\"152\" height=\"6\" rx=\"2\" fill=\"#64748B\"/></g><!-- PRIMER PLANO: MESA DE ESTUDIO DE CAOBA CON LIBROS Y DIPLOMA --><g filter=\"url(#esEduShadow)\"><!-- Mesa de madera noble --><rect x=\"18\" y=\"92\" width=\"168\" height=\"16\" rx=\"4\" fill=\"url(#esDeskGrad)\"/><rect x=\"18\" y=\"92\" width=\"168\" height=\"3\" fill=\"#B45309\" opacity=\"0.6\"/><!-- Tomo 1 (Inferior): Gran volumen carmesí con filigrana dorada --><rect x=\"36\" y=\"80\" width=\"88\" height=\"13\" rx=\"3\" fill=\"#991B1B\" stroke=\"#7F1D1D\" stroke-width=\"1\"/><rect x=\"38\" y=\"82\" width=\"6\" height=\"9\" rx=\"1\" fill=\"#FDE047\"/><line x1=\"48\" y1=\"86.5\" x2=\"120\" y2=\"86.5\" stroke=\"#FDE047\" stroke-width=\"1.5\" stroke-dasharray=\"8 4\"/><!-- Tomo 2 (Medio): Libro verde esmeralda con lomo grabado --><rect x=\"42\" y=\"68\" width=\"80\" height=\"13\" rx=\"3\" fill=\"#065F46\" stroke=\"#047857\" stroke-width=\"1\"/><rect x=\"44\" y=\"70\" width=\"5\" height=\"9\" rx=\"1\" fill=\"#FDE047\"/><line x1=\"53\" y1=\"74.5\" x2=\"118\" y2=\"74.5\" stroke=\"#34D399\" stroke-width=\"1.5\"/><!-- Tomo 3 (Superior): Libro azul zafiro con cinta marcapáginas --><rect x=\"48\" y=\"56\" width=\"72\" height=\"13\" rx=\"3\" fill=\"#1E40AF\" stroke=\"#1D4ED8\" stroke-width=\"1\"/><path d=\"M 112 62 v 16 l 3 -3 l 3 3 v -16 Z\" fill=\"#EF4444\"/><!-- Diploma en pergamino con cinta roja y sello de cera lacre --><g transform=\"translate(132, 78)\"><rect x=\"0\" y=\"4\" width=\"38\" height=\"10\" rx=\"5\" fill=\"#FEF3C7\" stroke=\"#D97706\" stroke-width=\"1\"/><line x1=\"6\" y1=\"9\" x2=\"32\" y2=\"9\" stroke=\"#B45309\" stroke-width=\"0.8\" stroke-dasharray=\"3 2\"/><circle cx=\"19\" cy=\"9\" r=\"4.5\" fill=\"#DC2626\"/><circle cx=\"19\" cy=\"9\" r=\"2.2\" fill=\"#FDE047\"/></g></g><!-- BIRRETE 3D FLOTANTE CON BORLA DORADA DINÁMICA --><g class=\"es-flota\" transform=\"translate(86, 26)\"><!-- Sombra proyectada del birrete --><ellipse cx=\"0\" cy=\"38\" rx=\"28\" ry=\"6\" fill=\"rgba(15,23,42,0.18)\"/><!-- Casquete inferior del birrete --><path d=\"M -18 8 Q 0 18 18 8 V 16 Q 0 26 -18 16 Z\" fill=\"#0F172A\"/><!-- Tapa romboidal superior en perspectiva 2.5D --><polygon points=\"0,-12 36,4 0,20 -36,4\" fill=\"url(#esCapGrad)\" stroke=\"#334155\" stroke-width=\"2\"/><polygon points=\"0,-10 32,4 0,18 -32,4\" fill=\"#1E293B\" opacity=\"0.6\"/><!-- Botón central dorado --><circle cx=\"0\" cy=\"4\" r=\"3.2\" fill=\"#FDE047\" stroke=\"#B45309\" stroke-width=\"1\"/><!-- Borla de seda dorada con movimiento suave --><g class=\"es-borla\"><path d=\"M 0 4 Q 18 8 24 22\" fill=\"none\" stroke=\"#F59E0B\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><rect x=\"21\" y=\"22\" width=\"6\" height=\"12\" rx=\"2\" fill=\"#FDE047\" stroke=\"#B45309\" stroke-width=\"0.8\"/><line x1=\"24\" y1=\"24\" x2=\"24\" y2=\"34\" stroke=\"#D97706\" stroke-width=\"1\"/></g></g><!-- Estrellas de logro académico titilando --><g class=\"es-brillo\" transform=\"translate(34, 30)\"><polygon points=\"0,-6 2,-2 6,0 2,2 0,6 -2,2 -6,0 -2,-2\" fill=\"#F59E0B\"/></g><g class=\"es-brillo es-brillo--b\" transform=\"translate(148, 20)\"><polygon points=\"0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5\" fill=\"#6366F1\"/></g></g></svg>",
        combustible: "<svg class=\"es es--combustible\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Combustible y Grifo Digital\"><defs><clipPath id=\"esCombClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esFuelSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FFF7ED\"/><stop offset=\"100%\" stop-color=\"#FED7AA\"/></linearGradient><linearGradient id=\"esPumpGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#1E293B\"/><stop offset=\"100%\" stop-color=\"#0F172A\"/></linearGradient><linearGradient id=\"esTankGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FFFFFF\"/><stop offset=\"35%\" stop-color=\"#F8FAFC\"/><stop offset=\"70%\" stop-color=\"#E2E8F0\"/><stop offset=\"100%\" stop-color=\"#94A3B8\"/></linearGradient><linearGradient id=\"esCabGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FB923C\"/><stop offset=\"100%\" stop-color=\"#C2410C\"/></linearGradient><filter id=\"esFuelShadow\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"130%\"><feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"3.5\" flood-color=\"#0F172A\" flood-opacity=\"0.16\"/></filter></defs><g clip-path=\"url(#esCombClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esFuelSky)\"/><rect x=\"0\" y=\"96\" width=\"340\" height=\"52\" fill=\"#E2E8F0\"/><line x1=\"0\" y1=\"98\" x2=\"340\" y2=\"98\" stroke=\"#F59E0B\" stroke-width=\"3\" stroke-dasharray=\"14 10\"/><!-- Marquesina / Techo de la estación con luminarias --><path d=\"M 0 0 H 340 V 16 L 310 24 H 30 Z\" fill=\"#EA580C\"/><circle cx=\"60\" cy=\"20\" r=\"3.5\" fill=\"#FEF08A\"/><circle cx=\"170\" cy=\"20\" r=\"3.5\" fill=\"#FEF08A\"/><circle cx=\"280\" cy=\"20\" r=\"3.5\" fill=\"#FEF08A\"/><!-- SURTIDOR DIGITAL INTELIGENTE DE GRIFO --><g filter=\"url(#esFuelShadow)\"><!-- Carcasa principal del surtidor --><rect x=\"24\" y=\"24\" width=\"66\" height=\"106\" rx=\"8\" fill=\"url(#esPumpGrad)\" stroke=\"#334155\" stroke-width=\"2\"/><rect x=\"20\" y=\"16\" width=\"74\" height=\"10\" rx=\"3\" fill=\"#64748B\"/><!-- Pantalla Digital OLED con lectura de precio en Neón Verde --><rect x=\"31\" y=\"34\" width=\"52\" height=\"28\" rx=\"4\" fill=\"#020617\" stroke=\"#1E293B\" stroke-width=\"1.5\"/><text x=\"35\" y=\"47\" font-family=\"monospace\" font-size=\"9.5\" font-weight=\"900\" fill=\"#22C55E\">S/ 14.80</text><text x=\"35\" y=\"58\" font-family=\"monospace\" font-size=\"8.5\" font-weight=\"700\" fill=\"#38BDF8\">G 10.50</text><!-- Botones de selección de octanaje (90, 95, 97, Diesel) --><circle cx=\"38\" cy=\"74\" r=\"4.2\" fill=\"#F59E0B\"/><circle cx=\"49\" cy=\"74\" r=\"4.2\" fill=\"#22C55E\"/><circle cx=\"60\" cy=\"74\" r=\"4.2\" fill=\"#3B82F6\"/><circle cx=\"71\" cy=\"74\" r=\"4.2\" fill=\"#EF4444\"/><!-- Boquilla y manguera en descanso --><rect x=\"31\" y=\"86\" width=\"52\" height=\"6\" rx=\"3\" fill=\"#020617\"/></g><!-- Manguera flexible y pistola despachadora de combustible --><path d=\"M 86 86 C 114 86, 118 128, 142 98 C 154 84, 158 64, 172 58\" fill=\"none\" stroke=\"#0F172A\" stroke-width=\"5\" stroke-linecap=\"round\"/><!-- Pistola metálica con gatillo --><path d=\"M 170 56 l 12 -5 l 6 14 l -8 4 Z\" fill=\"#64748B\" stroke=\"#0F172A\" stroke-width=\"1.5\"/><line x1=\"174\" y1=\"62\" x2=\"182\" y2=\"58\" stroke=\"#F59E0B\" stroke-width=\"2\"/><!-- Gota de combustible cayendo animada --><g class=\"es-gota\" fill=\"#F59E0B\"><ellipse cx=\"184\" cy=\"68\" rx=\"3\" ry=\"4.5\"/></g><!-- CAMIÓN CISTERNA DE COMBUSTIBLE CON VISOR DE NIVEL PULSANTE --><ellipse cx=\"236\" cy=\"132\" rx=\"76\" ry=\"9\" fill=\"rgba(15,23,42,0.2)\"/><g stroke=\"#0F172A\" stroke-width=\"2.5\" stroke-linejoin=\"round\"><!-- Cabina del camión cisterna --><path d=\"M 272 124 V 80 q 0 -8 8 -8 h 26 q 8 0 10 7 l 12 28 v 17 Z\" fill=\"url(#esCabGrad)\"/><path d=\"M 284 82 h 20 l 8 20 h -28 Z\" fill=\"#E0F2FE\" stroke=\"none\"/><!-- Faro y parachoque --><circle cx=\"325\" cy=\"116\" r=\"3.5\" fill=\"#FDE047\" stroke=\"none\"/><rect x=\"272\" y=\"118\" width=\"58\" height=\"6\" rx=\"2\" fill=\"#334155\"/><!-- Tanque de combustible horizontal --><rect x=\"136\" y=\"56\" width=\"138\" height=\"56\" rx=\"28\" fill=\"url(#esTankGrad)\"/><rect x=\"136\" y=\"78\" width=\"138\" height=\"12\" fill=\"#EA580C\" stroke=\"none\"/><!-- Visor de nivel con combustible líquido dinámico --><rect x=\"160\" y=\"81\" width=\"90\" height=\"6\" rx=\"3\" fill=\"#FDE047\" stroke=\"none\" class=\"es-nivel\"/><line x1=\"156\" y1=\"62\" x2=\"254\" y2=\"62\" stroke=\"#FFFFFF\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\"0.75\" stroke=\"none\"/><rect x=\"170\" y=\"50\" width=\"18\" height=\"7\" rx=\"3\" fill=\"#475569\"/><!-- Ruedas dobles con rines cromados --><g stroke=\"#0F172A\" stroke-width=\"2\"><circle cx=\"166\" cy=\"126\" r=\"12\" fill=\"#0F172A\"/><circle cx=\"166\" cy=\"126\" r=\"5\" fill=\"#E2E8F0\" stroke=\"none\"/><circle cx=\"210\" cy=\"126\" r=\"12\" fill=\"#0F172A\"/><circle cx=\"210\" cy=\"126\" r=\"5\" fill=\"#E2E8F0\" stroke=\"none\"/><circle cx=\"298\" cy=\"126\" r=\"12\" fill=\"#0F172A\"/><circle cx=\"298\" cy=\"126\" r=\"5\" fill=\"#E2E8F0\" stroke=\"none\"/></g></g></g></svg>",
        comida: "<svg class=\"es es--comida\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Restaurante y Comida\"><defs><clipPath id=\"esComClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esFoodSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FFF7ED\"/><stop offset=\"100%\" stop-color=\"#FED7AA\"/></linearGradient><linearGradient id=\"esScooterGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FB923C\"/><stop offset=\"100%\" stop-color=\"#EA580C\"/></linearGradient><linearGradient id=\"esBoxGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#EA580C\"/><stop offset=\"100%\" stop-color=\"#C2410C\"/></linearGradient><linearGradient id=\"esBucketGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#EF4444\"/><stop offset=\"100%\" stop-color=\"#B91C1C\"/></linearGradient></defs><g clip-path=\"url(#esComClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esFoodSky)\"/><rect x=\"0\" y=\"96\" width=\"340\" height=\"52\" fill=\"#E5DDD0\"/><line x1=\"0\" y1=\"96\" x2=\"340\" y2=\"96\" stroke=\"#D1C7B7\" stroke-width=\"1.5\"/><!-- FACHADA DE RESTAURANTE FAST-FOOD / BISTRO --><g><!-- Pared exterior --><rect x=\"185\" y=\"20\" width=\"145\" height=\"88\" rx=\"8\" fill=\"#FDFBF7\" stroke=\"#E2D9CE\" stroke-width=\"2\"/><!-- Toldo festoneado a rayas rojas y blancas estilo Fast-Food / KFC --><path d=\"M 180 32 h 155 l -8 18 h -139 Z\" fill=\"#DC2626\"/><path d=\"M 180 32 h 20 l -3 18 h -14 Z M 220 32 h 20 l -3 18 h -14 Z M 260 32 h 20 l -3 18 h -14 Z M 300 32 h 20 l -3 18 h -14 Z\" fill=\"#FFFFFF\"/><!-- Vitrina cálida de atención --><rect x=\"198\" y=\"56\" width=\"52\" height=\"40\" rx=\"4\" fill=\"#FEF3C7\" stroke=\"#F59E0B\" stroke-width=\"1.5\"/><!-- Puerta bistro de madera --><rect x=\"262\" y=\"52\" width=\"46\" height=\"56\" rx=\"4\" fill=\"#854D0E\"/><circle cx=\"268\" cy=\"80\" r=\"2.5\" fill=\"#FDE047\"/><!-- BALDE DE POLLO CRUJIENTE ESTILO KFC EN VITRINA --><path d=\"M 206 72 L 209 88 H 225 L 228 72 Z\" fill=\"url(#esBucketGrad)\"/><rect x=\"206\" y=\"70\" width=\"22\" height=\"3.5\" rx=\"1.5\" fill=\"#FFFFFF\"/><ellipse cx=\"217\" cy=\"71\" rx=\"8\" ry=\"2.5\" fill=\"#F59E0B\"/><!-- Franjas blancas del balde --><line x1=\"212\" y1=\"73\" x2=\"213\" y2=\"87\" stroke=\"#FFFFFF\" stroke-width=\"2\"/><line x1=\"221\" y1=\"73\" x2=\"220\" y2=\"87\" stroke=\"#FFFFFF\" stroke-width=\"2\"/><!-- Presas crujientes doradas con textura --><circle cx=\"213\" cy=\"68\" r=\"4.2\" fill=\"#D97706\"/><circle cx=\"221\" cy=\"67\" r=\"4.5\" fill=\"#F59E0B\"/><!-- Vaso de gaseosa con sorbete --><path d=\"M 234 74 l 2.5 13 h 7 l 2.5 -13 Z\" fill=\"#DC2626\"/><line x1=\"239\" y1=\"68\" x2=\"243\" y2=\"82\" stroke=\"#FFFFFF\" stroke-width=\"2\" stroke-linecap=\"round\"/></g><!-- Vapor caliente de comida recién preparada --><g class=\"es-humo\"><circle cx=\"216\" cy=\"58\" r=\"2.8\" fill=\"#FFFFFF\" opacity=\"0.8\"/><circle cx=\"219\" cy=\"50\" r=\"3.8\" fill=\"#FFFFFF\" opacity=\"0.6\"/></g><!-- SCOOTER DE REPARTO 2.5D CON REPARTIDOR ANIMADO --><g class=\"es-bota\"><!-- Ráfagas de velocidad del delivery --><g class=\"es-veloz\" stroke=\"#FB923C\" stroke-width=\"2.5\" stroke-linecap=\"round\"><line x1=\"20\" y1=\"62\" x2=\"38\" y2=\"62\"/><line x1=\"14\" y1=\"76\" x2=\"34\" y2=\"76\"/><line x1=\"18\" y1=\"90\" x2=\"40\" y2=\"90\"/></g><!-- Humo del tubo de escape --><g class=\"es-humo\"><circle cx=\"42\" cy=\"118\" r=\"5\" fill=\"#F1F5F9\"/><circle cx=\"32\" cy=\"114\" r=\"7\" fill=\"#F8FAFC\"/><circle cx=\"20\" cy=\"110\" r=\"9\" fill=\"#FFFFFF\"/></g><!-- Sombra del vehículo --><ellipse cx=\"112\" cy=\"130\" rx=\"65\" ry=\"8\" fill=\"rgba(20,20,19,0.16)\"/><g stroke=\"#1E1B18\" stroke-width=\"2.6\" stroke-linejoin=\"round\"><!-- Rueda Delantera giratoria --><circle cx=\"58\" cy=\"120\" r=\"14\" fill=\"#0F172A\"/><circle cx=\"58\" cy=\"120\" r=\"6\" fill=\"#E2E8F0\" class=\"es-llanta\"/><!-- Rueda Trasera giratoria --><circle cx=\"154\" cy=\"120\" r=\"14\" fill=\"#0F172A\"/><circle cx=\"154\" cy=\"120\" r=\"6\" fill=\"#E2E8F0\" class=\"es-llanta es-llanta--b\"/><!-- Cuadro del Scooter --><path d=\"M 58 118 h 45 l 20 -35 h 25 l 10 35 h -12\" stroke=\"#1E1B18\" stroke-width=\"2.8\" fill=\"url(#esScooterGrad)\"/><!-- Manillar y faro --><path d=\"M 144 68 l 6 -14 h 8\" stroke=\"#1E1B18\" stroke-width=\"3\"/><circle cx=\"158\" cy=\"62\" r=\"4.2\" fill=\"#FDE047\"/><polygon points=\"162,62 195,50 195,78\" fill=\"#FEF08A\" opacity=\"0.25\" stroke=\"none\"/><!-- Mochila térmica de Delivery (caja trasera) --><rect x=\"38\" y=\"56\" width=\"36\" height=\"38\" rx=\"6\" fill=\"url(#esBoxGrad)\"/><circle cx=\"56\" cy=\"75\" r=\"10\" fill=\"#FFFFFF\"/><path d=\"M 52 71 v 8 M 56 70 v 9 M 60 71 v 8\" stroke=\"#EA580C\" stroke-width=\"2\"/><!-- Conductor con casco --><path d=\"M 92 68 L 111 85 L 124 85\" stroke=\"#F97316\" stroke-width=\"16\" stroke-linecap=\"round\"/><circle cx=\"114\" cy=\"46\" r=\"13\" fill=\"#EA580C\"/><path d=\"M 118 42 h 8 q 3 5 -2 8 h -6 Z\" fill=\"#0F172A\"/></g></g></g></svg>",
        prestamo: "<svg class=\"es es--prestamo\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Préstamos y Transferencias\"><defs><clipPath id=\"esPreClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esPreSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#F0FDF4\"/><stop offset=\"100%\" stop-color=\"#E0F2FE\"/></linearGradient><linearGradient id=\"esLoanArc\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0%\" stop-color=\"#3B82F6\"/><stop offset=\"50%\" stop-color=\"#10B981\"/><stop offset=\"100%\" stop-color=\"#059669\"/></linearGradient><linearGradient id=\"esVaultGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#334155\"/><stop offset=\"100%\" stop-color=\"#0F172A\"/></linearGradient><linearGradient id=\"esBillGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#DCFCE7\"/><stop offset=\"100%\" stop-color=\"#BBF7D0\"/></linearGradient><filter id=\"esVaultShadow\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"150%\"><feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"3.5\" flood-color=\"#0F172A\" flood-opacity=\"0.18\"/></filter><filter id=\"esBillShadow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"170%\"><feDropShadow dx=\"0\" dy=\"3\" stdDeviation=\"3\" flood-color=\"#064E3B\" flood-opacity=\"0.25\"/></filter></defs><g clip-path=\"url(#esPreClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esPreSky)\"/><rect x=\"0\" y=\"96\" width=\"340\" height=\"52\" fill=\"#CBD5E1\"/><line x1=\"0\" y1=\"96\" x2=\"340\" y2=\"96\" stroke=\"#94A3B8\" stroke-width=\"1.5\"/><!-- Arco de Energía Parabólico de la Transferencia --><path d=\"M 75 98 C 115 22, 225 22, 265 98\" fill=\"none\" stroke=\"#6EE7B7\" stroke-width=\"8\" stroke-linecap=\"round\" opacity=\"0.35\"/><path d=\"M 75 98 C 115 22, 225 22, 265 98\" fill=\"none\" stroke=\"url(#esLoanArc)\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-dasharray=\"10 7\" class=\"es-ruta\"/><!-- BÓVEDA IZQUIERDA (ORIGEN) --><g filter=\"url(#esVaultShadow)\"><rect x=\"36\" y=\"62\" width=\"76\" height=\"58\" rx=\"8\" fill=\"url(#esVaultGrad)\"/><rect x=\"42\" y=\"68\" width=\"64\" height=\"46\" rx=\"5\" fill=\"#1E293B\" stroke=\"#475569\" stroke-width=\"1.5\"/><!-- Dial de combinación de la caja fuerte --><circle cx=\"74\" cy=\"91\" r=\"13\" fill=\"#334155\" stroke=\"#94A3B8\" stroke-width=\"2\"/><circle cx=\"74\" cy=\"91\" r=\"5\" fill=\"#FDE047\"/><line x1=\"74\" y1=\"80\" x2=\"74\" y2=\"84\" stroke=\"#FDE047\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"74\" y1=\"98\" x2=\"74\" y2=\"102\" stroke=\"#FDE047\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"63\" y1=\"91\" x2=\"67\" y2=\"91\" stroke=\"#FDE047\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"81\" y1=\"91\" x2=\"85\" y2=\"91\" stroke=\"#FDE047\" stroke-width=\"2\" stroke-linecap=\"round\"/><!-- Indicador LED verde --><circle cx=\"48\" cy=\"74\" r=\"2.8\" fill=\"#22C55E\" class=\"es-pulso-g\"/></g><!-- Pilas de monedas de oro en el piso --><ellipse cx=\"120\" cy=\"116\" rx=\"9\" ry=\"3.5\" fill=\"#F59E0B\"/><ellipse cx=\"120\" cy=\"113\" rx=\"9\" ry=\"3.5\" fill=\"#FDE047\"/><ellipse cx=\"120\" cy=\"110\" rx=\"9\" ry=\"3.5\" fill=\"#F59E0B\"/><ellipse cx=\"120\" cy=\"107\" rx=\"9\" ry=\"3.5\" fill=\"#FDE047\"/><!-- BÓVEDA DERECHA (DESTINO) --><g filter=\"url(#esVaultShadow)\"><rect x=\"228\" y=\"62\" width=\"76\" height=\"58\" rx=\"8\" fill=\"url(#esVaultGrad)\"/><rect x=\"234\" y=\"68\" width=\"64\" height=\"46\" rx=\"5\" fill=\"#1E293B\" stroke=\"#475569\" stroke-width=\"1.5\"/><rect x=\"242\" y=\"75\" width=\"48\" height=\"24\" rx=\"4\" fill=\"#020617\"/><!-- Checkmark de confirmación exitosa --><path d=\"M 258 87 l 5 5 l 10 -10\" stroke=\"#22C55E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><circle cx=\"294\" cy=\"74\" r=\"2.8\" fill=\"#3B82F6\" class=\"es-pulso-g\"/></g><ellipse cx=\"220\" cy=\"115\" rx=\"8\" ry=\"3.2\" fill=\"#F59E0B\"/><ellipse cx=\"220\" cy=\"112\" rx=\"8\" ry=\"3.2\" fill=\"#FDE047\"/><!-- BILLETE DE SOLES (S/) EN VUELO PARABÓLICO SUAVE --><g class=\"es-vuelo-arc\" filter=\"url(#esBillShadow)\"><rect x=\"-25\" y=\"-14\" width=\"50\" height=\"28\" rx=\"5\" fill=\"url(#esBillGrad)\" stroke=\"#16A34A\" stroke-width=\"1.8\"/><rect x=\"-21\" y=\"-10\" width=\"42\" height=\"20\" rx=\"3\" fill=\"none\" stroke=\"#16A34A\" stroke-width=\"1\" stroke-dasharray=\"3 2\" opacity=\"0.6\"/><circle cx=\"0\" cy=\"0\" r=\"8\" fill=\"#16A34A\"/><text x=\"0\" y=\"3.2\" font-size=\"8.5\" font-family=\"'Sofia Sans', sans-serif\" text-anchor=\"middle\" font-weight=\"900\" fill=\"#FFFFFF\">S/</text></g><!-- Destellos dorados en el arco --><g class=\"es-brillo\" transform=\"translate(170, 24)\"><polygon points=\"0,-6 2,-2 6,0 2,2 0,6 -2,2 -6,0 -2,-2\" fill=\"#FDE047\"/></g><g class=\"es-brillo es-brillo--b\" transform=\"translate(245, 45)\"><polygon points=\"0,-4 1.5,-1.5 4,0 1.5,1.5 0,4 -1.5,1.5 -4,0 -1.5,-1.5\" fill=\"#34D399\"/></g></g></svg>",
        viaje: "<svg class=\"es es--viaje\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Ruta de Viaje y Transporte\"><defs><clipPath id=\"esViajeClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esHwyGrad\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0%\" stop-color=\"#FF9238\"/><stop offset=\"50%\" stop-color=\"#EA580C\"/><stop offset=\"100%\" stop-color=\"#D33800\"/></linearGradient><linearGradient id=\"esRiverGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#93C5FD\"/><stop offset=\"100%\" stop-color=\"#60A5FA\"/></linearGradient><linearGradient id=\"esGreenPin\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#22C55E\"/><stop offset=\"100%\" stop-color=\"#15803D\"/></linearGradient><linearGradient id=\"esRedPin\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#F87171\"/><stop offset=\"100%\" stop-color=\"#DC2626\"/></linearGradient><linearGradient id=\"esTruckBox\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FB923C\"/><stop offset=\"100%\" stop-color=\"#EA580C\"/></linearGradient><linearGradient id=\"esTruckCab\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#EA580C\"/><stop offset=\"100%\" stop-color=\"#C2410C\"/></linearGradient><filter id=\"esPinShadow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"170%\"><feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"3\" flood-color=\"#141413\" flood-opacity=\"0.18\"/></filter><filter id=\"esRoadShadow\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"130%\"><feDropShadow dx=\"0\" dy=\"3\" stdDeviation=\"3.5\" flood-color=\"#141413\" flood-opacity=\"0.09\"/></filter></defs><g clip-path=\"url(#esViajeClip)\"><rect width=\"340\" height=\"148\" fill=\"#EBF0EC\"/><!-- Cuadrícula de mapa topográfico --><g stroke-linecap=\"round\"><line x1=\"-30\" y1=\"125\" x2=\"270\" y2=\"-15\" stroke=\"#DFE6E1\" stroke-width=\"15\"/><line x1=\"15\" y1=\"165\" x2=\"315\" y2=\"25\" stroke=\"#DFE6E1\" stroke-width=\"15\"/><line x1=\"-20\" y1=\"52\" x2=\"210\" y2=\"-22\" stroke=\"#DFE6E1\" stroke-width=\"11\"/><line x1=\"38\" y1=\"-15\" x2=\"152\" y2=\"165\" stroke=\"#E5ECE6\" stroke-width=\"9\"/><line x1=\"108\" y1=\"-15\" x2=\"222\" y2=\"165\" stroke=\"#E5ECE6\" stroke-width=\"9\"/><line x1=\"178\" y1=\"-15\" x2=\"292\" y2=\"165\" stroke=\"#E5ECE6\" stroke-width=\"9\"/><line x1=\"-15\" y1=\"18\" x2=\"88\" y2=\"165\" stroke=\"#E5ECE6\" stroke-width=\"7\"/></g><!-- Río curvo azul con reflejos --><path d=\"M 314 -5 C 286 35, 310 80, 276 125 C 266 138, 260 148, 255 155\" fill=\"none\" stroke=\"url(#esRiverGrad)\" stroke-width=\"19\" stroke-linecap=\"round\"/><path d=\"M 314 -5 C 286 35, 310 80, 276 125 C 266 138, 260 148, 255 155\" fill=\"none\" stroke=\"#BAE6FD\" stroke-width=\"2.5\" opacity=\"0.6\"/><!-- Autopista con curva en relieve --><path d=\"M 54 116 C 96 114, 114 84, 154 70 C 190 56, 218 42, 282 46\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"14\" stroke-linecap=\"round\" filter=\"url(#esRoadShadow)\"/><path class=\"es-traza\" d=\"M 54 116 C 96 114, 114 84, 154 70 C 190 56, 218 42, 282 46\" fill=\"none\" stroke=\"url(#esHwyGrad)\" stroke-width=\"8\" stroke-linecap=\"round\"/><path class=\"es-ruta\" d=\"M 54 116 C 96 114, 114 84, 154 70 C 190 56, 218 42, 282 46\" fill=\"none\" stroke=\"#FFF7ED\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-dasharray=\"6.5 5.5\"/><!-- PIN GPS ORIGEN (VERDE CON PULSO) --><g class=\"es-origen\"><circle class=\"es-pulso-g\" cx=\"54\" cy=\"116\" r=\"22\" fill=\"#22C55E\" opacity=\"0.18\"/><circle cx=\"54\" cy=\"116\" r=\"14\" fill=\"#22C55E\" opacity=\"0.28\"/><ellipse cx=\"54\" cy=\"118\" rx=\"5\" ry=\"2.5\" fill=\"#15803D\" opacity=\"0.5\"/><path d=\"M 54 116 C 50 110, 40 101, 40 92 A 14 14 0 1 1 68 92 C 68 101, 58 110, 54 116 Z\" fill=\"url(#esGreenPin)\" stroke=\"#FFFFFF\" stroke-width=\"1.8\" filter=\"url(#esPinShadow)\"/><circle cx=\"54\" cy=\"92\" r=\"5\" fill=\"#FFFFFF\"/></g><!-- PIN GPS DESTINO (ROJO CON PULSO) --><g class=\"es-destino\"><circle class=\"es-pulso-r\" cx=\"282\" cy=\"46\" r=\"22\" fill=\"#EF4444\" opacity=\"0.18\"/><circle cx=\"282\" cy=\"46\" r=\"14\" fill=\"#EF4444\" opacity=\"0.28\"/><ellipse cx=\"282\" cy=\"48\" rx=\"5\" ry=\"2.5\" fill=\"#DC2626\" opacity=\"0.5\"/><path d=\"M 282 46 C 278 40, 268 31, 268 22 A 14 14 0 1 1 296 22 C 296 31, 286 40, 282 46 Z\" fill=\"url(#esRedPin)\" stroke=\"#FFFFFF\" stroke-width=\"1.8\" filter=\"url(#esPinShadow)\"/><circle cx=\"282\" cy=\"22\" r=\"6\" fill=\"#FFFFFF\"/><circle cx=\"282\" cy=\"22\" r=\"3.2\" fill=\"#DC2626\"/></g><!-- CAMIÓN DE VIAJE RECORRIENDO LA RUTA --><g class=\"es-camion-wrap\" style=\"offset-path:path('M 54 116 C 96 114, 114 84, 154 70 C 190 56, 218 42, 282 46');offset-rotate:0deg\"><g transform=\"translate(0, -6)\"><line x1=\"-28\" y1=\"-2\" x2=\"-21\" y2=\"-2\" stroke=\"#FB923C\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><line x1=\"-32\" y1=\"4\" x2=\"-23\" y2=\"4\" stroke=\"#FB923C\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><g stroke=\"#1A1512\" stroke-width=\"2.4\" stroke-linejoin=\"round\"><rect x=\"-18\" y=\"-13\" width=\"26\" height=\"23\" rx=\"4\" fill=\"url(#esTruckBox)\"/><circle cx=\"-5\" cy=\"-1.5\" r=\"7\" fill=\"#FFFFFF\"/><text x=\"-5\" y=\"1.8\" text-anchor=\"middle\" font-family=\"'Sofia Sans', sans-serif\" font-size=\"9.5\" font-weight=\"900\" fill=\"#EA580C\" stroke=\"none\">$</text><path d=\"M 8 -4 H 14 L 20 4 V 10 H 8 Z\" fill=\"url(#esTruckCab)\"/><path d=\"M 9.5 -1.5 H 13.5 L 17.5 4 H 9.5 Z\" fill=\"#E0F2FE\" stroke=\"none\"/><circle cx=\"19.5\" cy=\"7\" r=\"1.8\" fill=\"#FDE047\" stroke=\"none\"/><g stroke=\"#1A1512\" stroke-width=\"2.2\"><circle cx=\"-8\" cy=\"11\" r=\"5.2\" fill=\"#1C1815\"/><circle cx=\"-8\" cy=\"11\" r=\"2.2\" fill=\"#F1F5F9\" stroke=\"none\"/><circle cx=\"13\" cy=\"11\" r=\"5.2\" fill=\"#1C1815\"/><circle cx=\"13\" cy=\"11\" r=\"2.2\" fill=\"#F1F5F9\" stroke=\"none\"/></g></g></g></g></g></svg>",
        salud: "<svg class=\"es es--salud\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Salud y Farmacia\"><defs><clipPath id=\"esSalClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esSalSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#F0FDF4\"/><stop offset=\"100%\" stop-color=\"#E0F2FE\"/></linearGradient><linearGradient id=\"esCapRed\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#F87171\"/><stop offset=\"100%\" stop-color=\"#DC2626\"/></linearGradient><linearGradient id=\"esCapBlue\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#60A5FA\"/><stop offset=\"100%\" stop-color=\"#2563EB\"/></linearGradient><filter id=\"esMedShadow\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"130%\"><feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"3.5\" flood-color=\"#0F172A\" flood-opacity=\"0.12\"/></filter></defs><g clip-path=\"url(#esSalClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esSalSky)\"/><rect x=\"0\" y=\"100\" width=\"340\" height=\"48\" fill=\"#DCFCE7\"/><!-- Edificio de Clínica / Hospital --><rect x=\"195\" y=\"24\" width=\"130\" height=\"96\" rx=\"8\" fill=\"#FFFFFF\" stroke=\"#DCFCE7\" stroke-width=\"2\"/><rect x=\"210\" y=\"44\" width=\"40\" height=\"52\" rx=\"4\" fill=\"#E0F2FE\"/><rect x=\"265\" y=\"44\" width=\"45\" height=\"52\" rx=\"4\" fill=\"#E0F2FE\"/><!-- Cruz médica verde con pulso --><g class=\"es-pulso-g\"><rect x=\"242\" y=\"10\" width=\"36\" height=\"36\" rx=\"8\" fill=\"#16A34A\"/><path d=\"M 260 16 v 24 M 248 28 h 24\" stroke=\"#FFFFFF\" stroke-width=\"5\" stroke-linecap=\"round\"/></g><!-- Botiquín / Maletín médico en relieve --><ellipse cx=\"95\" cy=\"128\" rx=\"65\" ry=\"8\" fill=\"rgba(15,23,42,0.12)\"/><g filter=\"url(#esMedShadow)\"><rect x=\"36\" y=\"58\" width=\"94\" height=\"66\" rx=\"12\" fill=\"#FFFFFF\" stroke=\"#E2E8F0\" stroke-width=\"2.5\"/><rect x=\"36\" y=\"85\" width=\"94\" height=\"4\" fill=\"#E2E8F0\"/><!-- Cruz roja del maletín --><rect x=\"76\" y=\"74\" width=\"14\" height=\"30\" rx=\"3\" fill=\"#DC2626\"/><rect x=\"68\" y=\"82\" width=\"30\" height=\"14\" rx=\"3\" fill=\"#DC2626\"/><!-- Asa de transporte --><path d=\"M 68 58 v -10 q 0 -5 5 -5 h 20 q 5 0 5 5 v 10\" fill=\"none\" stroke=\"#64748B\" stroke-width=\"4.5\" stroke-linecap=\"round\"/></g><!-- Cápsula medicinal 2.5D flotante (rojo y azul) con brillo --><g transform=\"translate(148, 38) rotate(32)\"><rect x=\"0\" y=\"0\" width=\"22\" height=\"44\" rx=\"11\" fill=\"url(#esCapRed)\"/><rect x=\"0\" y=\"22\" width=\"22\" height=\"22\" rx=\"0 0 11 11\" fill=\"url(#esCapBlue)\"/><ellipse cx=\"8\" cy=\"11\" rx=\"3.5\" ry=\"8\" fill=\"#FFFFFF\" opacity=\"0.65\"/></g><!-- Estetoscopio y termómetro --><rect x=\"135\" y=\"100\" width=\"46\" height=\"14\" rx=\"3\" fill=\"#E0F2FE\" stroke=\"#64748B\" stroke-width=\"1.8\"/><line x1=\"181\" y1=\"107\" x2=\"200\" y2=\"107\" stroke=\"#64748B\" stroke-width=\"2.5\"/></g></svg>",
        banco: "<svg class=\"es es--banco\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Finanzas y Banco\"><defs><clipPath id=\"esBanClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esBanSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#F8FAFC\"/><stop offset=\"100%\" stop-color=\"#E2E8F0\"/></linearGradient></defs><g clip-path=\"url(#esBanClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esBanSky)\"/><rect x=\"0\" y=\"105\" width=\"340\" height=\"43\" fill=\"#CBD5E1\"/><!-- Banco Neoclásico --><g><path d=\"M 18 52 L 88 22 L 158 52 Z\" fill=\"#334155\"/><rect x=\"30\" y=\"52\" width=\"14\" height=\"65\" fill=\"#E2E8F0\"/><rect x=\"68\" y=\"52\" width=\"14\" height=\"65\" fill=\"#E2E8F0\"/><rect x=\"106\" y=\"52\" width=\"14\" height=\"65\" fill=\"#E2E8F0\"/><rect x=\"136\" y=\"52\" width=\"14\" height=\"65\" fill=\"#E2E8F0\"/><circle cx=\"88\" cy=\"38\" r=\"8\" fill=\"#F59E0B\"/><text x=\"88\" y=\"42\" font-size=\"9\" text-anchor=\"middle\" font-weight=\"900\" fill=\"#78350F\">$</text></g><!-- Terminal ATM & Tarjeta --><g><rect x=\"205\" y=\"36\" width=\"105\" height=\"95\" rx=\"10\" fill=\"#0F172A\"/><rect x=\"220\" y=\"46\" width=\"75\" height=\"38\" rx=\"6\" fill=\"#1E293B\"/><circle cx=\"258\" cy=\"65\" r=\"11\" fill=\"#16A34A\"/><path d=\"M 253 65 l 4 4 l 7 -7\" stroke=\"#FFFFFF\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><!-- Ranura de depósito y billete cayendo --><g class=\"es-cae\"><rect x=\"222\" y=\"95\" width=\"58\" height=\"26\" rx=\"4\" fill=\"#DCFCE7\" stroke=\"#16A34A\" stroke-width=\"1.8\"/><circle cx=\"251\" cy=\"108\" r=\"6\" fill=\"#16A34A\"/><text x=\"251\" y=\"111\" font-size=\"8\" text-anchor=\"middle\" font-weight=\"900\" fill=\"#FFFFFF\">S/</text></g></g></g></svg>",
        compras: "<svg class=\"es es--compras\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Compras\"><defs><clipPath id=\"esShopClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esShopSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FFF7ED\"/><stop offset=\"100%\" stop-color=\"#FED7AA\"/></linearGradient><linearGradient id=\"esBagGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#FB923C\"/><stop offset=\"100%\" stop-color=\"#EA580C\"/></linearGradient><filter id=\"esShopShadow\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"130%\"><feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"3.5\" flood-color=\"#7C2D12\" flood-opacity=\"0.15\"/></filter></defs><g clip-path=\"url(#esShopClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esShopSky)\"/><rect x=\"0\" y=\"96\" width=\"340\" height=\"52\" fill=\"#E2D9CE\"/><!-- Bolsa de compras de tienda con asas --><g filter=\"url(#esShopShadow)\"><path d=\"M 62 46 C 62 26, 96 26, 96 46\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"4.5\" stroke-linecap=\"round\"/><path d=\"M 46 48 L 52 118 H 106 L 112 48 Z\" fill=\"url(#esBagGrad)\"/><path d=\"M 46 48 L 52 118 H 64 L 58 48 Z\" fill=\"rgba(0,0,0,0.08)\"/><circle cx=\"79\" cy=\"80\" r=\"13\" fill=\"#FFFFFF\"/><path d=\"M 73 80 l 4 4 l 8 -8\" stroke=\"#EA580C\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/></g><!-- Caja de regalo con cinta --><rect x=\"114\" y=\"80\" width=\"32\" height=\"36\" rx=\"4\" fill=\"#3B82F6\"/><rect x=\"112\" y=\"76\" width=\"36\" height=\"8\" rx=\"2\" fill=\"#60A5FA\"/><line x1=\"130\" y1=\"76\" x2=\"130\" y2=\"116\" stroke=\"#FEF3C7\" stroke-width=\"4\"/><!-- Escáner POS de código de barras y recibo --><g><rect x=\"195\" y=\"44\" width=\"105\" height=\"72\" rx=\"9\" fill=\"#1E293B\"/><rect x=\"206\" y=\"54\" width=\"83\" height=\"34\" rx=\"4\" fill=\"#020617\"/><circle cx=\"218\" cy=\"71\" r=\"5\" fill=\"#22C55E\"/><rect x=\"228\" y=\"68\" width=\"50\" height=\"6\" rx=\"2\" fill=\"#38BDF8\"/><!-- Recibo emergiendo --><path d=\"M 215 40 v -26 h 38 v 26 l -4 -3 l -5 3 l -5 -3 l -5 3 l -5 -3 l -5 3 l -5 -3 l -4 3 Z\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.5\" class=\"es-flota\"/></g></g></svg>",
        ingreso: "<svg class=\"es es--ingreso\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Ingresos y Ganancias\"><defs><clipPath id=\"esIngClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esIngSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#EFF6FF\"/><stop offset=\"100%\" stop-color=\"#DBEAFE\"/></linearGradient><linearGradient id=\"esPiggyGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#60A5FA\"/><stop offset=\"100%\" stop-color=\"#2563EB\"/></linearGradient></defs><g clip-path=\"url(#esIngClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esIngSky)\"/><rect x=\"0\" y=\"105\" width=\"340\" height=\"43\" fill=\"#BFDBFE\"/><!-- Alcancía cerdito 2.5D --><g><ellipse cx=\"130\" cy=\"78\" rx=\"42\" ry=\"34\" fill=\"url(#esPiggyGrad)\"/><ellipse cx=\"88\" cy=\"82\" rx=\"10\" ry=\"12\" fill=\"#93C5FD\"/><circle cx=\"85\" cy=\"82\" r=\"2.2\" fill=\"#1E293B\"/><circle cx=\"91\" cy=\"82\" r=\"2.2\" fill=\"#1E293B\"/><path d=\"M 112 50 L 124 38 L 126 56 Z\" fill=\"#3B82F6\"/><rect x=\"122\" y=\"44\" width=\"22\" height=\"4\" rx=\"2\" fill=\"#F59E0B\"/></g><!-- Gráfico de barras ascendente --><g><rect x=\"215\" y=\"70\" width=\"24\" height=\"44\" rx=\"4\" fill=\"#F59E0B\"/><rect x=\"245\" y=\"55\" width=\"24\" height=\"59\" rx=\"4\" fill=\"#F59E0B\"/><rect x=\"275\" y=\"38\" width=\"24\" height=\"76\" rx=\"4\" fill=\"#22C55E\"/><polyline points=\"227,66 257,50 287,32\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><polygon points=\"287,30 293,36 283,36\" fill=\"#FFFFFF\"/></g><!-- Moneda de oro cayendo --><g class=\"es-cae\"><circle cx=\"133\" cy=\"22\" r=\"9\" fill=\"#F59E0B\"/><circle cx=\"133\" cy=\"22\" r=\"7.2\" fill=\"#FDE047\"/><text x=\"133\" y=\"25\" font-size=\"8\" text-anchor=\"middle\" font-weight=\"900\" fill=\"#78350F\">$</text></g></g></svg>",
        servicios: "<svg class=\"es es--servicios\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Servicios del Hogar\"><defs><clipPath id=\"esSerClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esSerSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#F1F5F9\"/><stop offset=\"100%\" stop-color=\"#E2E8F0\"/></linearGradient></defs><g clip-path=\"url(#esSerClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esSerSky)\"/><rect x=\"0\" y=\"105\" width=\"340\" height=\"43\" fill=\"#CBD5E1\"/><!-- Hogar con paneles y comodidades --><g><path d=\"M 38 60 L 98 24 L 158 60 V 125 H 38 Z\" fill=\"#FFFFFF\" stroke=\"#E2E8F0\" stroke-width=\"2.5\"/><path d=\"M 28 60 L 98 18 L 168 60 Z\" fill=\"#EA580C\"/><rect x=\"130\" y=\"22\" width=\"14\" height=\"24\" fill=\"#C2410C\"/><rect x=\"58\" y=\"70\" width=\"28\" height=\"24\" rx=\"4\" fill=\"#FEF3C7\" stroke=\"#F59E0B\" stroke-width=\"1.5\"/><rect x=\"106\" y=\"80\" width=\"28\" height=\"45\" rx=\"3\" fill=\"#475569\"/><rect x=\"138\" y=\"78\" width=\"22\" height=\"28\" rx=\"4\" fill=\"#1E293B\"/><rect x=\"142\" y=\"82\" width=\"14\" height=\"8\" rx=\"2\" fill=\"#22C55E\"/></g><!-- Ondas de telecomunicaciones y antena --><g class=\"es-onda\" stroke=\"#0284C7\" stroke-width=\"2.8\" fill=\"none\" stroke-linecap=\"round\"><path d=\"M 108 8 a 14 14 0 0 1 0 -8\"/><path d=\"M 118 14 a 24 24 0 0 1 0 -18\"/><path d=\"M 128 20 a 34 34 0 0 1 0 -28\"/></g><!-- Medidor y relámpago de energía eléctrica --><g class=\"es-flota\"><rect x=\"215\" y=\"65\" width=\"85\" height=\"55\" rx=\"8\" fill=\"#2563EB\"/><rect x=\"232\" y=\"40\" width=\"52\" height=\"34\" rx=\"3\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.5\"/><path d=\"M 258 45 l -4 8 h 5 l -3 8\" stroke=\"#F59E0B\" stroke-width=\"1.8\"/></g></g></svg>",
        multa: "<svg class=\"es es--multa\" viewBox=\"0 0 340 148\" role=\"img\" aria-label=\"Multas y Trámites\"><defs><clipPath id=\"esMulClip\"><rect width=\"340\" height=\"148\" rx=\"20\"/></clipPath><linearGradient id=\"esMulSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#F8FAFC\"/><stop offset=\"100%\" stop-color=\"#E2E8F0\"/></linearGradient></defs><g clip-path=\"url(#esMulClip)\"><rect width=\"340\" height=\"148\" fill=\"url(#esMulSky)\"/><rect x=\"0\" y=\"105\" width=\"340\" height=\"43\" fill=\"#334155\"/><line x1=\"0\" y1=\"124\" x2=\"340\" y2=\"124\" stroke=\"#CBD5E1\" stroke-width=\"4\" stroke-dasharray=\"16 12\"/><!-- Señal vial de velocidad --><line x1=\"265\" y1=\"45\" x2=\"265\" y2=\"128\" stroke=\"#475569\" stroke-width=\"5\" stroke-linecap=\"round\"/><circle cx=\"265\" cy=\"40\" r=\"22\" fill=\"#FFFFFF\" stroke=\"#DC2626\" stroke-width=\"5\"/><path d=\"M 250 55 L 280 25\" stroke=\"#DC2626\" stroke-width=\"5\"/><text x=\"265\" y=\"48\" font-size=\"20\" font-weight=\"900\" text-anchor=\"middle\" fill=\"#0F172A\">E</text><!-- Cono vial de seguridad --><ellipse cx=\"180\" cy=\"126\" rx=\"24\" ry=\"7\" fill=\"#0F172A\"/><path d=\"M 166 124 L 178 52 h 5 L 194 124 Z\" fill=\"#EA580C\"/><path d=\"M 170 102 L 174 76 h 12 L 190 102 Z\" fill=\"#FFFFFF\"/><!-- Vehículo de patrulla con sirena --><g stroke=\"#1E293B\" stroke-width=\"2.6\" stroke-linejoin=\"round\"><path d=\"M 28 122 V 98 q 0 -8 10 -10 l 24 -24 q 4 -5 12 -5 h 52 q 8 0 12 5 l 18 24 q 8 2 8 10 v 24 Z\" fill=\"#3B82F6\"/><rect x=\"92\" y=\"68\" width=\"32\" height=\"42\" rx=\"3\" fill=\"#FEF3C7\" stroke=\"#DC2626\" stroke-width=\"1.8\" transform=\"rotate(-12 92 68)\"/></g></g></svg>"
    };

    window.escenaMovimiento = function (tipo, rubro, descripcion) {
        if (tipo === 'deposit') return ESCENAS.ingreso;

        // 1. La descripción específica del usuario tiene máxima prioridad
        // (ejemplo: 'KFC', 'Luna polarizada', 'Petróleo', 'Universidad Nayli')
        var idDesc = familia(descripcion);
        if (idDesc) return ESCENAS[idDesc];

        // 2. Si la descripción no contiene palabra clave, usamos el rubro o categoría
        var idRubro = familia(rubro);
        if (idRubro) return ESCENAS[idRubro];

        // 3. Fallback inteligente
        return ESCENAS.compras;
    };

    window.escenaMovimiento.familias = Object.keys(ESCENAS);
})();
