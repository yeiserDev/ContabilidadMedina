/* Capture → extract → save with the existing Drive and expense pipeline. */
(() => {
    'use strict';
    const get = id => document.getElementById(id);
    const modal = document.createElement('div');
    modal.id = 'scanModal';modal.className = 'modal-bg';
    modal.innerHTML = `<section class="modal scan-sheet" role="dialog" aria-modal="true" aria-labelledby="scanTitle" data-stage="empty">
        <div class="modal-hd"><div class="scan-heading"><span class="scan-heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3m11-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3M7 9h10M7 12h10M7 15h6"/></svg></span><h2 id="scanTitle">Escanear gasto</h2></div><button class="modal-x" id="scanClose" aria-label="Cerrar escáner"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
        <div class="modal-bd">
            <p class="scan-intro">Fotografía una boleta o el comprobante de una transferencia. Leeremos sus datos para registrar el gasto.</p>
            <div class="scan-steps" aria-label="Proceso de escaneo"><span class="scan-step">Foto</span><span class="scan-step">Lectura</span><span class="scan-step">Guardado</span></div>
            <div class="scan-visual" aria-hidden="true"><div class="scan-visual-inner"><span class="scan-placeholder"><svg viewBox="0 0 48 48" fill="none"><rect x="9" y="5" width="30" height="38" rx="5"/><path d="M16 16h16M16 23h16M16 30h9"/></svg></span><img id="scanPreview" alt="" hidden><span class="scan-corner scan-corner--tl"></span><span class="scan-corner scan-corner--tr"></span><span class="scan-corner scan-corner--bl"></span><span class="scan-corner scan-corner--br"></span><span class="scan-line"></span><span class="scan-success-icon"><svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4.5 4.5L19 7"/></svg></span></div><span class="scan-splash"><svg viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3m11-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3M7 9h10M7 12h10M7 15h6"/></svg><span>Conta Medina</span></span></div>
            <div class="scan-actions"><button class="mb mb--blue" id="scanCamera"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h4l1.5-2h5L16 7h4v12H4z"/><circle cx="12" cy="13" r="3"/></svg>Tomar foto</button><button class="mb mb--ghost" id="scanGallery"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg>Elegir imagen</button></div>
            <input id="scanCameraInput" type="file" accept="image/*" capture="environment" hidden>
            <input id="scanGalleryInput" type="file" accept="image/*" hidden>
            <label class="scan-auto"><input id="scanAuto" type="checkbox" checked><span>Guardar automáticamente<small>Si los datos están completos. Podrás editarlos después.</small></span></label>
            <div class="scan-feedback" role="status" aria-live="polite"><span class="scan-spinner" aria-hidden="true"></span><div><strong id="scanStageTitle">Listo para comenzar</strong><p id="scanStatus">La foto se comprimirá antes de guardarse en Drive.</p></div></div>
            <button class="mb mb--blue" id="scanRead" hidden>Leer y registrar</button>
            <button class="mb mb--ghost" id="scanEdit" hidden>Ver gasto guardado</button>
        </div>
    </section>`;
    document.body.appendChild(modal);
    let image = null, hash = null, savedId = null, busy = false, previewUrl = null, splashTimer = 0, readingTimer = 0;
    const sheet = modal.querySelector('.scan-sheet');
    const stageTitles = { empty: 'Listo para comenzar', preparing: 'Preparando la foto', ready: 'Foto preparada', reading: 'Leyendo el comprobante', saving: 'Guardando el gasto', success: 'Gasto registrado', error: 'No se completó' };
    function setStage(stage) { sheet.dataset.stage = stage;get('scanStageTitle').textContent = stageTitles[stage]; }
    const status = message => { get('scanStatus').textContent = message; };
    function setBusy(value) {
        busy = value;
        ['scanCamera', 'scanGallery', 'scanRead', 'scanAuto', 'scanClose'].forEach(id => get(id).disabled = value);
        modal.setAttribute('aria-busy', String(value));
        sheet.setAttribute('aria-busy', String(value));
    }
    get('bnavScan').addEventListener('click', requireAuth(() => {
        if (busy) return;
        if (sheet.dataset.stage === 'success') {
            image = null;hash = null;savedId = null;get('scanPreview').hidden = true;
            get('scanRead').hidden = true;get('scanEdit').hidden = true;
            setStage('empty');status('La foto se comprimirá antes de guardarse en Drive.');
        }
        clearTimeout(splashTimer);
        sheet.classList.add('is-entering');
        splashTimer = setTimeout(() => sheet.classList.remove('is-entering'), 420);
        openM('scanModal');get('scanCamera').focus();
    }));
    get('scanClose').addEventListener('click', () => { if (!busy) { closeM('scanModal');get('bnavScan').focus(); } });
    // Do not dismiss midway through a save and leave its result invisible.
    modal.addEventListener('click', e => { if (e.target === modal) e.stopImmediatePropagation(); }, true);
    document.addEventListener('keydown', e => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') { e.stopImmediatePropagation();if (!busy) get('scanClose').click(); }
        if (e.key === 'Tab') {
            const controls = [...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(el => !el.hidden && el.offsetParent);
            if (!controls.length) { e.preventDefault();return; }
            const first = controls[0], last = controls.at(-1);
            if (e.shiftKey && document.activeElement === first) { e.preventDefault();last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault();first.focus(); }
        }
    }, true);
    ['Camera', 'Gallery'].forEach(kind => {
        get('scan' + kind).addEventListener('click', () => get('scan' + kind + 'Input').click());
        get('scan' + kind + 'Input').addEventListener('change', async e => {
            const file = e.target.files[0];e.target.value = '';
            if (!file || busy) return;
            clearTimeout(splashTimer);sheet.classList.remove('is-entering');
            image = null;hash = null;savedId = null;
            get('scanRead').hidden = true;get('scanEdit').hidden = true;get('scanPreview').hidden = true;
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = null;
            if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) { setStage('error');status('Elige una imagen de hasta 25 MB.');return; }
            previewUrl = URL.createObjectURL(file);
            get('scanPreview').src = previewUrl;get('scanPreview').hidden = false;
            setStage('preparing');setBusy(true);status('Comprimiendo la imagen para conservarla con buena calidad y menos peso.');
            try {
                const [preparedImage, digest] = await Promise.all([
                    comprimir(file),
                    file.arrayBuffer().then(buffer => crypto.subtle.digest('SHA-256', buffer)),
                ]);
                hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
                const duplicate = expenses.find(exp => exp.receiptHash === hash);
                if (duplicate) { savedId = duplicate.id;get('scanEdit').hidden = false;setStage('success');status('Esta imagen ya está registrada. Puedes abrir el gasto.');return; }
                image = preparedImage;
                if (!image) throw new Error('No se pudo abrir la imagen. Usa una foto JPEG o PNG.');
                get('scanPreview').src = image;get('scanPreview').hidden = false;
                if (previewUrl) { URL.revokeObjectURL(previewUrl);previewUrl = null; }
                setStage('ready');get('scanRead').textContent = 'Reintentar lectura';get('scanRead').hidden = false;
                status('Foto preparada. Iniciando la lectura…');
            } catch (error) { setStage('error');status(error.message || 'No se pudo preparar la foto.'); }
            finally { setBusy(false); }
            if (image && sheet.dataset.stage === 'ready') get('scanRead').click();
        });
    });
    get('scanEdit').addEventListener('click', () => { if (savedId) { closeM('scanModal');window.viewRecord('expense', savedId); } });
    get('scanRead').addEventListener('click', async () => {
        if (!image || busy) return;
        const existing = expenses.find(exp => exp.receiptHash === hash);
        if (existing) {
            savedId = existing.id;get('scanRead').hidden = true;get('scanEdit').hidden = false;
            setStage('success');status('Esta imagen ya está registrada. Puedes abrir el gasto.');return;
        }
        setStage('reading');setBusy(true);status('Buscando fecha, importe y concepto en la imagen.');
        clearTimeout(readingTimer);
        readingTimer = setTimeout(() => {
            if (sheet.dataset.stage === 'reading') status('Gemini sigue leyendo. Si tarda, se probará un modelo más ligero.');
        }, 8000);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch(`${BACKEND_URL}/api/scan-receipt`, {
                method: 'POST', signal: AbortSignal.timeout(55_000),
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ image, categories }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo leer el comprobante.');
            if (!data.isExpense) throw new Error('No se identificó un gasto. Usa una boleta o un comprobante de pago enviado.');
            if (data.currency !== 'PEN') throw new Error('No se confirmó un importe en soles. Registra este gasto manualmente para verificar la moneda.');
            // Populate without triggering description autocomplete or defaulting missing data.
            editExpenseId = null;resetImageUI();populateCatSelect();
            get('expenseModalTitle').textContent = 'Gasto escaneado';
            get('expenseDate').value = data.date || '';
            get('expenseAmount').value = data.amount || '';
            get('expenseDescription').value = data.description || '';
            get('expenseCategory').value = data.category || '';
            get('expenseWallet').value = data.wallet || '';
            pendingImagesData = [image];pendingScanHash = hash;renderPendingImages();
            const duplicate = expenses.some(exp => exp.date === data.date && Number(exp.amount) === data.amount && exp.description === data.description);
            if (data.needsReview || duplicate || !get('scanAuto').checked) {
                setStage('ready');status('Datos preparados para revisión. El gasto todavía no se ha guardado.');
                closeM('scanModal');openM('expenseModal');
                toast(duplicate ? 'Hay un gasto similar. Revísalo antes de guardar.' : data.note || 'Revisa los datos antes de guardar.');
                get('expenseDate').focus();return;
            }
            setStage('saving');status('Subiendo el comprobante comprimido a Drive y registrando el gasto.');
            const result = await saveExpense({ quiet: true });
            if (!result) {
                setStage('error');status('No se pudo guardar. El comprobante sigue adjunto en el formulario para reintentar.');
                closeM('scanModal');openM('expenseModal');
                toast('El gasto no se guardó. Puedes reintentar desde aquí.', 'err');return;
            }
            savedId = result;get('scanRead').hidden = true;get('scanEdit').hidden = false;
            setStage('success');status(`Gasto registrado: ${money(data.amount)} · ${data.date}. Comprobante adjunto. Puedes editarlo desde su detalle.`);
            get('scanEdit').focus();
        } catch (error) { setStage('error');status(error.name === 'TimeoutError' ? 'La lectura tardó demasiado. Vuelve a intentarlo.' : error.message || 'No hay conexión. Inténtalo nuevamente.'); }
        finally { clearTimeout(readingTimer);setBusy(false); }
    });
})();
