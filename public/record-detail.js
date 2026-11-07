/* Record detail polish (see record-detail.css). */
(() => {
    'use strict';
    const modal = document.getElementById('viewRecordModal');
    if (!modal) return;
    const photos = document.getElementById('viewRecordMultiImages');
    const scene = document.getElementById('viewRecordScene');
    const hint = modal.querySelector('.vr-photo-hint');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hintDefault = hint ? hint.innerHTML : '';

    // Mark receipts taller than their frame so they fill it from the top and
    // can be scanned on hover; the scan speed follows how much is hidden.
    function fit(img) {
        if (!img.naturalWidth || !img.clientWidth || !img.clientHeight) return;
        const shown = img.clientWidth * img.naturalHeight / img.naturalWidth;
        const tall = shown > img.clientHeight * 1.08;
        img.classList.toggle('is-tall', tall);
        if (tall) img.style.setProperty('--scan', `${Math.min(7, Math.max(2.2, (shown - img.clientHeight) / 260)).toFixed(1)}s`);
        if (hint) {
            const anyTall = !!photos.querySelector('.vr-photo.is-tall');
            hint.innerHTML = anyTall
                ? '<span class="material-symbols-outlined" style="font-size: 14px; vertical-align: -2px;">swipe_down</span> Pasa el cursor para recorrerlo · clic para ampliar'
                : hintDefault;
        }
    }
    const refit = () => photos?.querySelectorAll('.vr-photo').forEach(fit);
    photos?.addEventListener('load', event => { if (event.target.tagName === 'IMG') fit(event.target); }, true);
    if (photos) new ResizeObserver(refit).observe(photos);
    // New records reuse the same container: refresh the hint and sizes.
    if (photos) new MutationObserver(() => { if (hint) hint.innerHTML = hintDefault; requestAnimationFrame(refit); })
        .observe(photos, { childList: true });

    // Scene parallax toward the pointer (desktop pointers only).
    if (scene && window.matchMedia('(hover: hover)').matches) {
        scene.addEventListener('pointermove', event => {
            if (reduceMotion.matches) return;
            const box = scene.getBoundingClientRect();
            const x = (event.clientX - box.left) / box.width - 0.5;
            const y = (event.clientY - box.top) / box.height - 0.5;
            scene.style.setProperty('--vr-px', `${(-x * 10).toFixed(1)}px`);
            scene.style.setProperty('--vr-py', `${(-y * 6).toFixed(1)}px`);
        });
        scene.addEventListener('pointerleave', () => {
            scene.style.removeProperty('--vr-px');
            scene.style.removeProperty('--vr-py');
        });
    }
})();
