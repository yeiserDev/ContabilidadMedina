/* ============================================================
   SHELL MÓVIL — portada tipo app de banca
   ------------------------------------------------------------
   Debajo de 768px la página deja de ser "escritorio encogido":
   la cabecera flotante se apaga y arriba del centro aparece el
   bloque #mshell con barra propia, tarjeta de saldo, dos accesos
   rápidos y el resumen del ciclo como lista de filas.

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

    function init() {
        var shell = document.getElementById('mshell');
        if (!shell) return;

        registrar(document.querySelector('.header-actions'), document.getElementById('mshellActions'));
        registrar(document.querySelector('.bal-pill'), document.getElementById('mcardBal'));

        /* Accesos rápidos: reutilizan los botones que ya abren cada modal,
           así no hay una segunda ruta que mantener. */
        var abre = function (id) {
            return function () {
                var b = document.getElementById(id);
                if (b) b.click();
            };
        };
        var qd = document.getElementById('mqDeposit');
        var qe = document.getElementById('mqExpense');
        if (qd) qd.addEventListener('click', abre('openDepositModal'));
        if (qe) qe.addEventListener('click', abre('openExpenseModal'));

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
