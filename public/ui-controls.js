/* ============================================================
   UI CONTROLS — select y datepicker propios
   ------------------------------------------------------------
   El desplegable de <select> y el calendario de <input type="date">
   los dibuja el sistema operativo, no la página: ninguna regla CSS
   los alcanza. Para que sigan el diseño hay que reemplazarlos.

   Principio: el elemento nativo NUNCA se quita del DOM. Sigue siendo
   el que guarda el valor, así que todo app.js (que lee y escribe
   .value y escucha 'change') funciona sin cambios. Lo que se sustituye
   es solamente la superficie visible.
   ============================================================ */
(function () {
    'use strict';

    var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    var DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

    /* Un solo popup abierto a la vez en toda la app */
    var abierto = null;
    function cerrarAbierto() { if (abierto) { abierto(); abierto = null; } }

    /* Los popups se posicionan con position:fixed y coordenadas calculadas,
       para que no los recorte el overflow del modal que los contiene. */
    function colocar(panel, ancla) {
        var r = ancla.getBoundingClientRect();
        var alto = panel.offsetHeight;
        var margen = 8;
        var abajo = window.innerHeight - r.bottom - margen;
        var haciaArriba = abajo < alto && r.top > abajo;

        panel.style.left = r.left + 'px';
        panel.style.minWidth = r.width + 'px';
        panel.style.maxHeight = Math.max(160, (haciaArriba ? r.top : abajo) - margen) + 'px';
        if (haciaArriba) {
            panel.style.top = 'auto';
            panel.style.bottom = (window.innerHeight - r.top + 6) + 'px';
        } else {
            panel.style.bottom = 'auto';
            panel.style.top = (r.bottom + 6) + 'px';
        }
    }

    /* ========================================================
       SELECT
       ======================================================== */
    function mejorarSelect(sel) {
        if (sel.dataset.xsel) return;
        sel.dataset.xsel = '1';
        sel.setAttribute('tabindex', '-1');
        sel.setAttribute('aria-hidden', 'true');

        var cont = document.createElement('div');
        cont.className = 'xsel';
        sel.parentNode.insertBefore(cont, sel);
        cont.appendChild(sel);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'xsel-btn';
        btn.setAttribute('aria-haspopup', 'listbox');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<span class="xsel-val"></span>' +
            '<span class="material-symbols-outlined xsel-arrow">expand_more</span>';
        cont.appendChild(btn);

        var panel = document.createElement('div');
        panel.className = 'xsel-panel';
        panel.setAttribute('role', 'listbox');
        panel.hidden = true;
        document.body.appendChild(panel);

        var indice = -1;

        function etiqueta() {
            var o = sel.selectedOptions && sel.selectedOptions[0];
            var t = o ? o.textContent.trim() : '';
            btn.querySelector('.xsel-val').textContent = t || '—';
            btn.classList.toggle('is-placeholder', !t);
        }

        function pintar() {
            panel.innerHTML = '';
            Array.prototype.forEach.call(sel.options, function (o, i) {
                var it = document.createElement('div');
                it.className = 'xsel-opt';
                it.setAttribute('role', 'option');
                it.textContent = o.textContent;
                it.dataset.i = i;
                if (o.disabled) it.classList.add('is-disabled');
                if (i === sel.selectedIndex) {
                    it.classList.add('is-sel');
                    it.setAttribute('aria-selected', 'true');
                }
                panel.appendChild(it);
            });
        }

        function marcar(i) {
            var items = panel.querySelectorAll('.xsel-opt');
            if (!items.length) return;
            if (i < 0) i = 0;
            if (i >= items.length) i = items.length - 1;
            indice = i;
            items.forEach(function (el) { el.classList.remove('is-activo'); });
            items[i].classList.add('is-activo');
            items[i].scrollIntoView({ block: 'nearest' });
        }

        function abrir() {
            if (sel.disabled) return;
            cerrarAbierto();
            pintar();
            panel.hidden = false;
            panel.classList.add('is-abierto');
            colocar(panel, btn);
            btn.setAttribute('aria-expanded', 'true');
            marcar(sel.selectedIndex < 0 ? 0 : sel.selectedIndex);
            abierto = cerrar;
        }

        function cerrar() {
            panel.hidden = true;
            panel.classList.remove('is-abierto');
            btn.setAttribute('aria-expanded', 'false');
            if (abierto === cerrar) abierto = null;
        }

        function elegir(i) {
            if (sel.options[i] && sel.options[i].disabled) return;
            sel.selectedIndex = i;
            etiqueta();
            /* Evento real y burbujeante: los listeners de app.js siguen
               respondiendo igual que con el select nativo. */
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            cerrar();
            btn.focus();
        }

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            panel.hidden ? abrir() : cerrar();
        });

        panel.addEventListener('click', function (e) {
            var it = e.target.closest('.xsel-opt');
            if (it && !it.classList.contains('is-disabled')) elegir(+it.dataset.i);
        });

        panel.addEventListener('mousemove', function (e) {
            var it = e.target.closest('.xsel-opt');
            if (it) marcar(+it.dataset.i);
        });

        btn.addEventListener('keydown', function (e) {
            var k = e.key;
            if (panel.hidden) {
                if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
                    e.preventDefault(); abrir();
                }
                return;
            }
            if (k === 'ArrowDown') { e.preventDefault(); marcar(indice + 1); }
            else if (k === 'ArrowUp') { e.preventDefault(); marcar(indice - 1); }
            else if (k === 'Home') { e.preventDefault(); marcar(0); }
            else if (k === 'End') { e.preventDefault(); marcar(sel.options.length - 1); }
            else if (k === 'Enter' || k === ' ') { e.preventDefault(); elegir(indice); }
            else if (k === 'Escape') { e.preventDefault(); cerrar(); btn.focus(); }
            else if (k === 'Tab') { cerrar(); }
            else if (k.length === 1) {
                /* Búsqueda por primera letra, igual que el select nativo */
                var q = k.toLowerCase();
                for (var n = 1; n <= sel.options.length; n++) {
                    var i = (indice + n) % sel.options.length;
                    if (sel.options[i].textContent.trim().toLowerCase().indexOf(q) === 0) { marcar(i); break; }
                }
            }
        });

        /* Sincronización con app.js, por dos vías distintas:

           1) Las listas de rubros y de personas se reconstruyen con innerHTML.
              Eso sí lo ve un MutationObserver. */
        new MutationObserver(function () {
            etiqueta();
            if (!panel.hidden) pintar();
        }).observe(sel, { childList: true, subtree: true });

        sel.addEventListener('change', etiqueta);

        /* 2) app.js también asigna `.value` por código al editar un gasto o un
              préstamo. Eso no dispara 'change' ni modifica ningún atributo, así
              que no hay evento ni mutación que observar: la única forma de
              enterarse es interceptar la propiedad en esta instancia. */
        ['value', 'selectedIndex'].forEach(function (prop) {
            var base = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
            if (!base || !base.set) return;
            Object.defineProperty(sel, prop, {
                configurable: true,
                enumerable: false,
                get: function () { return base.get.call(this); },
                set: function (v) { base.set.call(this, v); etiqueta(); }
            });
        });

        etiqueta();
        return etiqueta;
    }

    /* ========================================================
       DATEPICKER
       ======================================================== */

    /* new Date('2026-08-08') se interpreta como UTC y en Perú (UTC-5)
       retrocede un día. Por eso se parsea y formatea a mano. */
    function aFecha(s) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }
    function aTexto(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
    function mismoDia(a, b) {
        return a && b && a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function mejorarFecha(inp) {
        if (inp.dataset.xdate) return;
        inp.dataset.xdate = '1';

        var cont = document.createElement('div');
        cont.className = 'xdate';
        inp.parentNode.insertBefore(cont, inp);
        cont.appendChild(inp);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'xdate-btn';
        btn.setAttribute('aria-label', 'Abrir calendario');
        btn.innerHTML = '<span class="material-symbols-outlined">calendar_month</span>';
        cont.appendChild(btn);

        var panel = document.createElement('div');
        panel.className = 'xdate-panel';
        panel.hidden = true;
        document.body.appendChild(panel);

        var cursor = null;

        function pintar() {
            var sel = aFecha(inp.value);
            var hoy = new Date();
            if (!cursor) cursor = sel ? new Date(sel) : new Date();

            var anio = cursor.getFullYear(), mes = cursor.getMonth();
            var primero = new Date(anio, mes, 1);
            /* getDay(): 0=domingo. Semana que arranca en lunes. */
            var desfase = (primero.getDay() + 6) % 7;
            var inicio = new Date(anio, mes, 1 - desfase);

            var h = '<div class="xdate-hd">' +
                '<button type="button" class="xdate-nav" data-mes="-1" aria-label="Mes anterior">' +
                '<span class="material-symbols-outlined">chevron_left</span></button>' +
                '<div class="xdate-titulo">' + MESES[mes] + ' ' + anio + '</div>' +
                '<button type="button" class="xdate-nav" data-mes="1" aria-label="Mes siguiente">' +
                '<span class="material-symbols-outlined">chevron_right</span></button>' +
                '</div><div class="xdate-grid">';

            DIAS.forEach(function (d) { h += '<div class="xdate-dow">' + d + '</div>'; });

            for (var i = 0; i < 42; i++) {
                var d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
                var cls = 'xdate-dia';
                if (d.getMonth() !== mes) cls += ' es-otro';
                if (mismoDia(d, hoy)) cls += ' es-hoy';
                if (mismoDia(d, sel)) cls += ' es-sel';
                h += '<button type="button" class="' + cls + '" data-f="' + aTexto(d) + '">' + d.getDate() + '</button>';
            }

            h += '</div><div class="xdate-ft">' +
                '<button type="button" class="xdate-accion" data-accion="limpiar">Limpiar</button>' +
                '<button type="button" class="xdate-accion es-primaria" data-accion="hoy">Hoy</button>' +
                '</div>';

            panel.innerHTML = h;
        }

        function abrir() {
            if (inp.disabled || inp.readOnly) return;
            cerrarAbierto();
            cursor = null;
            pintar();
            panel.hidden = false;
            panel.classList.add('is-abierto');
            colocar(panel, cont);
            abierto = cerrar;
        }

        function cerrar() {
            panel.hidden = true;
            panel.classList.remove('is-abierto');
            if (abierto === cerrar) abierto = null;
        }

        function fijar(v) {
            inp.value = v;
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            inp.dispatchEvent(new Event('input', { bubbles: true }));
        }

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            panel.hidden ? abrir() : cerrar();
        });

        panel.addEventListener('click', function (e) {
            var nav = e.target.closest('.xdate-nav');
            if (nav) {
                cursor.setMonth(cursor.getMonth() + (+nav.dataset.mes));
                pintar();
                colocar(panel, cont);
                return;
            }
            var dia = e.target.closest('.xdate-dia');
            if (dia) { fijar(dia.dataset.f); cerrar(); btn.focus(); return; }

            var acc = e.target.closest('.xdate-accion');
            if (acc) {
                if (acc.dataset.accion === 'hoy') fijar(aTexto(new Date()));
                else fijar('');
                cerrar(); btn.focus();
            }
        });

        panel.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); cerrar(); btn.focus(); }
        });
    }

    /* ========================================================
       ARRANQUE
       ======================================================== */

    /* En pantallas táctiles el selector nativo del sistema es mejor que
       cualquier calendario propio (rueda a pantalla completa, accesible,
       familiar). Ahí se deja el nativo y sólo se reemplazan los select. */
    var esTactil = window.matchMedia('(pointer: coarse)').matches;

    function aplicar(raiz) {
        (raiz || document).querySelectorAll('select.msel, select.t-sel').forEach(mejorarSelect);
        if (!esTactil) {
            (raiz || document).querySelectorAll('input[type="date"]').forEach(mejorarFecha);
        }
    }

    function init() {
        document.documentElement.classList.add('xui');
        if (!esTactil) document.documentElement.classList.add('xui-fecha');
        aplicar(document);

        /* Cerrar al hacer clic fuera, al hacer scroll o al redimensionar */
        document.addEventListener('mousedown', function (e) {
            if (!abierto) return;
            if (e.target.closest('.xsel-panel, .xdate-panel, .xsel-btn, .xdate-btn')) return;
            cerrarAbierto();
        });
        window.addEventListener('resize', cerrarAbierto);

        /* El popup va en position:fixed, así que si la página se desplaza queda
           descolgado del campo y hay que cerrarlo. Pero esto escucha en fase de
           captura: sin la comprobación, desplazar la propia lista de rubros
           —que sí desborda— la cerraría al primer movimiento de rueda. */
        window.addEventListener('scroll', function (e) {
            if (!abierto) return;
            var t = e.target;
            if (t && t.nodeType === 1 && t.closest && t.closest('.xsel-panel, .xdate-panel')) return;
            cerrarAbierto();
        }, true);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') cerrarAbierto();
        });

        /* Si app.js inyecta controles nuevos más tarde, se mejoran solos */
        new MutationObserver(function (muts) {
            muts.forEach(function (m) {
                m.addedNodes.forEach(function (n) {
                    if (n.nodeType !== 1) return;
                    if (n.matches && n.matches('select.msel, select.t-sel')) mejorarSelect(n);
                    else if (!esTactil && n.matches && n.matches('input[type="date"]')) mejorarFecha(n);
                    else aplicar(n);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
