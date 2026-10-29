/* Capture → extract → save with the existing Drive and expense pipeline. */
(() => {
    'use strict';
    const get = id => document.getElementById(id);
    const modal = document.createElement('div');
    modal.id = 'scanModal';modal.className = 'modal-bg';
    modal.innerHTML = `<section class="modal scan-sheet" role="dialog" aria-modal="true" aria-labelledby="scanTitle">
        <div class="modal-hd"><h2 id="scanTitle">Escanear gasto</h2><button class="modal-x" id="scanClose" aria-label="Cerrar escáner">×</button></div>
        <div class="modal-bd">
            <p class="scan-intro">Una foto de tu boleta, factura o transferencia. Completamos el gasto y guardamos el comprobante comprimido en Drive.</p>
            <div class="scan-actions"><button class="mb mb--blue" id="scanCamera">Tomar foto</button><button class="mb mb--ghost" id="scanGallery">Elegir imagen</button></div>
            <input id="scanCameraInput" type="file" accept="image/*" capture="environment" hidden>
            <input id="scanGalleryInput" type="file" accept="image/*" hidden>
            <img id="scanPreview" alt="Comprobante seleccionado" hidden>
            <label class="scan-auto"><input id="scanAuto" type="checkbox" checked><span>Guardar automáticamente<small>Si los datos están completos. Podrás editarlos después.</small></span></label>
            <p id="scanStatus" role="status" aria-live="polite">La imagen se enviará a Gemini para leer sus datos.</p>
            <button class="mb mb--blue" id="scanRead" hidden>Leer y registrar</button>
            <button class="mb mb--ghost" id="scanEdit" hidden>Ver gasto guardado</button>
        </div>
    </section>`;
    document.body.appendChild(modal);
    let image = null, hash = null, savedId = null, busy = false;
    const status = message => { get('scanStatus').textContent = message; };
    function setBusy(value) {
        busy = value;
        ['scanCamera', 'scanGallery', 'scanRead', 'scanAuto', 'scanClose'].forEach(id => get(id).disabled = value);
        modal.setAttribute('aria-busy', String(value));
    }
    get('bnavScan').addEventListener('click', requireAuth(() => {
        if (busy) return;
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
            image = null;hash = null;savedId = null;
            get('scanRead').hidden = true;get('scanEdit').hidden = true;get('scanPreview').hidden = true;
            if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) { status('Elige una imagen de hasta 25 MB.');return; }
            setBusy(true);status('Preparando la imagen…');
            try {
                const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
                hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
                const duplicate = expenses.find(exp => exp.receiptHash === hash);
                if (duplicate) { savedId = duplicate.id;get('scanEdit').hidden = false;status('Esta imagen ya está registrada. Puedes abrir el gasto.');return; }
                image = await comprimir(file);
                if (!image) throw new Error('No se pudo abrir la imagen. Usa una foto JPEG o PNG.');
                get('scanPreview').src = image;get('scanPreview').hidden = false;
                get('scanRead').hidden = false;status('Imagen lista. Se enviará a Gemini al pulsar «Leer y registrar».');
            } catch (error) { status(error.message || 'No se pudo preparar la foto.'); }
            finally { setBusy(false); }
        });
    });
    get('scanEdit').addEventListener('click', () => { if (savedId) { closeM('scanModal');window.viewRecord('expense', savedId); } });
    get('scanRead').addEventListener('click', async () => {
        if (!image || busy) return;
        const existing = expenses.find(exp => exp.receiptHash === hash);
        if (existing) {
            savedId = existing.id;get('scanRead').hidden = true;get('scanEdit').hidden = false;
            status('Esta imagen ya está registrada. Puedes abrir el gasto.');return;
        }
        setBusy(true);status('Leyendo fecha, monto y detalle… Si Gemini está ocupado, probaremos una segunda lectura.');
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
                status('Datos preparados para revisión. El gasto todavía no se ha guardado.');
                closeM('scanModal');openM('expenseModal');
                toast(duplicate ? 'Hay un gasto similar. Revísalo antes de guardar.' : data.note || 'Revisa los datos antes de guardar.');
                get('expenseDate').focus();return;
            }
            status('Guardando el comprobante en Drive…');
            const result = await saveExpense();
            if (!result) {
                status('No se pudo guardar. El comprobante sigue adjunto en el formulario para reintentar.');
                closeM('scanModal');openM('expenseModal');
                toast('El gasto no se guardó. Puedes reintentar desde aquí.', 'err');return;
            }
            savedId = result;get('scanRead').hidden = true;get('scanEdit').hidden = false;
            status(`Gasto registrado: ${money(data.amount)} · ${data.date}. Comprobante adjunto. Puedes editarlo desde su detalle.`);
            get('scanEdit').focus();
        } catch (error) { status(error.name === 'TimeoutError' ? 'La lectura tardó demasiado. Vuelve a intentarlo.' : error.message || 'No hay conexión. Inténtalo nuevamente.'); }
        finally { setBusy(false); }
    });
})();
