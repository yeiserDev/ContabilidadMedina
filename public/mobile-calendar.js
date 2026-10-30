/* Calendario móvil: usa los mismos movimientos y el detalle de app.js. */
(function () {
    'use strict';
    const calendar = document.getElementById('activityCalendar');
    if (!calendar) return;
    const now = new Date();
    let month = now.getMonth(), year = now.getFullYear();
    let selectedDate = today(), filter = 'all', returnFocus = null;
    let lastScopeKey = null;
    const dateLabel = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    const monthLabel = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const palette = ['#cd501c', '#3967d5', '#8852c5', '#167d71', '#b33f79'];
    const compactAmount = value => value < 1000
        ? value.toLocaleString('es-PE', { maximumFractionDigits: 2 })
        : (value / (value < 1000000 ? 1000 : 1000000)).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + (value < 1000000 ? 'k' : 'M');
    function categoryColor(name) {
        const index = categories.indexOf(name);
        return palette[(index < 0 ? [...name].reduce((s, c) => s + c.charCodeAt(0), 0) : index) % palette.length];
    }
    function recordIcon(record) {
        if (record.kind === 'deposit') return 'south_west';
        const text = `${record.category || ''} ${record.description || ''}`.toLowerCase();
        if (/pastilla|medicin|medicamento|farmacia|salud|hospital|consulta|vacuna/.test(text)) return 'medical';
        if (/celular|entel|movistar|claro|recarga|telefon/.test(text)) return 'mobile_service';
        if (/universidad|colegio|curso|estudio/.test(text)) return 'school';
        if (/mantenimiento|reparaci|accesorio|pintura/.test(text)) return 'build';
        if (/petróleo|petroleo|combustible|gasolina/.test(text)) return 'local_gas_station';
        if (/almuerzo|comida|cena|desayuno|restauran/.test(text)) return 'restaurant';
        if (/compra|víveres|viveres|supermercado|mass/.test(text)) return 'shopping_bag';
        if (/viático|viatico|viaje/.test(text)) return 'directions_bus';
        if (/devolución|devolucion|préstamo|prestamo/.test(text)) return 'currency_exchange';
        return 'receipt_long';
    }
    function animateContent(node, direction = 1) {
        if (reducedMotion.matches || !node.animate) return;
        node.getAnimations().forEach(a => a.cancel());
        node.animate([{ opacity: 0.45, transform: `translateX(${direction * 12}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 230, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function icon(name) {
        const paths = {
            mobile_service: "<path d=\"M24,0 C26.209139,0 28,1.790861 28,4 L28,48 C28,50.209139 26.209139,52 24,52 L4,52 C1.790861,52 0,50.209139 0,48 L0,4 C0,1.790861 1.790861,0 4,0 L24,0 Z M23,7 L5,7 C4.44771525,7 4,7.44771525 4,8 L4,47 C4,47.5522847 4.44771525,48 5,48 L23,48 C23.5522847,48 24,47.5522847 24,47 L24,8 C24,7.44771525 23.5522847,7 23,7 Z M19,44 C19.5522847,44 20,44.4477153 20,45 C20,45.5522847 19.5522847,46 19,46 L9,46 C8.44771525,46 8,45.5522847 8,45 C8,44.4477153 8.44771525,44 9,44 L19,44 Z M17.5,3 L12.5,3 C12.2238576,3 12,3.22385763 12,3.5 C12,3.77614237 12.2238576,4 12.5,4 L17.5,4 C17.7761424,4 18,3.77614237 18,3.5 C18,3.22385763 17.7761424,3 17.5,3 Z M10.5,3 C10.2238576,3 10,3.22385763 10,3.5 C10,3.77614237 10.2238576,4 10.5,4 C10.7761424,4 11,3.77614237 11,3.5 C11,3.22385763 10.7761424,3 10.5,3 Z\" transform=\"translate(14 2)\"/>",
            medical: "<path d=\"M 44.3710 28.5508 L 48.1446 24.4492 C 53.4649 19.1054 53.3709 12.3320 48.5430 7.4570 C 43.7147 2.5586 36.8944 2.5352 31.5273 7.8554 L 27.4491 11.6289 C 29.4882 11.0430 31.6679 11.5117 33.9413 13.8086 L 42.4960 22.3398 C 44.7695 24.6132 44.9569 26.5117 44.3710 28.5508 Z M 24.3319 39.8476 C 26.6757 42.1914 28.9257 42.2617 31.3398 39.8476 L 39.8710 31.2930 C 42.3085 28.8789 42.2382 26.6523 39.8944 24.3086 L 31.6913 16.0820 C 29.3476 13.7383 27.1210 13.6914 24.6835 16.1289 L 16.1522 24.6601 C 13.7382 27.0742 13.8085 29.3242 16.1522 31.6679 Z M 26.4647 24.6132 C 25.5741 23.7226 25.5741 22.3398 26.4413 21.4726 C 27.3319 20.5820 28.6913 20.5820 29.5820 21.4726 C 30.4257 22.3398 30.4726 23.6992 29.5351 24.6132 C 28.7147 25.4336 27.3085 25.4336 26.4647 24.6132 Z M 21.4960 29.5586 C 20.6054 28.6679 20.6054 27.3086 21.4960 26.4179 C 22.3866 25.5273 23.7460 25.5508 24.6366 26.4414 C 25.4804 27.2851 25.5038 28.6679 24.6366 29.5117 C 23.7226 30.4492 22.3632 30.4023 21.4960 29.5586 Z M 34.5038 29.5586 C 33.6600 30.4023 32.2773 30.4023 31.3866 29.5117 C 30.5429 28.6914 30.5429 27.2851 31.3866 26.4414 C 32.3007 25.5273 33.6600 25.5508 34.5038 26.4179 C 35.3944 27.3086 35.3944 28.6679 34.5038 29.5586 Z M 7.4569 48.5195 C 12.2851 53.4179 19.1522 53.4648 24.4726 48.1211 L 28.5038 44.3242 C 26.4882 44.9101 24.4022 44.5117 22.1288 42.2383 L 13.5741 33.6836 C 11.3007 31.4101 11.0898 29.5117 11.6757 27.4726 L 7.8788 31.5273 C 2.5351 36.8476 2.6288 43.6445 7.4569 48.5195 Z M 26.4413 34.4805 C 25.5741 33.6367 25.5507 32.2773 26.4647 31.3632 C 27.3319 30.4961 28.7147 30.5195 29.5351 31.3632 C 30.4257 32.2305 30.4726 33.6367 29.5820 34.4805 C 28.6679 35.3711 27.3319 35.3711 26.4413 34.4805 Z\"/>",
            south_west: "<path d=\"M 27.9999 51.9063 C 41.0546 51.9063 51.9063 41.0781 51.9063 28 C 51.9063 14.9453 41.0312 4.0937 27.9765 4.0937 C 14.8983 4.0937 4.0937 14.9453 4.0937 28 C 4.0937 41.0781 14.9218 51.9063 27.9999 51.9063 Z M 27.9999 41.1953 C 27.4374 41.1953 27.0155 40.9844 26.4999 40.4687 L 17.8514 31.8203 C 17.5234 31.4922 17.3358 31.0469 17.3358 30.5078 C 17.3358 29.4531 18.1093 28.6328 19.1874 28.6328 C 19.7265 28.6328 20.2187 28.8906 20.5468 29.1953 L 23.7109 32.4063 L 26.2655 35.4531 L 26.0780 30.0625 L 26.0780 16.7734 C 26.0780 15.6484 26.8749 14.8750 27.9999 14.8750 C 29.1249 14.8750 29.9218 15.6484 29.9218 16.7734 L 29.9218 30.0625 L 29.7109 35.4766 L 32.3124 32.4063 L 35.4530 29.1953 C 35.7812 28.8672 36.2499 28.6328 36.8124 28.6328 C 37.8671 28.6328 38.6874 29.4531 38.6874 30.5078 C 38.6874 31.0469 38.4530 31.4922 38.1483 31.8203 L 29.5234 40.4687 C 29.0077 40.9609 28.5624 41.1953 27.9999 41.1953 Z\"/>",
            receipt_long: "<path d=\"M 15.5547 53.125 L 40.4453 53.125 C 45.2969 53.125 47.7109 50.6640 47.7109 45.7890 L 47.7109 24.5078 L 30.7422 24.5078 C 27.7422 24.5078 26.3359 23.0781 26.3359 20.0781 L 26.3359 2.8750 L 15.5547 2.8750 C 10.7266 2.8750 8.2891 5.3594 8.2891 10.2344 L 8.2891 45.7890 C 8.2891 50.6875 10.7266 53.125 15.5547 53.125 Z M 30.8125 21.2969 L 47.4531 21.2969 C 47.2891 20.3359 46.6094 19.3984 45.5078 18.2500 L 32.5703 5.1015 C 31.4922 3.9766 30.5078 3.2969 29.5234 3.1328 L 29.5234 20.0313 C 29.5234 20.875 29.9687 21.2969 30.8125 21.2969 Z M 18.9766 34.6562 C 18.0156 34.6562 17.3359 33.9766 17.3359 33.0625 C 17.3359 32.1484 18.0156 31.4687 18.9766 31.4687 L 37.0469 31.4687 C 37.9844 31.4687 38.7109 32.1484 38.7109 33.0625 C 38.7109 33.9766 37.9844 34.6562 37.0469 34.6562 Z M 18.9766 43.5859 C 18.0156 43.5859 17.3359 42.9062 17.3359 41.9922 C 17.3359 41.0781 18.0156 40.3984 18.9766 40.3984 L 37.0469 40.3984 C 37.9844 40.3984 38.7109 41.0781 38.7109 41.9922 C 38.7109 42.9062 37.9844 43.5859 37.0469 43.5859 Z\"/>",
            school: "<path d=\"M 17.0897 44.8984 C 20.9804 44.8984 23.5819 46.3516 24.7304 47.1719 C 25.1523 47.4062 26.3476 48.1094 26.6054 48.1328 L 26.6054 12.6953 C 25.0819 9.8594 20.6054 7.5625 15.9648 7.5625 C 10.1054 7.5625 5.1366 10.9375 4.0351 13.2110 L 4.0351 46.3047 C 4.0351 47.8516 4.9492 48.4375 6.0507 48.4375 C 6.9413 48.4375 7.5273 48.1328 8.0897 47.6641 C 9.4726 46.4219 12.7304 44.8984 17.0897 44.8984 Z M 38.9335 44.8984 C 43.2929 44.8984 46.5275 46.4219 47.9334 47.6641 C 48.4724 48.1094 49.0585 48.4375 49.9489 48.4375 C 51.0505 48.4375 51.9649 47.8516 51.9649 46.3047 L 51.9649 13.2110 C 50.8633 10.9375 45.9179 7.5625 40.0585 7.5625 C 35.4179 7.5625 30.9413 9.8594 29.4179 12.6953 L 29.4179 48.1797 C 29.6757 48.1562 30.8710 47.4297 31.3163 47.1719 C 32.4413 46.3516 35.0429 44.8984 38.9335 44.8984 Z\"/>",
            build: "<path d=\"M 4.7104 52.3069 C 8.4035 56 13.5066 55.7985 17.5130 51.8145 C 20.7136 48.6139 27.3611 37.3109 33.1357 31.5363 C 36.9854 27.6866 41.2380 29.7234 45.5131 27.9776 L 41.7080 14.1007 C 41.2380 12.3773 41.9318 10.9449 43.9239 10.4077 L 52.3169 8.1695 C 52.0483 7.3861 51.3098 6.3117 50.3922 5.3717 C 45.2220 .2 36.6720 -4.2744e-15 31.5689 4.834542597079431 C 24.1381 11.9297 29.7783 19.4276 24.8767 24.3293 C 18.7216 30.4844 9.7688 34.8265 5.2028 39.4820 C 1.1964 43.5108 .9726 48.5691 4.7104 52.3069 Z M 32.5314 18.3757 C 32.0390 18.5100 31.6360 18.2638 31.4570 17.7266 C 31.3227 17.3238 31.6137 16.8314 32.0837 16.6970 L 37.2988 15.2870 C 37.7240 15.1751 38.2164 15.4436 38.3507 15.9137 C 38.4850 16.4285 38.1940 16.8761 37.7240 17.0104 Z M 47.9976 26.9033 C 48.8479 26.3885 49.7431 25.7170 50.6608 24.8441 C 53.4812 22.2926 54.9357 18.4429 54.3540 15.7123 L 47.5722 17.5699 C 46.8113 17.7714 46.1846 17.8161 45.4682 17.7043 Z M 33.2028 21.0391 C 32.7104 21.1735 32.2852 20.9273 32.1061 20.3901 C 31.9718 19.9872 32.2627 19.4948 32.7328 19.3829 L 37.9478 17.9505 C 38.3731 17.8609 38.8655 18.1071 38.9998 18.5772 C 39.1564 19.0919 38.8431 19.5396 38.3731 19.6738 Z M 33.8519 23.7026 C 33.3818 23.8369 32.9119 23.5907 32.7999 23.0759 C 32.6880 22.6059 32.9566 22.1807 33.4266 22.0464 L 38.6193 20.6587 C 39.1117 20.5020 39.5817 20.7929 39.6936 21.2406 C 39.7832 21.6883 39.5146 22.1807 39.0893 22.2926 Z M 8.2244 48.8154 C 6.7024 47.2933 6.6800 44.7418 8.1796 43.2198 C 9.7016 41.6531 12.2308 41.7202 13.7975 43.1974 C 15.4091 44.7194 15.2524 47.2262 13.7752 48.8154 C 12.3651 50.3597 9.7240 50.3149 8.2244 48.8154 Z\"/>",
            local_gas_station: "<path fill-rule=\"evenodd\" d=\"M17,50 C7.61115925,50 -3.63797881e-12,42.3888407 -3.63797881e-12,33 C-3.63797881e-12,26.0252774 5.12600111,15.432201 15.3780033,1.22077097 C15.5034407,1.0468884 15.656022,0.8943071 15.8299046,0.768869723 C16.7257064,0.122646022 17.9757651,0.324969086 18.621994,1.22076721 C28.873998,15.4321992 34,26.0252768 34,33 C34,42.3888407 26.3888407,50 17,50 Z M16.3088287,40.887119 L16.3088282,40.8871299 C15.5792638,40.8544988 14.958432,41.4131818 14.9142136,42.1421356 C14.9103056,42.2065601 14.9113718,42.27119 14.9174027,42.3354506 C14.9821876,43.0257414 15.5942974,43.5328141 16.2845882,43.4680292 L16.2845862,43.4680079 C19.6925506,43.148165 22.3284845,42.0562918 24.1923882,40.1923882 C26.0562918,38.3284845 27.148165,35.6925506 27.4680292,32.2845882 C27.4740602,32.2203277 27.4751264,32.1556978 27.4712184,32.0912733 C27.4292384,31.3992212 26.8341878,30.8722336 26.1421356,30.9142136 C25.4131818,30.958432 24.8544988,31.5792638 24.8871299,32.3088282 L24.887119,32.3088287 C24.9879262,34.5626711 24.1468735,36.5810485 22.363961,38.363961 C20.5810485,40.1468735 18.5626711,40.9879262 16.3088287,40.887119 Z\" transform=\"translate(11 3)\"/>",
            restaurant: '<path d="M4 3v5.5a2.5 2.5 0 0 0 5 0V3M6.5 3v18M18.5 3c-3 2-4 5.5-4 9h4"/><path d="M18.5 3v18" stroke-width="2.3"/>',
            shopping_bag: "<path d=\"M 14.5586 51.9531 L 42.1445 51.9531 C 46.3633 51.9531 48.8008 49.5156 48.8008 44.6875 L 48.8008 20.4297 C 48.8008 15.6016 46.3398 13.1641 41.4414 13.1641 L 37.7148 13.1641 C 37.5742 8.2422 33.3086 4.0469 28.0117 4.0469 C 22.6914 4.0469 18.4258 8.2422 18.2852 13.1641 L 14.5586 13.1641 C 9.6836 13.1641 7.1992 15.5781 7.1992 20.4297 L 7.1992 44.6875 C 7.1992 49.5391 9.6836 51.9531 14.5586 51.9531 Z M 28.0117 7.6094 C 31.3164 7.6094 33.8242 10.0938 33.9414 13.1641 L 22.0820 13.1641 C 22.1758 10.0938 24.6836 7.6094 28.0117 7.6094 Z\"/>",
            directions_bus: "<path d=\"M 3.3790 49.7383 L 6.1446 49.7383 C 7.8790 49.7383 9.2383 48.4023 9.2383 46.6680 L 9.2383 42.7305 C 14.4415 43.0586 21.9649 43.2930 27.9883 43.2930 C 34.0352 43.2930 41.5587 43.0586 46.7617 42.7305 L 46.7617 46.6680 C 46.7617 48.4023 48.0976 49.7383 49.8553 49.7383 L 52.6211 49.7383 C 54.3788 49.7383 55.7382 48.4023 55.7382 46.6680 L 55.7382 33.1445 C 55.7382 29.2070 54.9414 26.9805 52.7617 24.1680 L 50.7932 21.6133 C 49.9259 17.3945 48.3788 12.9648 47.5585 11.2305 C 46.3163 8.5820 43.8788 7.0117 40.7618 6.5898 C 39.1915 6.4024 34.0587 6.2617 27.9883 6.2617 C 21.9415 6.2617 16.8087 6.4258 15.2383 6.5898 C 12.1212 6.9648 9.6837 8.5820 8.4415 11.2305 C 7.6212 12.9648 6.0743 17.3945 5.2071 21.6133 L 3.2383 24.1680 C 1.0587 26.9805 .2618 29.2070 .2618 33.1445 L .2618 46.6680 C .2618 48.4023 1.6212 49.7383 3.3790 49.7383 Z M 9.9415 19.6680 C 10.5040 17.0898 11.6290 13.7383 12.4024 12.3789 C 13.0352 11.2773 13.7149 10.8086 14.9805 10.6445 C 16.7618 10.3867 20.7462 10.2461 27.9883 10.2461 C 35.2540 10.2461 39.2383 10.3398 41.0196 10.6445 C 42.2618 10.8320 42.9414 11.2773 43.5976 12.3789 C 44.3948 13.7148 45.4494 17.0898 46.0585 19.6680 C 46.2697 20.5351 45.9179 20.8633 45.0040 20.7929 C 41.1134 20.5586 36.4727 20.3008 27.9883 20.3008 C 19.5274 20.3008 14.8868 20.5586 10.9962 20.7929 C 10.0821 20.8633 9.7540 20.5351 9.9415 19.6680 Z M 10.9024 37.2227 C 8.6759 37.2227 7.0118 35.5351 7.0118 33.3320 C 7.0118 31.1055 8.6759 29.4414 10.9024 29.4414 C 13.1290 29.4414 14.7930 31.1055 14.7930 33.3320 C 14.7930 35.5351 13.1290 37.2227 10.9024 37.2227 Z M 45.0976 37.2227 C 42.8713 37.2227 41.2071 35.5351 41.2071 33.3320 C 41.2071 31.1055 42.8713 29.4414 45.0976 29.4414 C 47.3008 29.4414 48.9884 31.1055 48.9884 33.3320 C 48.9884 35.5351 47.3008 37.2227 45.0976 37.2227 Z M 21.7774 36.1445 C 20.1368 36.1445 18.9883 34.9727 18.9883 33.3320 C 18.9883 31.6680 20.1368 30.5195 21.7774 30.5195 L 34.2227 30.5195 C 35.8634 30.5195 37.0118 31.6680 37.0118 33.3320 C 37.0118 34.9727 35.8634 36.1445 34.2227 36.1445 Z\"/>",
            currency_exchange: "<path d=\"M 27.9999 51.9063 C 41.0546 51.9063 51.9063 41.0781 51.9063 28 C 51.9063 14.9453 41.0312 4.0937 27.9765 4.0937 C 14.8983 4.0937 4.0937 14.9453 4.0937 28 C 4.0937 41.0781 14.9218 51.9063 27.9999 51.9063 Z M 20.0546 39.8359 C 19.0468 39.8359 18.3202 39.1328 18.3202 38.0781 L 18.3202 24.7422 L 18.4843 20.8281 L 16.1171 23.6875 L 14.1718 25.9141 C 13.8436 26.2188 13.4452 26.4297 12.9530 26.4297 C 11.9687 26.4297 11.2421 25.6563 11.2421 24.6953 C 11.2421 24.2266 11.3827 23.8281 11.7109 23.4766 L 18.6014 16.2578 C 19.0468 15.7656 19.5624 15.6016 20.0546 15.6016 C 20.5936 15.6016 21.1327 15.7890 21.6014 16.2578 L 28.4218 23.4766 C 28.7499 23.8047 28.9140 24.2266 28.9140 24.6953 C 28.9140 25.6563 28.1874 26.4297 27.2030 26.4297 C 26.7109 26.4297 26.2421 26.2188 25.9843 25.9141 L 24.0858 23.6875 L 21.6483 20.8047 L 21.8124 24.7422 L 21.8124 38.0781 C 21.8124 39.1328 21.0858 39.8359 20.0546 39.8359 Z M 35.8514 39.8359 C 35.3358 39.8359 34.8436 39.6484 34.3514 39.1563 L 27.4843 31.9375 C 27.1562 31.6094 27.0155 31.2109 27.0155 30.7188 C 27.0155 29.7578 27.7421 29.0078 28.7030 29.0078 C 29.2187 29.0078 29.6171 29.1953 29.9218 29.5234 L 31.8671 31.7500 L 34.2577 34.5859 L 34.0702 30.6719 L 34.0702 17.3359 C 34.0702 16.3047 34.8202 15.6016 35.8514 15.6016 C 36.8593 15.6016 37.5858 16.3047 37.5858 17.3359 L 37.5858 30.6719 L 37.4218 34.6094 L 39.8358 31.7500 L 41.7343 29.5234 C 41.9921 29.1953 42.4609 29.0078 42.9765 29.0078 C 43.9374 29.0078 44.6874 29.7578 44.6874 30.7188 C 44.6874 31.2109 44.5234 31.6094 44.2187 31.9375 L 37.3514 39.1563 C 36.9296 39.6250 36.3671 39.8359 35.8514 39.8359 Z\"/>",
            attach_file: "<path d=\"M 44.0899 28.8672 L 26.8634 46.0937 C 22.3868 50.5937 16.3634 50.1484 12.5196 46.2578 C 8.6525 42.4140 8.2072 36.4375 12.7072 31.9375 L 36.1915 8.4531 C 38.8868 5.7578 42.8478 5.3828 45.4259 7.9375 C 47.9806 10.5390 47.6056 14.4765 44.9337 17.1719 L 21.9884 40.1406 C 20.8165 41.3359 19.4337 40.9844 18.6134 40.1875 C 17.8165 39.3672 17.4884 38.0078 18.6603 36.8125 L 34.6915 20.8047 C 35.3946 20.0781 35.4415 19.0468 34.7618 18.3672 C 34.0821 17.7109 33.0509 17.7578 32.3478 18.4609 L 16.2462 34.5625 C 13.8556 36.9531 13.9493 40.6094 16.0587 42.7187 C 18.3556 45.0156 21.8478 44.9687 24.2384 42.5547 L 47.3243 19.4922 C 51.7069 15.1094 51.4962 9.3437 47.6993 5.5234 C 43.9493 1.7968 38.1134 1.5156 33.7072 5.8984 L 10.0821 29.5468 C 4.2931 35.3359 4.7384 43.6094 9.9650 48.8359 C 15.1915 54.0390 23.4650 54.4844 29.2540 48.7187 L 46.5978 31.3750 C 47.3009 30.6953 47.2774 29.4531 46.5743 28.8203 C 45.8946 28.0937 44.7931 28.1875 44.0899 28.8672 Z\"/>",
            chevron_right: '<path d="m9 5 7 7-7 7"/>',
            chevron_left: '<path d="m15 5-7 7 7 7"/>',
            close: '<path d="m6 6 12 12M18 6 6 18"/>',
            arrow_back: '<path d="M20 12H4m7-7-7 7 7 7"/>',
            check: '<path d="m5 12 4 4L19 6"/>'
        };
        // Framework7 Icons (MIT), source revision 7fb38494ba82cbef74d4f7e725431544c8ea1ee5; see public/licenses/framework7-icons.txt.
        const filledSymbols = ["south_west","receipt_long","school","build","local_gas_station","shopping_bag","directions_bus","currency_exchange","attach_file","medical","mobile_service"];
        if (paths[name]) {
            const node = el('span', 'ac-symbol');node.setAttribute('aria-hidden', 'true');
            node.innerHTML = `<svg viewBox="${filledSymbols.includes(name) ? '0 0 56 56' : '0 0 24 24'}" class="${filledSymbols.includes(name) ? 'ac-symbol-fill' : ''}" fill="none" focusable="false">${paths[name]}</svg>`;
            return node;
        }
        const node = el('span', 'material-symbols-outlined', name);
        node.setAttribute('aria-hidden', 'true');
        return node;
    }
    function records(date) {
        return [
            ...deposits.filter(r => !date || r.date === date).map(r => ({ ...r, kind: 'deposit' })),
            ...expenses.filter(r => !date || r.date === date).map(r => ({ ...r, kind: 'expense' }))
        ];
    }
    const amount = r => Number(r.amount) || 0;
    const total = rows => rows.reduce((sum, r) => sum + amount(r), 0);
    const iso = day => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const shortDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
    function scope() {
        const key = document.getElementById('monthFilter').value || 'all';
        const cycle = getCycles().find(c => c.id === key);
        const end = new Date(Math.min(d2(today()).getTime(), cycle ? cycle.end.getTime() : Infinity));
        // Los ciclos terminan justo antes del mediodía del siguiente inicio.
        // Traducir ese límite a fechas conserva el día inicial del nuevo ciclo fuera del anterior.
        if (d2(localDate(end)) > end) end.setDate(end.getDate() - 1);
        return { key, cycle, start: cycle ? localDate(cycle.start) : null, end: localDate(end) };
    }
    const inScope = (date, period) => (!period.start || date >= period.start) && date <= period.end;

    // Se crea antes de abrir; el detalle existente sigue siendo la única ficha del movimiento.
    const overlay = el('div', 'modal-bg activity-day-overlay');
    overlay.id = 'activityDayModal';
    overlay.innerHTML = `
        <section class="modal activity-day" role="dialog" aria-modal="true" aria-labelledby="activityDayTitle" tabindex="-1">
            <div class="ad-handle" aria-hidden="true"></div>
            <header class="ad-header"><div><h2 id="activityDayTitle"></h2><p id="adDate"></p></div><button type="button" id="adClose" class="ad-close" aria-label="Cerrar movimientos del día"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></header>
            <div class="ad-day-nav"><button type="button" id="adPrev" aria-label="Día anterior"><span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button><span id="adDayPosition"></span><button type="button" id="adNext" aria-label="Día siguiente"><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button></div>
            <div class="ad-scroll">
                <section class="ad-summary" aria-label="Resumen del día"><div class="ad-spending"><div class="ad-spending-copy"><span>Gastos del día</span><strong id="adExpense"></strong><span id="adExpenseCount"></span></div><div id="adRing" class="ad-ring"></div></div><div class="ad-totals"><div><span id="adIncomeLabel"></span><strong id="adIncome"></strong></div><div><span>Saldo disponible</span><strong id="adBalance"></strong></div></div><p class="ad-balance-note">Saldo acumulado al cierre de este día</p></section>
                <section id="adCategories" class="ad-categories" aria-labelledby="adCategoriesTitle"><div class="ad-section-heading"><h3 id="adCategoriesTitle">Distribución del gasto</h3><span>Por rubro</span></div><div id="adCategoryBars"></div></section>
                <div class="ad-list-heading"><h3>Movimientos</h3><span id="adCount" aria-live="polite"></span></div>
                <div class="ad-filters" role="group" aria-label="Filtrar movimientos del día"><span class="ad-filter-thumb" aria-hidden="true"></span><button type="button" data-kind="all" aria-pressed="true">Todos</button><button type="button" data-kind="expense" aria-pressed="false">Gastos</button><button type="button" data-kind="deposit" aria-pressed="false">Depósitos</button></div>
                <div id="adRecords" class="ad-records"></div>
            </div>
        </section>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.material-symbols-outlined').forEach(node => {
        if (['close', 'chevron_left', 'chevron_right'].includes(node.textContent)) node.replaceWith(icon(node.textContent));
    });
    const sheet = overlay.querySelector('.activity-day');
    const get = id => document.getElementById(id);

    function render() {
        const period = scope();
        if (period.key !== lastScopeKey) {
            if (!inScope(selectedDate, period)) selectedDate = period.end;
            const anchor = d2(selectedDate);
            month = anchor.getMonth(); year = anchor.getFullYear();
            lastScopeKey = period.key;
        }
        get('acMonth').textContent = monthLabel.format(new Date(year, month, 1));
        const byDate = new Map();
        const prefix = iso(1).slice(0, 7);
        const monthly = records().filter(r => r.date.startsWith(prefix + '-') && inScope(r.date, period));
        const visibleStart = period.start && period.start > iso(1) ? period.start : iso(1);
        const visibleEnd = period.end < iso(new Date(year, month + 1, 0).getDate()) ? period.end : iso(new Date(year, month + 1, 0).getDate());
        get('acScope').textContent = visibleStart <= visibleEnd
            ? `${period.cycle ? 'Ciclo seleccionado' : 'Todos los ciclos'} · ${shortDate.format(d2(visibleStart))} – ${shortDate.format(d2(visibleEnd))}`
            : 'Este mes no tiene días dentro del periodo seleccionado';
        monthly.forEach(r => {
            if (!byDate.has(r.date)) byDate.set(r.date, []);
            byDate.get(r.date).push(r);
        });
        const spentByDate = [...byDate].map(([date, rows]) => [date, total(rows.filter(r => r.kind === 'expense'))]);
        const maxSpent = Math.max(0, ...spentByDate.map(([, value]) => value));
        const grid = get('acDays');
        grid.replaceChildren();
        const offset = (new Date(year, month, 1).getDay() + 6) % 7;
        for (let i = 0; i < offset; i++) grid.appendChild(el('span', 'ac-blank'));
        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const date = iso(day), rows = byDate.get(date) || [];
            const income = rows.filter(r => r.kind === 'deposit').length;
            const expense = rows.length - income;
            const spent = total(rows.filter(r => r.kind === 'expense'));
            const received = total(rows.filter(r => r.kind === 'deposit'));
            const button = el('button', 'ac-day', '');
            button.type = 'button';
            button.dataset.date = date;
            button.disabled = !inScope(date, period);
            button.appendChild(el('span', 'ac-day-number', day));
            if (date === today()) { button.classList.add('is-today'); button.setAttribute('aria-current', 'date'); }
            if (date === selectedDate) button.classList.add('is-selected');
            if (rows.length) button.classList.add('has-activity');
            if (spent) {
                button.dataset.heat = String(Math.max(1, Math.ceil(spent / maxSpent * 4)));
                button.appendChild(el('span', 'ac-day-amount', compactAmount(spent)));
            } else {
                button.appendChild(el('span', `ac-day-amount${received ? ' is-income' : ''}`, received ? '+' + compactAmount(received) : ''));
            }
            const dots = el('span', 'ac-day-dots');
            dots.setAttribute('aria-hidden', 'true');
            if (income) {
                button.classList.add('has-deposit');
                const bill = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                bill.setAttribute('viewBox', '0 0 20 14');
                bill.setAttribute('class', 'ac-banknote');
                bill.setAttribute('aria-hidden', 'true');
                bill.innerHTML = '<rect x="1" y="1" width="18" height="12" rx="2"/><path d="M4 4h1M15 10h1"/><circle cx="10" cy="7" r="2.5"/>';
                dots.appendChild(bill);
            }
            button.appendChild(dots);
            button.setAttribute('aria-label', `${dateLabel.format(d2(date))}: ${expense} gastos, ${money(spent)}; ${income} depósitos, ${money(received)}`);
            button.title = `Gastos: ${money(spent)} · Depósitos: ${money(received)}`;
            if (!button.disabled) button.addEventListener('click', e => openDay(date, button, e.detail > 0));
            grid.appendChild(button);
        }
        const insight = get('acMonthInsight');
        insight.replaceChildren();
        if (maxSpent) {
            const peak = spentByDate.find(([, value]) => value === maxSpent);
            const peakButton = el('button', 'ac-peak');
            peakButton.type = 'button';
            peakButton.append(icon('local_fire_department'), el('span', '', `Mayor gasto · ${dayNum(peak[0])} ${monShort(peak[0])}`), el('strong', '', money(maxSpent)), icon('chevron_right'));
            peakButton.addEventListener('click', e => openDay(peak[0], peakButton, e.detail > 0));
            insight.appendChild(peakButton);
        } else {
            insight.appendChild(el('p', 'ac-no-spending', byDate.size ? 'Este periodo solo tiene depósitos registrados.' : 'No hay movimientos en el periodo visible.'));
        }
        get('acIncome').textContent = money(total(monthly.filter(r => r.kind === 'deposit')));
        get('acExpense').textContent = money(total(monthly.filter(r => r.kind === 'expense')));
        if (overlay.classList.contains('active')) renderDay();
    }

    function renderDay() {
        const rows = records(selectedDate);
        const incoming = total(rows.filter(r => r.kind === 'deposit'));
        const outgoing = total(rows.filter(r => r.kind === 'expense'));
        const openingBalance = balBefore(selectedDate);
        const balance = openingBalance + incoming - outgoing;
        get('activityDayTitle').textContent = `${weekday(selectedDate)}, ${dayNum(selectedDate)}`;
        get('adDate').textContent = dateLabel.format(d2(selectedDate));
        get('adBalance').textContent = `${balance < 0 ? '−' : ''}${money(Math.abs(balance))}`;
        get('adBalance').classList.toggle('is-negative', balance < 0);
        get('adIncomeLabel').textContent = incoming ? 'Depósitos del día' : 'Saldo al iniciar';
        const initialValue = incoming || openingBalance;
        get('adIncome').textContent = `${initialValue < 0 ? '−' : ''}${money(Math.abs(initialValue))}`;
        get('adIncome').classList.toggle('is-negative', initialValue < 0);
        const period = scope();
        const previous = d2(selectedDate); previous.setDate(previous.getDate() - 1);
        const next = d2(selectedDate); next.setDate(next.getDate() + 1);
        get('adPrev').disabled = !inScope(localDate(previous), period);
        get('adNext').disabled = !inScope(localDate(next), period);
        get('adExpense').textContent = money(outgoing);
        const expenseCount = rows.filter(r => r.kind === 'expense').length;
        get('adExpenseCount').textContent = `${expenseCount} ${expenseCount === 1 ? 'gasto registrado' : 'gastos registrados'}`;
        get('adDayPosition').textContent = selectedDate === today() ? 'Hoy' : `Día ${dayNum(selectedDate)} de ${new Date(d2(selectedDate).getFullYear(), d2(selectedDate).getMonth() + 1, 0).getDate()}`;
        const categories = new Map();
        rows.filter(r => r.kind === 'expense').forEach(r => categories.set(r.category || 'Sin rubro', (categories.get(r.category || 'Sin rubro') || 0) + amount(r)));
        get('adCategories').hidden = !outgoing;
        const bars = get('adCategoryBars');
        bars.replaceChildren();
        const sorted = [...categories].sort((a, b) => b[1] - a[1]);
        const groups = sorted.slice(0, 4);
        if (sorted.length > 4) groups.push(['Otros rubros', sorted.slice(4).reduce((s, row) => s + row[1], 0)]);
        const ring = get('adRing');
        ring.replaceChildren();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', outgoing ? groups.map(([name, value]) => `${name}: ${Math.round(value / outgoing * 100)}%`).join(', ') : 'Sin gastos registrados');
        const circumference = 2 * Math.PI * 40;
        function segment(color, size, offset) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            for (const [key, value] of Object.entries({ cx: 50, cy: 50, r: 40, fill: 'none', stroke: color, 'stroke-width': 10, 'stroke-dasharray': `${size} ${circumference}`, 'stroke-dashoffset': -offset })) circle.setAttribute(key, value);
            svg.appendChild(circle);
        }
        segment('var(--ac-track)', circumference, 0);
        let offset = 0;
        groups.forEach(([name, value]) => {
            const length = value / outgoing * circumference;
            segment(categoryColor(name), Math.max(0, length - (groups.length > 1 ? 3 : 0)), offset);
            offset += length;
        });
        ring.appendChild(svg);
        const ringCenter = el('span', 'ad-ring-center');
        ringCenter.append(icon(outgoing ? 'donut_small' : 'check'), el('span', '', `${sorted.length} ${sorted.length === 1 ? 'rubro' : 'rubros'}`));
        ring.appendChild(ringCenter);
        sorted.forEach(([name, value]) => {
            const row = el('div', 'ad-category');
            row.style.setProperty('--category-color', categoryColor(name));
            const share = outgoing > 0 ? Math.max(0, Math.min(100, value / outgoing * 100)) : 0;
            const percent = share > 0 && share < 1 ? '<1%' : `${Math.round(share)}%`;
            const gauge = el('div', 'ad-category-gauge');
            gauge.setAttribute('aria-hidden', 'true');
            const chart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            chart.setAttribute('viewBox', '0 0 56 56');
            chart.innerHTML = '<circle class="ad-gauge-track" cx="28" cy="28" r="24"/><circle class="ad-gauge-fill" cx="28" cy="28" r="24" pathLength="100"/>';
            chart.querySelector('.ad-gauge-fill').style.setProperty('--share-offset', String(100 - share));
            gauge.append(chart, el('span', 'ad-category-percent', percent));
            const copy = el('div', 'ad-category-copy');
            const label = el('div', 'ad-category-label');
            const symbol = el('span', 'ad-category-symbol');symbol.appendChild(icon(recordIcon({ category: name })));
            label.append(symbol, el('span', 'ad-category-name', name));
            copy.append(label, el('strong', 'ad-category-amount', money(value)));
            const shareLabel = el('span', 'ad-category-share-label', `${percent} del gasto del día`);
            row.append(gauge, copy, shareLabel);
            if (sorted.length === 1) {
                const count = el('div', 'ad-category-stat ad-category-stat-count');
                count.append(el('span', '', expenseCount === 1 ? 'Gasto' : 'Gastos'), el('strong', '', String(expenseCount)));
                const average = el('div', 'ad-category-stat ad-category-stat-average');
                average.append(el('span', '', 'Promedio'), el('strong', '', money(expenseCount ? value / expenseCount : 0)), el('small', '', 'por gasto'));
                row.append(count, average);
            }
            bars.appendChild(row);
        });
        const visible = rows.filter(r => filter === 'all' || r.kind === filter);
        get('adCount').textContent = `${visible.length} ${visible.length === 1 ? 'movimiento' : 'movimientos'}`;
        overlay.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === filter)));
        overlay.querySelector('.ad-filter-thumb').style.transform = `translateX(${['all', 'expense', 'deposit'].indexOf(filter) * 100}%)`;
        const list = get('adRecords');
        list.replaceChildren();
        visible.forEach(r => {
            const isIncome = r.kind === 'deposit';
            const card = el('button', `ad-record ${isIncome ? 'is-income' : 'is-expense'}`);
            card.type = 'button';
            card.style.setProperty('--category-color', isIncome ? 'var(--ac-income)' : categoryColor(r.category || 'Sin rubro'));
            const figure = el('span', 'ad-record-icon');
            figure.appendChild(icon(recordIcon(r)));
            const copy = el('span', 'ad-record-copy');
            copy.appendChild(el('strong', '', r.description || (isIncome ? 'Depósito' : r.category || 'Gasto')));
            const subtitle = isIncome ? `Depósito ${r.type || ''}`.trim() : `${r.category || 'Sin rubro'} · ${r.wallet === 'bcp' ? 'BCP' : r.wallet === 'yape' ? 'Yape' : 'Efectivo'}`;
            copy.appendChild(el('span', '', subtitle));
            const photos = (r.imageUrls || (r.imageUrl ? [r.imageUrl] : [])).length;
            if (photos) {
                const evidence = el('span', 'ad-evidence', `${photos} ${photos === 1 ? 'comprobante' : 'comprobantes'}`);
                evidence.prepend(icon('attach_file')); copy.appendChild(evidence);
            }
            const value = el('span', 'ad-record-value');
            value.appendChild(el('strong', 'ad-record-amount', `${isIncome ? '+' : '−'}${money(amount(r))}`));
            if (!isIncome && outgoing) {
                const share = Math.max(0, Math.min(100, amount(r) / outgoing * 100));
                const badge = el('span', 'ad-record-share', `${share > 0 && share < 1 ? '<1' : Math.round(share)}% del día`);
                const chart = el('span', 'ad-record-share-chart');
                chart.style.setProperty('--record-share', `${share}%`);
                chart.setAttribute('aria-hidden', 'true');
                badge.prepend(chart);value.appendChild(badge);
            } else if (isIncome) value.appendChild(el('span', 'ad-record-share', 'Ingreso'));
            card.append(figure, copy, value, icon('chevron_right'));
            if (isIncome) {
                const artwork = el('span', 'ad-income-art');
                artwork.setAttribute('aria-hidden', 'true');
                artwork.innerHTML = '<svg viewBox="0 0 160 100" fill="none" focusable="false"><g transform="rotate(-18 95 50)"><rect x="52" y="15" width="90" height="50" rx="9"/><rect x="42" y="27" width="90" height="50" rx="9"/><circle cx="87" cy="52" r="12"/><path d="M53 40h8m52 24h8M87 45v14m-4-11h5a3 3 0 0 1 0 6h-5"/></g><path d="M27 21v12m-6-6h12M141 80v8m-4-4h8"/></svg>';
                card.appendChild(artwork);
            }
            card.addEventListener('click', () => {
                closeM(overlay.id);
                window.viewRecord(r.kind, r.id);
                back.hidden = false;
                detail.querySelector('.modal-x').focus();
            });
            list.appendChild(card);
        });
        if (!visible.length) {
            const empty = el('div', 'ad-empty');
            empty.append(icon('event_available'), el('strong', '', rows.length ? 'Sin movimientos de este tipo' : 'Un día sin movimientos'), el('p', '', rows.length ? 'Prueba con otro filtro para ver el resto.' : 'Los gastos y depósitos que registres aquí aparecerán en este día.'));
            list.appendChild(empty);
        }
    }

    function openDay(date, source, animated = true) {
        if (!inScope(date, scope())) return;
        selectedDate = date;
        filter = 'all';
        returnFocus = source || calendar.querySelector(`[data-date="${date}"]`) || get('acToday');
        calendar.querySelectorAll('.ac-day').forEach(b => b.classList.toggle('is-selected', b.dataset.date === date));
        renderDay();
        overlay.classList.toggle('is-instant', !animated);
        openM(overlay.id);
        overlay.querySelector('.ad-scroll').scrollTop = 0;
        get('adClose').focus();
    }
    get('adClose').addEventListener('click', () => closeM(overlay.id));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeM(overlay.id); });
    overlay.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', e => {
        if (filter === b.dataset.kind) return;
        filter = b.dataset.kind; renderDay();
        if (e.detail > 0 && !reducedMotion.matches) {
            get('adRecords').querySelectorAll('.ad-record').forEach((card, index) => {
                card.animate([{ opacity: .45, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, delay: Math.min(index * 24, 72), easing: 'cubic-bezier(.16,1,.3,1)' });
            });
        }
    }));
    function moveDay(delta, animated) {
        const date = d2(selectedDate); date.setDate(date.getDate() + delta);
        if (!inScope(localDate(date), scope())) return;
        selectedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        month = date.getMonth(); year = date.getFullYear();
        filter = 'all'; render();
        returnFocus = calendar.querySelector(`[data-date="${selectedDate}"]`);
        overlay.querySelector('.ad-scroll').scrollTop = 0;
        if (animated) animateContent(overlay.querySelector('.ad-scroll'), delta);
    }
    get('adPrev').addEventListener('click', e => moveDay(-1, e.detail > 0));
    get('adNext').addEventListener('click', e => moveDay(1, e.detail > 0));
    overlay.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const focusable = [...sheet.querySelectorAll('button:not([hidden])')].filter(b => b.offsetParent !== null);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    function restoreCalendarFocus() {
        if (document.querySelector('.modal-bg.active')) return;
        const target = returnFocus?.isConnected ? returnFocus : calendar.querySelector(`[data-date="${selectedDate}"]`);
        target?.focus({ preventScroll: true });
    }
    new MutationObserver(() => {
        if (!overlay.classList.contains('active')) restoreCalendarFocus();
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

    // Arrastrar la cabecera permite cerrar sin interferir con el scroll de las tarjetas.
    let dragStart = null;
    const header = overlay.querySelector('.ad-header');
    header.style.touchAction = 'pan-x';
    overlay.querySelector('.ad-handle').style.touchAction = 'none';
    sheet.addEventListener('pointerdown', e => {
        if (!e.target.closest('.ad-header, .ad-handle') || e.target.closest('button') || e.pointerType === 'mouse' || !e.isPrimary || dragStart) return;
        dragStart = { y: e.clientY, time: performance.now(), pointerId: e.pointerId };
        sheet.setPointerCapture(e.pointerId);
        sheet.style.transition = 'none';
    });
    sheet.addEventListener('pointermove', e => {
        if (dragStart && e.pointerId === dragStart.pointerId) {
            const delta = e.clientY - dragStart.y;
            sheet.style.transform = `translateY(${delta >= 0 ? delta : delta * 0.15}px)`;
        }
    });
    function releaseDrag(e) {
        if (!dragStart || e.pointerId !== dragStart.pointerId) return;
        const distance = Math.max(0, e.clientY - dragStart.y);
        const speed = distance / Math.max(1, performance.now() - dragStart.time);
        dragStart = null;
        sheet.style.transition = '';
        sheet.style.transform = '';
        if (e.type !== 'pointercancel' && (distance > 100 || (distance > 35 && speed > 0.5))) closeM(overlay.id);
    }
    sheet.addEventListener('pointerup', releaseDrag);
    sheet.addEventListener('pointercancel', releaseDrag);

    const detail = get('viewRecordModal');
    const back = el('button', 'ad-back', 'Volver al día');
    back.type = 'button'; back.hidden = true; back.prepend(icon('arrow_back'));
    detail.querySelector('.modal').prepend(back);
    back.addEventListener('click', () => { closeM(detail.id); openDay(selectedDate); });
    new MutationObserver(() => {
        if (!detail.classList.contains('active')) {
            if (!back.hidden) restoreCalendarFocus();
            back.hidden = true;
        }
    }).observe(detail, { attributes: true, attributeFilter: ['class'] });

    function moveMonth(delta, animated) {
        const next = new Date(year, month + delta, 1);
        month = next.getMonth(); year = next.getFullYear(); render();
        if (animated) animateContent(get('acDays'), delta);
    }
    get('acPrev').addEventListener('click', e => moveMonth(-1, e.detail > 0));
    get('acNext').addEventListener('click', e => moveMonth(1, e.detail > 0));
    get('acToday').addEventListener('click', () => {
        selectedDate = inScope(today(), scope()) ? today() : scope().end;
        const current = d2(selectedDate); month = current.getMonth(); year = current.getFullYear(); render();
        calendar.querySelector(`[data-date="${selectedDate}"]`)?.focus();
    });
    document.addEventListener('conta:calendar-update', render);
    render();
})();
