/* Payments — the catalogue of Peruvian payment methods (banks, cajas and
   wallets) with their brand marks, and the money inputs that type like a
   calculator: numeric keypad, thousands separators and two decimals. */
(() => {
    'use strict';

    /* ---------- Payment methods ----------
       Yape, BCP and Efectivo keep the marks already drawn in app.js; the rest
       are brand-coloured tiles. `bg` also paints the method chip. */
    const WALLETS = [
        { id: 'yape', name: 'Yape', group: 'Billeteras', bg: ['#8E2A9E', '#4A0D5C'] },
        { id: 'plin', name: 'Plin', group: 'Billeteras', bg: ['#00C9B7', '#0089D1'], mark: ['plin', '#fff', 8.6] },
        { id: 'bcp', name: 'BCP', group: 'Bancos', bg: ['#0A3FB0', '#002A8D'] },
        { id: 'interbank', name: 'Interbank', group: 'Bancos', bg: ['#05BE50', '#00873A'], mark: ['ib', '#fff', 11.5], bar: '#0039A6' },
        { id: 'bbva', name: 'BBVA', group: 'Bancos', bg: ['#1464A5', '#072146'], mark: ['BBVA', '#fff', 6.4] },
        { id: 'scotiabank', name: 'Scotiabank', group: 'Bancos', bg: ['#EC111A', '#B30C12'], mark: ['S', '#fff', 15] },
        { id: 'nacion', name: 'Banco de la Nación', group: 'Bancos', bg: ['#E2231A', '#A5150F'], mark: ['BN', '#fff', 9.5] },
        { id: 'banbif', name: 'BanBif', group: 'Bancos', bg: ['#1B3A8C', '#00205B'], mark: ['bif', '#fff', 10], bar: '#00A3E0' },
        { id: 'pichincha', name: 'Banco Pichincha', group: 'Bancos', bg: ['#FFDD00', '#F2C200'], mark: ['P', '#0F265C', 15], ink: '#0F265C' },
        { id: 'mibanco', name: 'Mibanco', group: 'Bancos', bg: ['#00A859', '#007A41'], mark: ['mi', '#FFD600', 11.5] },
        { id: 'cajahuancayo', name: 'Caja Huancayo', group: 'Cajas', bg: ['#E31E24', '#A8141A'], mark: ['CH', '#fff', 9.5], bar: '#FFD200' },
        { id: 'cajaarequipa', name: 'Caja Arequipa', group: 'Cajas', bg: ['#D7282F', '#9E1A20'], mark: ['CA', '#fff', 9.5], bar: '#1D3F8F' },
        { id: 'efectivo', name: 'Efectivo', group: 'Otros' }
    ];
    const byId = Object.fromEntries(WALLETS.map(wallet => [wallet.id, wallet]));
    const legacyIcon = window.getWalletIcon;

    function tile(wallet, size) {
        const [text, fill, fontSize] = wallet.mark;
        const id = `wg-${wallet.id}`;
        const bar = wallet.bar ? `<rect x="5" y="18.6" width="14" height="1.6" rx=".8" fill="${wallet.bar}"/>` : '';
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="wallet-icon" role="img" aria-label="${wallet.name}" style="margin-right:6px;flex-shrink:0;vertical-align:middle;border-radius:22%;box-shadow:0 1px 3px rgba(0,0,0,.15)">`
            + `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${wallet.bg[0]}"/><stop offset="1" stop-color="${wallet.bg[1]}"/></linearGradient></defs>`
            + `<rect width="24" height="24" rx="5.5" fill="url(#${id})"/>`
            + `<text x="12" y="${wallet.bar ? 11.2 : 12.4}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="-.3" fill="${fill}">${text}</text>`
            + `${bar}</svg>`;
    }

    const walletOf = id => byId[id] || byId.efectivo;
    window.WALLETS = WALLETS;
    window.WALLET_IDS = WALLETS.map(wallet => wallet.id);
    window.getWalletName = id => walletOf(id).name;
    window.getWalletIcon = (id, size = 22) => {
        const wallet = walletOf(id);
        return wallet.mark ? tile(wallet, size) : legacyIcon(wallet.id, size);
    };
    window.getPayChip = id => {
        const wallet = walletOf(id);
        const key = wallet.id;
        const rings = key === 'yape' ? '<span class="vr-pay-ring"></span><span class="vr-pay-ring"></span>' : '';
        // Yape, BCP and Efectivo have their own chip styles; the rest take their brand colours.
        const style = wallet.mark ? ` style="background:linear-gradient(135deg, ${wallet.bg[0]}, ${wallet.bg[1]});color:${wallet.ink || '#fff'}"` : '';
        return `<span class="vr-pay vr-pay--${key}"${style}>${rings}`
            + `<span class="vr-pay-ic">${window.getWalletIcon(key, 22)}</span>`
            + `<span class="vr-pay-nm">${wallet.name}</span></span>`;
    };

    /* ---------- Money inputs ----------
       type="text" + inputmode="decimal" opens the numeric keypad on phones.
       The value is shown as 1,234.56; a typed comma counts as the decimal
       point, because the Spanish keypad offers "," as its decimal key. */
    const significant = char => /[\d.]/.test(char);
    function format(raw, caret) {
        let before = 0;
        for (let i = 0; i < caret; i++) if (significant(raw[i])) before++;
        let clean = raw.replace(/[^\d.]/g, '');
        const dot = clean.indexOf('.');
        if (dot >= 0) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '').slice(0, 2);
        let [whole, decimals] = clean.split('.');
        whole = whole.replace(/^0+(?=\d)/, '').slice(0, 9);
        if (!whole && decimals !== undefined) { whole = '0'; before++; }
        const out = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimals !== undefined ? `.${decimals}` : '');
        let pos = 0, seen = 0;
        while (pos < out.length && seen < before) { if (significant(out[pos])) seen++; pos++; }
        return { out, pos };
    }
    window.parseMoney = value => {
        const number = parseFloat(String(value ?? '').replace(/,/g, ''));
        return Number.isFinite(number) ? number : NaN;
    };
    window.formatMoneyInput = value => {
        const number = window.parseMoney(value);
        return Number.isFinite(number) ? number.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '';
    };
    function enhance(input) {
        if (input.dataset.moneyReady) return;
        input.dataset.moneyReady = '1';
        input.addEventListener('beforeinput', event => {
            if (event.inputType !== 'insertText' || event.data == null) return;
            if (/^\d+$/.test(event.data)) return;
            event.preventDefault();
            if ((event.data === ',' || event.data === '.') && !input.value.includes('.')) {
                input.setRangeText('.', input.selectionStart, input.selectionEnd, 'end');
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        input.addEventListener('input', () => {
            const { out, pos } = format(input.value, input.selectionStart ?? input.value.length);
            if (out === input.value) return;
            input.value = out;
            if (document.activeElement === input) input.setSelectionRange(pos, pos);
        });
        input.addEventListener('blur', () => { if (input.value.endsWith('.')) input.value = input.value.slice(0, -1); });
    }
    document.querySelectorAll('input[data-money]').forEach(enhance);
})();
