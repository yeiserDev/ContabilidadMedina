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

        /* ---- El buscador de la cabecera ----
           No abre otra pantalla: el campo se despliega sobre la misma
           pastilla. Lo que escribe va al buscador que ya existe, así que
           filtra por el mismo camino de siempre y las dos cajas quedan
           diciendo lo mismo. */
        var bus = document.getElementById('mbus');
        var busInp = document.getElementById('mbusInput');
        var busBtn = document.getElementById('mbusBtn');
        var busCiclo = document.getElementById('mbusCiclo');
        var espejo = document.getElementById('mobileSearchInput');

        function buscar(texto) {
            if (!espejo) return;
            espejo.value = texto;
            espejo.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (bus && busInp && busBtn) {
            busBtn.addEventListener('click', function () {
                var abriendo = !bus.classList.contains('is-buscando');
                bus.classList.toggle('is-buscando', abriendo);
                busBtn.querySelector('.material-symbols-outlined').textContent = abriendo ? 'close' : 'search';
                busBtn.setAttribute('aria-label', abriendo ? 'Cerrar búsqueda' : 'Buscar');
                if (abriendo) {
                    busInp.focus();
                } else {
                    /* Al cerrar se limpia: dejar un filtro puesto y esconder
                       el texto que lo puso es la forma más rápida de que
                       alguien crea que perdió movimientos. */
                    busInp.value = '';
                    buscar('');
                }
            });
            busInp.addEventListener('input', function () { buscar(busInp.value); });
        }
        /* abre() vive en init(), no aquí: el filtro se abre por su propio
           botón de la barra, que es el que ya sabe hacerlo. */
        if (busCiclo) busCiclo.addEventListener('click', function () {
            var f = document.getElementById('bnavFilter');
            if (f) f.click();
        });

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
       La hoja va pegada al dedo mientras baja y el velo se aclara
       con ella: al soltar, o se marcha o vuelve a su sitio. Antes
       no se movía nada y la hoja desaparecía de golpe.
       ======================================================== */
    function hojaDetalle() {
        var fondo = document.getElementById('viewRecordModal');
        if (!fondo) return;
        var hoja = fondo.querySelector('.modal');
        if (!hoja) return;

        var y0 = 0, x0 = 0, t0 = 0;
        var eje = 0;          /* 0 sin decidir · 1 vertical · -1 horizontal */
        var activo = false;

        function arrastrar(dy) {
            hoja.style.transform = 'translateY(' + dy + 'px)';
            /* Sólo se aclara el velo, no la hoja: si se desvaneciera entera
               parecería que se apaga, y lo que hace es marcharse. */
            var p = Math.min(1, dy / (hoja.offsetHeight || 400));
            fondo.style.background = 'rgba(20, 20, 19, ' + (0.3 * (1 - p * 0.85)).toFixed(3) + ')';
        }

        function limpiar() {
            hoja.classList.remove('is-drag');
            fondo.classList.remove('is-drag');
            hoja.style.transform = '';
            fondo.style.background = '';
        }

        hoja.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) { activo = false; return; }
            var t = e.touches[0];
            y0 = t.clientY; x0 = t.clientX; t0 = Date.now();
            eje = 0;
            /* Sólo cuenta con la hoja arriba del todo: si el dedo baja con el
               contenido desplazado, lo que quiere es leer, no cerrar. */
            activo = MQ.matches && hoja.scrollTop <= 0;
        }, { passive: true });

        hoja.addEventListener('touchmove', function (e) {
            if (!activo) return;
            var t = e.touches[0];
            var dy = t.clientY - y0;
            var dx = t.clientX - x0;

            if (!eje) {
                if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
                eje = Math.abs(dy) > Math.abs(dx) * 1.3 ? 1 : -1;
                /* Hacia arriba no hay nada que hacer: eso es desplazar la
                   ficha, no cerrarla. */
                if (eje !== 1 || dy < 0) { activo = false; return; }
                hoja.classList.add('is-drag');
                fondo.classList.add('is-drag');
            }

            if (e.cancelable) e.preventDefault();
            /* Resistencia al principio del recorrido: los primeros píxeles
               cuestan, así que un roce no arranca la hoja. */
            arrastrar(dy < 0 ? dy * 0.2 : dy);
        }, { passive: false });

        function soltar(e) {
            if (!activo) return;
            activo = false;
            if (eje !== 1) return;

            var t = e.changedTouches && e.changedTouches[0];
            if (!t) { limpiar(); return; }
            var dy = Math.max(0, t.clientY - y0);
            var v = dy / Math.max(1, Date.now() - t0);   /* px por ms */

            /* Devolver la transición antes de soltar el estilo en línea: así
               la hoja viaja desde donde la dejó el dedo, en vez de saltar. */
            limpiar();

            if ((v > 0.5 && dy > 40) || dy > 110) {
                /* Se cierra por el mismo botón que ya sabe cerrarlo, en vez
                   de repetir aquí lo que hace closeM. */
                var x = fondo.querySelector('.modal-x');
                if (x) x.click();
            }
        }

        hoja.addEventListener('touchend', soltar, { passive: true });
        hoja.addEventListener('touchcancel', soltar, { passive: true });
    }

    /* ========================================================
       LA LENTE DE LA BARRA
       --------------------------------------------------------
       Al apoyar el dedo aparece una lente de cristal debajo y lo
       sigue mientras se desliza de un icono a otro; al soltar,
       encaja en el más cercano.

       Dos capas se mueven con la misma medida: la gota, que va
       bajo el filtro y hace que la forma se funda y se estire con
       la barra, y la lente, que es la que desenfoca y satura lo
       que pasa por debajo.
       ======================================================== */
    function gotaBarra() {
        var barra = document.getElementById('bottomNav');
        var capa = barra && barra.querySelector('.bnav-goo');
        var gota = document.getElementById('bnavGota');
        var lente = document.getElementById('bnavLente');
        if (!barra || !capa || !gota || !lente) return;

        var botones = Array.prototype.slice.call(barra.querySelectorAll('.bnav-btn'));
        var arrastrando = false, movio = false, x0 = 0, apagar = null;
        var tragar = false, soltarTragar = null;

        /* Si el arrastre empieza y acaba dentro del mismo botón, el navegador
           manda además su clic nativo: sin este portero se abriría dos veces
           lo que se haya tocado. Se traga uno y sólo uno. */
        barra.addEventListener('click', function (e) {
            if (!tragar) return;
            tragar = false;
            clearTimeout(soltarTragar);
            e.stopPropagation();
            e.preventDefault();
        }, true);

        function local(clientX) {
            var r = barra.getBoundingClientRect();
            /* Pegada a los extremos la lente se sale de la barra; se queda
               dentro con el margen de su propio radio. */
            return Math.max(30, Math.min(r.width - 30, clientX - r.left));
        }

        function centro(btn) {
            var r = barra.getBoundingClientRect();
            var b = btn.getBoundingClientRect();
            return b.left - r.left + b.width / 2;
        }

        function colocar(x) {
            gota.style.setProperty('--gota-x', x + 'px');
            lente.style.setProperty('--gota-x', x + 'px');
        }

        function cercano(x) {
            var mejor = null, dist = Infinity;
            botones.forEach(function (b) {
                var d = Math.abs(centro(b) - x);
                if (d < dist) { dist = d; mejor = b; }
            });
            return mejor;
        }

        function resaltar(btn) {
            botones.forEach(function (b) { b.classList.toggle('is-bajo', b === btn); });
        }

        function encender(x) {
            colocar(x);
            resaltar(cercano(x));
            capa.classList.add('is-activa');
            barra.classList.add('is-tocando');
        }

        barra.addEventListener('pointerdown', function (e) {
            if (!MQ.matches) return;
            arrastrando = true;
            movio = false;
            x0 = e.clientX;
            clearTimeout(apagar);
            barra.classList.add('bnav--arrastre');
            encender(local(e.clientX));
            /* Con la captura, el dedo puede salirse de la barra y la lente
               sigue respondiendo hasta que se suelta. */
            if (barra.setPointerCapture) { try { barra.setPointerCapture(e.pointerId); } catch (err) {} }
        });

        barra.addEventListener('pointermove', function (e) {
            if (!arrastrando) return;
            if (Math.abs(e.clientX - x0) > 8) movio = true;
            encender(local(e.clientX));
        });

        function soltar(e) {
            if (!arrastrando) return;
            arrastrando = false;
            /* Se devuelve la transición antes de colocarla en su sitio: así
               la lente viaja hasta el icono en vez de saltar. */
            barra.classList.remove('bnav--arrastre');

            var btn = cercano(local(e.clientX));
            if (btn) {
                colocar(centro(btn));
                resaltar(btn);
                /* Sólo se dispara a mano si hubo arrastre. En un toque limpio
                   el clic nativo del botón ya llega solo, y hacerlo aquí
                   además abriría dos veces. */
                if (movio) {
                    btn.click();
                    tragar = true;
                    clearTimeout(soltarTragar);
                    /* Si el clic nativo no llega —porque el dedo acabó en otro
                       botón—, el portero se retira solo. */
                    soltarTragar = setTimeout(function () { tragar = false; }, 400);
                }
            }

            apagar = setTimeout(function () {
                barra.classList.remove('is-tocando');
                capa.classList.remove('is-activa');
                resaltar(null);
            }, 850);
        }

        barra.addEventListener('pointerup', soltar);
        barra.addEventListener('pointercancel', soltar);
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
            var enBusca = document.getElementById('mbusCicloTxt');
            var pintarCiclo = function () {
                var o = sel.selectedOptions && sel.selectedOptions[0];
                var t = o ? o.textContent.trim() : '';
                t = t || 'Todos los ciclos';
                chip.textContent = t;
                /* La misma etiqueta manda en la cartera y en el buscador del
                   historial: dos sitios, una sola fuente. */
                if (enBusca) enBusca.textContent = t;
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
        gotaBarra();

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
