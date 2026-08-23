/* ============================================================
   SHELL MÓVIL — portada tipo app de banca
   ------------------------------------------------------------
   Debajo de 768px la página deja de ser "escritorio encogido":
   la cabecera flotante se apaga y arriba del centro aparece el
   bloque #mshell con barra propia y tarjeta de saldo. Los métodos
   de pago y los gráficos pasan a carruseles con puntos, y el feed
   del día se va a un panel que entra desde la derecha.

   Principio: NADA se duplica. Los tres bloques que la portada
   necesita ya existen en el HTML de escritorio, así que se MUEVEN
   con appendChild y se devuelven a su hueco original al volver a
   pantalla ancha. Por eso app.js sigue funcionando sin tocar:
   #currentBalance es el mismo nodo, sólo cambia de padre.

   El resumen del ciclo NO sube a la portada: se queda en el cajón
   lateral, a un toque de "Rubros".
   ============================================================ */
(function () {
    'use strict';

    var MQ = window.matchMedia('(max-width: 768px)');

    /* Cada pieza guarda de dónde salió para poder regresarla exactamente
       al mismo sitio (padre + hermano siguiente), no sólo al mismo padre. */
    var piezas = [];

    function registrar(nodo, destino) {
        if (!nodo || !destino) return;
        piezas.push({
            nodo: nodo,
            destino: destino,
            padre: nodo.parentNode,
            antesDe: nodo.nextElementSibling
        });
    }

    function aplicar(esMovil) {
        piezas.forEach(function (p) {
            var quiere = esMovil ? p.destino : p.padre;
            if (p.nodo.parentNode === quiere) return;
            if (esMovil) {
                p.destino.appendChild(p.nodo);
            } else if (p.antesDe && p.antesDe.parentNode === p.padre) {
                p.padre.insertBefore(p.nodo, p.antesDe);
            } else {
                p.padre.appendChild(p.nodo);
            }
        });
        document.body.classList.toggle('is-mshell', esMovil);
    }

    /* ========================================================
       CARRUSELES CON PUNTOS
       --------------------------------------------------------
       Dos filas deslizables comparten la misma mecánica: los
       métodos de pago y los dos gráficos. En vez de dos scripts
       casi iguales, una sola función que añade los puntos, los
       mantiene sincronizados con el desplazamiento y —si se le
       pide— pasa de tarjeta sola cada cierto tiempo.

       El giro automático se detiene en cuanto el usuario toca:
       una tarjeta que se mueve sola bajo el dedo es lo contrario
       de una ayuda. Vuelve a arrancar tras unos segundos quieto.
       ======================================================== */
    var REDUCIDO = window.matchMedia('(prefers-reduced-motion: reduce)');

    function carrusel(deck, autoMs) {
        if (!deck || !deck.parentNode) return;

        /* Marca de "hay más a este lado": la usa el CSS para desvanecer
           el borde por donde el contenido se sale, en vez de cortarlo a
           cuchillo. */
        deck.classList.add('mcut');

        var puntos = document.createElement('div');
        puntos.className = 'mdots';
        /* Decorativo: el contenido real ya está en las tarjetas y se
           alcanza deslizando, así que el lector de pantalla no gana nada
           anunciando cuatro botones "1 de 3". */
        puntos.setAttribute('aria-hidden', 'true');
        deck.parentNode.insertBefore(puntos, deck.nextSibling);

        var pausaHasta = 0;   /* marca de tiempo hasta la que no se gira */
        var propio = 0;       /* fin del último desplazamiento provocado por aquí */
        var visible = true;

        /* Las tarjetas ocultas (el tercer gráfico vive con display:none)
           no cuentan: si contaran, un punto no llevaría a ninguna parte. */
        function tarjetas() {
            return Array.prototype.filter.call(deck.children, function (el) {
                return el.offsetWidth > 0;
            });
        }

        function inicio(el) {
            return el.getBoundingClientRect().left -
                deck.getBoundingClientRect().left + deck.scrollLeft;
        }

        function indice() {
            var t = tarjetas(), i = 0, mejor = Infinity;
            t.forEach(function (el, n) {
                var d = Math.abs(inicio(el) - deck.scrollLeft);
                if (d < mejor) { mejor = d; i = n; }
            });
            return i;
        }

        function pintar() {
            var n = tarjetas().length;
            if (puntos.children.length !== n) {
                puntos.innerHTML = '';
                for (var i = 0; i < n; i++) {
                    puntos.appendChild(document.createElement('i')).className = 'mdot';
                }
            }
            puntos.style.display = n > 1 ? '' : 'none';
            var act = indice();
            Array.prototype.forEach.call(puntos.children, function (p, i) {
                p.classList.toggle('is-on', i === act);
            });

            /* El desvanecido sólo se enciende en el lado que de verdad
               esconde algo: al principio del mazo, con la primera tarjeta
               pegada al margen, un velo a la izquierda sólo la ensuciaría. */
            var tope = deck.scrollWidth - deck.clientWidth;
            deck.classList.toggle('is-cut-l', deck.scrollLeft > 4);
            deck.classList.toggle('is-cut-r', deck.scrollLeft < tope - 4);
        }

        function irA(i) {
            var t = tarjetas();
            if (!t[i]) return;
            propio = Date.now() + 700;
            deck.scrollTo({ left: inicio(t[i]), behavior: 'smooth' });
        }

        function pausar() { pausaHasta = Date.now() + 9000; }

        deck.addEventListener('scroll', function () {
            pintar();
            /* Un desplazamiento que no salió de aquí es del usuario */
            if (Date.now() > propio) pausar();
        }, { passive: true });

        ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) {
            deck.addEventListener(ev, pausar, { passive: true });
        });

        puntos.addEventListener('click', function (e) {
            var i = Array.prototype.indexOf.call(puntos.children, e.target);
            if (i >= 0) { pausar(); irA(i); }
        });

        /* app.js reconstruye el mazo de métodos con innerHTML en cada
           render: sin esto los puntos se quedarían con la cuenta vieja. */
        new MutationObserver(pintar).observe(deck, { childList: true });

        if (window.IntersectionObserver) {
            new IntersectionObserver(function (e) {
                visible = e[0].isIntersecting;
            }, { threshold: 0.35 }).observe(deck);
        }

        pintar();

        if (!autoMs) return;
        setInterval(function () {
            if (!MQ.matches || !visible || document.hidden) return;
            if (REDUCIDO.matches || Date.now() < pausaHasta) return;
            var t = tarjetas();
            if (t.length < 2) return;
            irA((indice() + 1) % t.length);
        }, autoMs);
    }

    /* ========================================================
       HISTORIAL — panel derecho y gesto
       --------------------------------------------------------
       La portada acaba en los gráficos; el feed del día entra
       desde la derecha, deslizando sobre cualquier zona libre o
       con el botón del final de la portada.
       ======================================================== */
    function historial() {
        var panel = document.getElementById('mhist');
        var velo = document.getElementById('mhistOverlay');
        if (!panel || !velo) return;

        function abrir(si) {
            panel.classList.toggle('is-open', si);
            velo.classList.toggle('is-open', si);
            panel.setAttribute('aria-hidden', si ? 'false' : 'true');
            document.body.classList.toggle('is-mhist-open', si);
            /* El scroll del fondo se bloquea mientras el panel está fuera:
               si no, el dedo mueve la portada por detrás del historial. */
            document.body.style.overflow = si ? 'hidden' : '';
        }

        var btn = document.getElementById('mhistOpen');
        if (btn) btn.addEventListener('click', function () { abrir(true); });
        var x = document.getElementById('mhistClose');
        if (x) x.addEventListener('click', function () { abrir(false); });
        velo.addEventListener('click', function () { abrir(false); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('is-open')) abrir(false);
        });

        /* ---- El gesto ----
           El panel sigue al dedo mientras se arrastra, en vez de esperar a
           que se suelte para decidir. Eso es lo que hace que se sienta
           conectado: se ve cuánto llevas abierto y se puede echar atrás a
           mitad de camino.

           Al soltar manda la velocidad antes que la distancia: un lanzamiento
           corto pero rápido abre igual, que es lo que espera la mano. Si el
           dedo iba despacio, decide por dónde quedó: pasada la mitad, abre. */
        var x0 = 0, y0 = 0, t0 = 0;
        var eje = 0;          /* 0 sin decidir · 1 horizontal · -1 vertical */
        var activo = false;
        var partiaAbierto = false;

        function zonaLibre(destino) {
            if (!destino || !destino.closest) return true;
            /* Los carruseles ya usan el desplazamiento horizontal para lo
               suyo, y sobre un modal abierto no manda esta página. */
            return !destino.closest('.pm-deck--header, .charts-section, .modal-bg.active, .sidebar-left');
        }

        function ancho() { return panel.offsetWidth || window.innerWidth || 1; }

        /* p: 0 = fuera de pantalla · 1 = del todo dentro */
        function arrastrar(p) {
            panel.style.transform = 'translateX(' + ((1 - p) * 100) + '%)';
            velo.style.opacity = p.toFixed(3);
        }

        document.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) { activo = false; return; }
            var t = e.touches[0];
            x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
            eje = 0;
            partiaAbierto = panel.classList.contains('is-open');
            activo = MQ.matches &&
                !document.querySelector('.modal-bg.active') &&
                zonaLibre(e.target);
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            if (!activo) return;
            var t = e.touches[0];
            var dx = t.clientX - x0;
            var dy = t.clientY - y0;

            /* Primero se decide el eje y luego ya no se cambia: sin este
               bloqueo, un desplazamiento vertical con algo de temblor
               lateral empezaría a mover el panel a media lectura. */
            if (!eje) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                eje = Math.abs(dx) > Math.abs(dy) * 1.3 ? 1 : -1;
                if (eje !== 1) { activo = false; return; }
                /* Nada de arrastrar el panel hacia dentro si ya está dentro,
                   ni hacia fuera si ya está fuera: ese gesto no es para aquí. */
                if ((!partiaAbierto && dx > 0) || (partiaAbierto && dx < 0)) { activo = false; return; }
                panel.classList.add('is-drag');
                velo.classList.add('is-drag', 'is-open');
            }

            /* Con el eje ya bloqueado, el movimiento es nuestro: si no, el
               navegador seguiría desplazando la página por debajo. */
            if (e.cancelable) e.preventDefault();

            /* Cerrado, el dedo hacia la izquierda mete el panel; abierto,
               hacia la derecha lo saca. Un solo signo para los dos casos. */
            var p = (partiaAbierto ? 1 : 0) - dx / ancho();
            /* Banda elástica en los topes, para que no se sienta un muro */
            if (p > 1) p = 1 + (p - 1) * 0.18;
            if (p < 0) p = p * 0.18;
            arrastrar(Math.max(-0.08, Math.min(1.08, p)));
        }, { passive: false });

        function soltar(e) {
            if (!activo) return;
            activo = false;
            if (eje !== 1) return;

            var t = e.changedTouches && e.changedTouches[0];
            if (!t) return;
            var dx = t.clientX - x0;
            var v = dx / Math.max(1, Date.now() - t0);   /* px por ms */
            var p = (partiaAbierto ? 1 : 0) - dx / ancho();

            /* El lanzamiento manda, pero pidiéndole también un mínimo de
               recorrido: si no, un roce rápido de 20px abriría el panel. */
            var quedaAbierto = (Math.abs(v) > 0.4 && Math.abs(dx) > 24) ? v < 0 : p > 0.5;

            /* Primero se devuelve la transición y luego se sueltan los
               estilos en línea: así el panel viaja desde donde lo dejó el
               dedo hasta su sitio, en vez de saltar. */
            panel.classList.remove('is-drag');
            velo.classList.remove('is-drag');
            panel.style.transform = '';
            velo.style.opacity = '';
            abrir(quedaAbierto);
        }

        document.addEventListener('touchend', soltar, { passive: true });
        document.addEventListener('touchcancel', soltar, { passive: true });

        /* Al volver a escritorio el feed se va del panel: dejarlo abierto
           sería dejar un cajón vacío tapando media pantalla. */
        if (MQ.addEventListener) MQ.addEventListener('change', function (e) { if (!e.matches) abrir(false); });
        else if (MQ.addListener) MQ.addListener(function (e) { if (!e.matches) abrir(false); });
    }

    /* ========================================================
       HOJA DE DETALLE — arrastrar hacia abajo para cerrar
       --------------------------------------------------------
       El asa que dibuja el CSS promete este gesto; esto lo cumple.
       Sólo cuenta si la hoja está arriba del todo: si el dedo baja
       con la hoja desplazada, lo que quiere es leer, no cerrar.
       ======================================================== */
    function hojaDetalle() {
        var fondo = document.getElementById('viewRecordModal');
        if (!fondo) return;
        var hoja = fondo.querySelector('.modal');
        if (!hoja) return;

        var y0 = 0, x0 = 0, sigue = false;

        hoja.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) { sigue = false; return; }
            y0 = e.touches[0].clientY;
            x0 = e.touches[0].clientX;
            sigue = MQ.matches && hoja.scrollTop <= 0;
        }, { passive: true });

        hoja.addEventListener('touchend', function (e) {
            if (!sigue) return;
            sigue = false;
            var t = e.changedTouches && e.changedTouches[0];
            if (!t) return;
            if (t.clientY - y0 < 90 || Math.abs(t.clientX - x0) > 60) return;
            /* Se cierra por el mismo botón que ya sabe cerrarlo, en vez de
               replicar aquí lo que hace closeM. */
            var x = fondo.querySelector('.modal-x');
            if (x) x.click();
        }, { passive: true });
    }

    function init() {
        var shell = document.getElementById('mshell');
        if (!shell) return;

        registrar(document.querySelector('.header-actions'), document.getElementById('mshellActions'));
        registrar(document.querySelector('.bal-pill'), document.getElementById('mcardBal'));
        registrar(document.getElementById('dailyView'), document.getElementById('mhistBody'));
        /* Los comprobantes, dentro de la misma ficha que fecha, método y
           descripción. Sueltos debajo alargaban la hoja de detalle casi el
           doble en cuanto el gasto llevaba una foto. */
        registrar(document.getElementById('viewRecordImageWrap'),
                  document.querySelector('#viewRecordModal .vr-card'));

        /* Cada botón del shell reutiliza el que ya abre ese modal en el
           HTML de escritorio, así no hay una segunda ruta que mantener. */
        var abre = function (id) {
            return function () {
                var b = document.getElementById(id);
                if (b) b.click();
            };
        };
        /* Acciones de la cartera. Ninguna es un botón de adorno: la píldora
           abre el mismo modal de depósito y el redondo de la izquierda, el
           filtro de ciclos que ya vive en la barra inferior. */
        var cd = document.getElementById('mcardDeposit');
        if (cd) cd.addEventListener('click', abre('openDepositModal'));
        var cs = document.getElementById('mcardSwap');
        if (cs) cs.addEventListener('click', abre('bnavFilter'));

        /* Ojo: tapar el saldo cuando alguien mira por encima del hombro.
           La preferencia se recuerda; si no, habría que taparlo otra vez en
           cada recarga, que es justo cuando molesta. */
        var caja = document.getElementById('mcardBal');
        var ojo = document.getElementById('mcardEye');
        if (caja && ojo) {
            var icono = ojo.querySelector('.material-symbols-outlined');
            var pintarOjo = function (oculto) {
                caja.classList.toggle('is-oculto', oculto);
                if (icono) icono.textContent = oculto ? 'visibility' : 'visibility_off';
                ojo.setAttribute('aria-label', oculto ? 'Mostrar saldo' : 'Ocultar saldo');
            };
            var guardado = false;
            try { guardado = localStorage.getItem('ct_saldo_oculto') === '1'; } catch (e) {}
            pintarOjo(guardado);
            ojo.addEventListener('click', function () {
                var oculto = !caja.classList.contains('is-oculto');
                pintarOjo(oculto);
                try { localStorage.setItem('ct_saldo_oculto', oculto ? '1' : '0'); } catch (e) {}
            });
        }

        /* Etiqueta de ciclo en la tarjeta: espeja el filtro de ciclos.
           app.js reconstruye ese <select> con innerHTML (sin disparar
           'change'), de ahí el observer además del listener. */
        var sel = document.getElementById('monthFilter');
        var chip = document.getElementById('mcardCycle');
        if (sel && chip) {
            var pintarCiclo = function () {
                var o = sel.selectedOptions && sel.selectedOptions[0];
                var t = o ? o.textContent.trim() : '';
                chip.textContent = t && t !== 'Todos los ciclos' ? t : 'Todos los ciclos';
            };
            sel.addEventListener('change', pintarCiclo);
            new MutationObserver(pintarCiclo).observe(sel, { childList: true, subtree: true });
            pintarCiclo();
        }

        /* 6,5s: lo bastante lento como para leer una tarjeta entera
           antes de que pase a la siguiente. Los gráficos no giran solos:
           ahí el usuario está comparando, no ojeando. */
        historial();
        hojaDetalle();

        carrusel(document.getElementById('payMethods'), 6500);
        carrusel(document.querySelector('.charts-section'), 0);

        aplicar(MQ.matches);
        /* addListener: Safari < 14 no tiene addEventListener en MediaQueryList */
        if (MQ.addEventListener) MQ.addEventListener('change', function (e) { aplicar(e.matches); });
        else if (MQ.addListener) MQ.addListener(function (e) { aplicar(e.matches); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
