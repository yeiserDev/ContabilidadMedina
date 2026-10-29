/* Receipt capture with stable layout, cancellable reading and preserved evidence. */
(() => {
    'use strict';
    const get = id => document.getElementById(id);
    const paths = {
        scan: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3M7 9h10M7 12h10M7 15h6"/>',
        camera: '<path d="M4 7h4l1.5-2h5L16 7h4v12H4z"/><circle cx="12" cy="13" r="3"/>',
        image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/>',
        close: '<path d="m7 7 10 10M17 7 7 17"/>',
        check: '<path d="m5 12 4.5 4.5L19 7"/>',
        receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
        arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
        alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v.1"/>',
    };
    const icon = name => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths[name]}</svg>`;
    const modal = document.createElement('div');
    modal.id = 'scanModal';modal.className = 'modal-bg';
    modal.innerHTML = `<section class="modal scan-sheet" role="dialog" aria-modal="true" aria-labelledby="scanTitle" data-stage="empty">
        <div class="scan-handle" aria-hidden="true"></div>
        <header class="scan-header"><div class="scan-heading-icon">${icon('scan')}</div><div><h2 id="scanTitle">Escanear gasto</h2><p>Boletas, facturas y transferencias</p></div><button id="scanClose" class="scan-close" aria-label="Cerrar escáner">${icon('close')}</button></header>
        <div class="scan-content">
            <ol class="scan-steps" aria-label="Progreso del comprobante"><li><span>1</span>Foto</li><li><span>2</span>Lectura</li><li><span>3</span>Guardado</li></ol>
            <div class="scan-visual">
                <div class="scan-empty-art" aria-hidden="true"><span>${icon('receipt')}</span><strong>Tu próximo gasto empieza aquí</strong><small>Toma una foto o elige un comprobante</small></div>
                <img id="scanPreview" alt="Comprobante seleccionado" hidden>
                <div class="scan-photo-badge" aria-hidden="true"><span></span><b id="scanPhotoState">Vista previa</b></div>
                <div class="scan-sweep" aria-hidden="true"></div>
                <span class="scan-success-icon" aria-hidden="true">${icon('check')}</span>
                <span id="scanFileInfo" class="scan-file-info" hidden></span>
            </div>
            <div class="scan-actions"><button id="scanCamera">${icon('camera')}Tomar foto</button><button id="scanGallery">${icon('image')}Elegir imagen</button></div>
            <input id="scanCameraInput" type="file" accept="image/*" capture="environment" hidden>
            <input id="scanGalleryInput" type="file" accept="image/*" hidden>
            <div class="scan-feedback" role="status" aria-live="polite" aria-atomic="true"><span class="scan-feedback-icon" aria-hidden="true">${icon('scan')}</span><div><strong id="scanStageTitle">Listo para comenzar</strong><p id="scanStatus">La lectura empieza al elegir la foto.</p><small id="scanReference" hidden></small></div></div>
            <label class="scan-auto"><span>Guardar automáticamente<small>Solo si todos los datos están completos</small></span><input id="scanAuto" type="checkbox" role="switch" checked></label>
        </div>
        <footer class="scan-footer"><button id="scanRead" class="scan-primary"><span>Elegir comprobante</span>${icon('arrow')}</button><button id="scanEdit" class="scan-primary" hidden><span>Ver gasto guardado</span>${icon('arrow')}</button><button id="scanManual" class="scan-manual" hidden>Completar manualmente con esta foto</button><p id="scanFootnote">La imagen se enviará a Gemini para leer sus datos.</p></footer>
    </section>`;
    document.body.appendChild(modal);
    const sheet = modal.querySelector('.scan-sheet');
    let image = null, hash = null, savedId = null, busy = false, previewUrl = null;
    let epoch = 0, controller = null, deadline = 0, readingNotice = 0, lastStep = 0;
    const stageTitles = { empty: 'Listo para comenzar', preparing: 'Preparando tu foto', ready: 'Foto conservada', reading: 'Leyendo el comprobante', saving: 'Guardando tu gasto', success: 'Gasto registrado', error: 'La lectura no se completó' };
    function status(message) { get('scanStatus').textContent = message; }
    function setStage(stage, message) {
        sheet.dataset.stage = stage;get('scanStageTitle').textContent = stageTitles[stage];
        if (message) status(message);
        if (stage !== 'error') lastStep = ({ empty: 0, preparing: 0, ready: 0, reading: 1, saving: 2, success: 3 })[stage];
        modal.querySelectorAll('.scan-steps li').forEach((item, i) => {
            item.classList.toggle('is-done', i < lastStep);item.classList.toggle('is-current', i === lastStep);item.classList.toggle('is-error', stage === 'error' && i === lastStep);
            if (i === lastStep) item.setAttribute('aria-current', 'step');else item.removeAttribute('aria-current');
        });
        modal.querySelector('.scan-feedback-icon').innerHTML = icon(stage === 'success' ? 'check' : stage === 'error' ? 'alert' : 'scan');
        get('scanPhotoState').textContent = ({ preparing: 'Preparando', reading: 'Leyendo', saving: 'Guardando', success: 'Guardado', error: 'Foto conservada' })[stage] || 'Vista previa';
        get('scanReference').hidden = true;get('scanRead').hidden = stage === 'success';get('scanEdit').hidden = stage !== 'success';
        get('scanManual').hidden = stage !== 'error' || !image;get('scanFootnote').hidden = !get('scanManual').hidden;
        get('scanFootnote').textContent = ({ reading: 'Puedes cerrar la hoja para cancelar la lectura.', saving: 'Espera a que termine de guardarse el comprobante.', success: 'Abre el gasto para revisar o editar sus datos.' })[stage] || 'La imagen se enviará a Gemini para leer sus datos.';
        get('scanRead').querySelector('span').textContent = ({ preparing: 'Preparando…', reading: 'Leyendo comprobante…', saving: 'Guardando…', error: image ? 'Reintentar lectura' : 'Elegir otra imagen', ready: 'Leer comprobante' })[stage] || 'Elegir comprobante';
        get('scanClose').setAttribute('aria-label', ['reading', 'preparing'].includes(stage) ? 'Cancelar lectura y cerrar' : 'Cerrar escáner');
    }
    function setBusy(value) {
        busy = value;
        ['scanCamera', 'scanGallery', 'scanRead', 'scanAuto', 'scanManual'].forEach(id => get(id).disabled = value);
        get('scanClose').disabled = value && sheet.dataset.stage === 'saving';
        sheet.classList.toggle('is-busy', value);
    }
    function releasePreview() { if (previewUrl) URL.revokeObjectURL(previewUrl);previewUrl = null; }
    function close() {
        if (busy && sheet.dataset.stage === 'saving') return;
        epoch++;controller?.abort();controller = null;clearTimeout(deadline);clearTimeout(readingNotice);
        if (busy) setStage(image ? 'ready' : 'empty', image ? 'La lectura se canceló. Puedes reintentarlo con esta foto.' : 'Elige un comprobante para comenzar.');
        if (!image) { releasePreview();get('scanPreview').hidden = true;get('scanFileInfo').hidden = true;sheet.classList.remove('has-photo'); }
        setBusy(false);closeM('scanModal');get('bnavScan').focus();
    }
    get('bnavScan').addEventListener('click', requireAuth(() => {
        if (busy) return;
        if (sheet.dataset.stage === 'success') {
            image = null;hash = null;savedId = null;releasePreview();get('scanPreview').hidden = true;get('scanFileInfo').hidden = true;sheet.classList.remove('has-photo');
            setStage('empty', 'La lectura empieza al elegir la foto.');
        }
        openM('scanModal');get('scanCamera').focus();
    }));
    get('scanClose').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) { e.stopImmediatePropagation();close(); } }, true);
    document.addEventListener('keydown', e => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') { e.preventDefault();e.stopImmediatePropagation();close(); }
        if (e.key === 'Tab') {
            const controls = [...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(el => !el.hidden && el.offsetParent);
            const first = controls[0], last = controls.at(-1);
            if (!first) { e.preventDefault();return; }
            if (e.shiftKey && document.activeElement === first) { e.preventDefault();last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault();first.focus(); }
        }
    }, true);
    function openDraft(data = {}) {
        editExpenseId = null;resetImageUI();populateCatSelect();
        get('expenseModalTitle').textContent = data.date ? 'Revisar gasto escaneado' : 'Completar gasto';
        get('expenseDate').value = data.date || '';get('expenseAmount').value = data.amount || '';get('expenseDescription').value = data.description || '';get('expenseCategory').value = data.category || '';get('expenseWallet').value = data.wallet || '';
        pendingImagesData = image ? [image] : [];pendingScanHash = hash;renderPendingImages();closeM('scanModal');openM('expenseModal');get('expenseDate').focus();
    }
    get('scanManual').addEventListener('click', () => { if (!busy && image) openDraft(); });
    ['Camera', 'Gallery'].forEach(kind => {
        get('scan' + kind).addEventListener('click', () => get('scan' + kind + 'Input').click());
        get('scan' + kind + 'Input').addEventListener('change', async e => {
            const file = e.target.files[0];e.target.value = '';
            if (!file || busy) return;
            const run = ++epoch;image = null;hash = null;savedId = null;releasePreview();get('scanPreview').hidden = true;get('scanFileInfo').hidden = true;sheet.classList.remove('has-photo');
            if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) { setStage('error', 'Elige una imagen de hasta 25 MB.');return; }
            previewUrl = URL.createObjectURL(file);get('scanPreview').src = previewUrl;get('scanPreview').hidden = false;sheet.classList.add('has-photo');
            setStage('preparing', 'Optimizando la foto para conservar el comprobante con menos peso.');setBusy(true);
            try {
                const [prepared, digest] = await Promise.all([comprimir(file), file.arrayBuffer().then(buffer => crypto.subtle.digest('SHA-256', buffer))]);
                if (run !== epoch) return;
                if (!prepared) throw new Error('No pudimos abrir la foto. Prueba con JPEG o PNG.');
                image = prepared;hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');get('scanPreview').src = image;releasePreview();
                get('scanFileInfo').textContent = `Foto optimizada · ${Math.max(1, Math.round(dataUrlBytes(image) / 1024))} KB`;get('scanFileInfo').hidden = false;
                const duplicate = expenses.find(exp => exp.receiptHash === hash);
                if (duplicate) { savedId = duplicate.id;setStage('success', 'Este comprobante ya tiene un gasto. Puedes verlo sin duplicarlo.');return; }
                setStage('ready', 'La foto está lista para leer.');
            } catch (error) { if (run === epoch) setStage('error', error.message || 'No se pudo preparar la foto.'); }
            finally { if (run === epoch) setBusy(false); }
            if (run === epoch && image && sheet.dataset.stage === 'ready') await readReceipt();
        });
    });
    get('scanEdit').addEventListener('click', () => { if (savedId) { closeM('scanModal');window.viewRecord('expense', savedId); } });
    async function readReceipt() {
        if (busy) return;
        if (!image) { get('scanGalleryInput').click();return; }
        const existing = expenses.find(exp => exp.receiptHash === hash);
        if (existing) { savedId = existing.id;setStage('success', 'Este comprobante ya está registrado. Puedes abrir su gasto.');return; }
        const run = ++epoch;controller = new AbortController();const signal = controller.signal;let timedOut = false;
        setStage('reading', 'Buscando fecha, importe y concepto. Puedes cerrar para cancelar.');setBusy(true);
        deadline = setTimeout(() => { timedOut = true;controller?.abort(); }, 65_000);
        readingNotice = setTimeout(() => { if (run === epoch && sheet.dataset.stage === 'reading') status('La lectura sigue en curso. Conservamos tu foto mientras esperamos.'); }, 10_000);
        try {
            if (!auth?.currentUser) throw new Error('Inicia sesión nuevamente para leer el comprobante. Tu foto está conservada.');
            const token = await auth.currentUser.getIdToken();
            if (run !== epoch) return;
            if (signal.aborted) throw new DOMException('Reading cancelled', 'AbortError');
            const response = await fetch(`${BACKEND_URL}/api/scan-receipt`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ image, categories }) });
            let data;try { data = await response.json(); } catch { throw new Error('El servidor no devolvió una lectura válida. Tu foto sigue conservada.'); }
            if (run !== epoch) return;
            clearTimeout(deadline);clearTimeout(readingNotice);
            if (!response.ok) {
                setStage('error', data.error || 'No se pudo leer el comprobante. Tu foto sigue aquí.');
                if (data.requestId) { get('scanReference').textContent = `Referencia: ${String(data.requestId).slice(0, 16)}`;get('scanReference').hidden = false; }
                return;
            }
            if (!data.isExpense) throw new Error('No identificamos un pago enviado. Revisa la imagen o completa el gasto manualmente.');
            if (data.currency !== 'PEN') throw new Error('No se confirmó el importe en soles. Completa el gasto para revisar la moneda.');
            const duplicate = expenses.some(exp => exp.date === data.date && Number(exp.amount) === data.amount && exp.description === data.description);
            if (data.needsReview || duplicate || !get('scanAuto').checked) {
                setStage('ready', 'Los datos están preparados para que los revises.');openDraft(data);toast(duplicate ? 'Hay un gasto similar. Revísalo antes de guardar.' : data.note || 'Revisa los datos antes de guardar.');return;
            }
            editExpenseId = null;resetImageUI();populateCatSelect();
            get('expenseModalTitle').textContent = 'Gasto escaneado';
            get('expenseDate').value = data.date;get('expenseAmount').value = data.amount;get('expenseDescription').value = data.description;get('expenseCategory').value = data.category;get('expenseWallet').value = data.wallet;
            pendingImagesData = [image];pendingScanHash = hash;renderPendingImages();
            setStage('saving', 'Guardando el comprobante en Drive y registrando el gasto.');setBusy(true);
            const result = await saveExpense({ quiet: true });
            if (!result) { setStage('error', 'No se pudo guardar. Tu comprobante sigue adjunto para reintentar.');closeM('scanModal');openM('expenseModal');return; }
            savedId = result;setStage('success', `${money(data.amount)} · ${data.date}. Comprobante adjunto y listo para editar.`);get('scanEdit').focus();
        } catch (error) {
            if (run === epoch) setStage('error', timedOut ? 'El servidor no respondió a tiempo. Reintenta o completa el gasto con esta foto.' : error.message || 'No hay conexión. Tu foto sigue conservada.');
        } finally {
            if (run === epoch) { clearTimeout(deadline);clearTimeout(readingNotice);controller = null;setBusy(false); }
        }
    }
    get('scanRead').addEventListener('click', readReceipt);setStage('empty');
})();
