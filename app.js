/* ContaControl — App Logic with Firebase + Calendar & Reminders */

// DATA KEYS (localStorage fallback)
const KEYS = { d:'ct_deposits', e:'ct_expenses', c:'ct_categories', r:'ct_reminders' };
const DEF_CATS = ['Devolución Dinero Prestado','Gastos Diarios','Petróleo Eduardo','Viático Eduardo'];
const COLORS = ['#2563eb','#16a34a','#dc2626','#0d9488','#ea580c','#7c3aed','#c026d3','#059669','#d97706','#4f46e5'];
const DEF_REMINDERS = [
    { id:'r1', desc:'Pagar banco', day:3, repeat:'mensual' },
    { id:'r2', desc:'Pagar luz', day:1, repeat:'inicio' },
    { id:'r3', desc:'Pagar agua', day:1, repeat:'inicio' }
];

const loadLocal = (k,fb) => { try { const d=localStorage.getItem(k); return d?JSON.parse(d):fb; } catch{ return fb; } };
const saveLocal = (k,v) => localStorage.setItem(k,JSON.stringify(v));
const uid = () => Date.now().toString(36)+Math.random().toString(36).substr(2,5);

let deposits = loadLocal(KEYS.d,[]);
let expenses = loadLocal(KEYS.e,[]);
let categories = loadLocal(KEYS.c,DEF_CATS);
let reminders = loadLocal(KEYS.r,DEF_REMINDERS);

// ====== FIREBASE SYNC ======
let db = null;
let firebaseReady = false;

function initFirebase() {
    if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === 'TU_API_KEY_AQUI') {
        console.log('⚠️ Firebase no configurado. Usando solo localStorage.');
        return;
    }
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        firebaseReady = true;
        console.log('✅ Firebase conectado');

        // Listen for realtime changes
        db.ref('contacontrol').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                deposits = data.deposits || [];
                expenses = data.expenses || [];
                categories = data.categories || DEF_CATS;
                reminders = data.reminders || DEF_REMINDERS;
                // Sync to localStorage
                saveLocal(KEYS.d, deposits);
                saveLocal(KEYS.e, expenses);
                saveLocal(KEYS.c, categories);
                saveLocal(KEYS.r, reminders);
                renderAll();
                console.log('🔄 Datos sincronizados desde Firebase');
            }
        });
    } catch (err) {
        console.error('❌ Error Firebase:', err);
    }
}

function persist() {
    // Always save to localStorage
    saveLocal(KEYS.d, deposits);
    saveLocal(KEYS.e, expenses);
    saveLocal(KEYS.c, categories);
    saveLocal(KEYS.r, reminders);
    // Save to Firebase if available
    if (firebaseReady && db) {
        db.ref('contacontrol').set({
            deposits,
            expenses,
            categories,
            reminders,
            lastUpdated: new Date().toISOString()
        }).catch(err => console.error('Error guardando en Firebase:', err));
    }
}

// DATE
const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MES_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const d2 = s => new Date(s+'T12:00:00');
const fmtDate = s => { const d=d2(s); return `${d.getDate()} de ${MES[d.getMonth()]} ${d.getFullYear()}`; };
const weekday = s => DIA[d2(s).getDay()];
const dayNum = s => d2(s).getDate();
const monShort = s => MES_S[d2(s).getMonth()];
const monYear = s => { const d=d2(s); return `${MES[d.getMonth()]} ${d.getFullYear()}`; };
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const money = n => { const num = Number(n); const formatted = num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return `S/ ${formatted}`; };

// BALANCE
const allDates = () => [...new Set([...deposits.map(d=>d.date),...expenses.map(e=>e.date)])].sort();
const balBefore = dt => { let b=0; deposits.forEach(d=>{if(d.date<dt)b+=+d.amount}); expenses.forEach(e=>{if(e.date<dt)b-=+e.amount}); return b; };
const dayDeps = dt => deposits.filter(d=>d.date===dt);
const dayExps = dt => expenses.filter(e=>e.date===dt);
const sumDeps = dt => dayDeps(dt).reduce((s,d)=>s+ +d.amount,0);
const sumExps = dt => dayExps(dt).reduce((s,e)=>s+ +e.amount,0);
const totalBal = () => deposits.reduce((s,d)=>s+ +d.amount,0)-expenses.reduce((s,e)=>s+ +e.amount,0);
const catTotals = () => { const t={}; categories.forEach(c=>t[c]=0); expenses.forEach(e=>{if(t[e.category]!==undefined)t[e.category]+= +e.amount}); return t; };

// TOAST
function toast(msg,type='ok'){
    let box=document.querySelector('.toast-box');
    if(!box){box=document.createElement('div');box.className='toast-box';document.body.appendChild(box);}
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<span class="material-symbols-outlined">${type==='ok'?'check_circle':'error'}</span><span>${msg}</span>`;
    box.appendChild(el);
    setTimeout(()=>{el.style.animation='tOut .25s ease forwards';setTimeout(()=>el.remove(),250);},2800);
}

// MODALS
const openM = id => document.getElementById(id).classList.add('active');
const closeM = id => document.getElementById(id).classList.remove('active');
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeM(b.dataset.close)));
document.querySelectorAll('.modal-bg').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)closeM(bg.id);}));
let pendingConfirm=null;
function confirm_(title,msg,fn){document.getElementById('confirmTitle').textContent=title;document.getElementById('confirmMessage').textContent=msg;pendingConfirm=fn;openM('confirmModal');}
document.getElementById('confirmAction').addEventListener('click',()=>{if(pendingConfirm)pendingConfirm();pendingConfirm=null;closeM('confirmModal');});

let editDepositId=null, editExpenseId=null;

// ====== RENDER KPIs ======
function renderKPIs(){
    const ti=deposits.reduce((s,d)=>s+ +d.amount,0), te=expenses.reduce((s,e)=>s+ +e.amount,0);
    document.getElementById('totalIncome').textContent=money(ti);
    document.getElementById('totalExpenses').textContent=money(te);
    document.getElementById('totalDeposits').textContent=deposits.length;
    document.getElementById('totalDays').textContent=allDates().length;
    document.getElementById('currentBalance').textContent=money(totalBal());
}

// ====== SIDEBAR ======
function renderCatBreakdown(){
    const el=document.getElementById('categoryBreakdown'),t=catTotals(),mx=Math.max(...Object.values(t),1);
    el.innerHTML='';
    categories.forEach((c,i)=>{
        const col=COLORS[i%COLORS.length],amt=t[c]||0,pct=mx>0?(amt/mx)*100:0;
        el.innerHTML+=`<div class="cat-item"><div class="cat-dot" style="background:${col}"></div><div class="cat-info"><div class="cat-name">${c}</div><div class="cat-amount">${money(amt)}</div><div class="cat-bar-bg"><div class="cat-bar" style="width:${pct}%;background:${col}"></div></div></div></div>`;
        // AI Analysis for "Gastos Diarios"
        if(c === 'Gastos Diarios' && amt > 0) {
            const dailyExpenses = expenses.filter(e => e.category === 'Gastos Diarios');
            const descTotals = {};
            dailyExpenses.forEach(e => {
                const key = (e.description || 'Sin descripción').trim().toLowerCase();
                const label = (e.description || 'Sin descripción').trim();
                if(!descTotals[key]) descTotals[key] = { label: label, total: 0, count: 0 };
                descTotals[key].total += +e.amount;
                descTotals[key].count++;
            });
            const sorted = Object.values(descTotals).sort((a,b) => b.total - a.total);
            if(sorted.length > 0) {
                const isOpen = loadLocal('ct_ai_open', false);
                let analysisHtml = `<div class="ai-analysis">`;
                analysisHtml += `<div class="ai-header ai-toggle" onclick="toggleAiAnalysis()"><div class="ai-header-left"><span class="material-symbols-outlined ai-icon">psychology</span><span>Análisis Inteligente</span></div><span class="material-symbols-outlined ai-chevron ${isOpen ? 'ai-chevron-open' : ''}">expand_more</span></div>`;
                analysisHtml += `<div class="ai-body" style="${isOpen ? '' : 'max-height:0;padding-top:0;padding-bottom:0;opacity:0;'}">`;
                const topItems = sorted.slice(0, 8);
                const maxItem = topItems[0].total;
                topItems.forEach((item, idx) => {
                    const pctItem = (item.total / amt * 100).toFixed(1);
                    const barW = (item.total / maxItem * 100).toFixed(0);
                    const rankClass = idx === 0 ? 'ai-rank-1' : idx === 1 ? 'ai-rank-2' : idx === 2 ? 'ai-rank-3' : '';
                    analysisHtml += `<div class="ai-item ${rankClass}">`;
                    analysisHtml += `<div class="ai-item-head"><span class="ai-item-name">${item.label}</span><span class="ai-item-pct">${pctItem}%</span></div>`;
                    analysisHtml += `<div class="ai-item-bar-bg"><div class="ai-item-bar" style="width:${barW}%"></div></div>`;
                    analysisHtml += `<div class="ai-item-detail"><span>${money(item.total)}</span><span>${item.count} gasto${item.count > 1 ? 's' : ''}</span></div>`;
                    analysisHtml += `</div>`;
                });
                if(sorted.length > 8) {
                    const othersTotal = sorted.slice(8).reduce((s,i) => s + i.total, 0);
                    const othersCount = sorted.slice(8).reduce((s,i) => s + i.count, 0);
                    analysisHtml += `<div class="ai-item ai-others"><div class="ai-item-head"><span class="ai-item-name">Otros (${sorted.length - 8} conceptos)</span></div><div class="ai-item-detail"><span>${money(othersTotal)}</span><span>${othersCount} gastos</span></div></div>`;
                }
                // Summary insight
                if(sorted.length >= 2) {
                    const topPct = (sorted[0].total / amt * 100).toFixed(0);
                    analysisHtml += `<div class="ai-insight"><span class="material-symbols-outlined">lightbulb</span><span>"${sorted[0].label}" es tu mayor gasto diario, representando el <strong>${topPct}%</strong> del total.</span></div>`;
                }
                analysisHtml += `</div></div>`;
                el.innerHTML += analysisHtml;
            }
        }
    });
}
window.toggleAiAnalysis = function() {
    const body = document.querySelector('.ai-body');
    const chevron = document.querySelector('.ai-chevron');
    if (!body || !chevron) return;
    const isOpen = body.style.maxHeight !== '0px' && body.style.maxHeight !== '';
    if (isOpen) {
        body.style.maxHeight = '0px';
        body.style.paddingTop = '0';
        body.style.paddingBottom = '0';
        body.style.opacity = '0';
        chevron.classList.remove('ai-chevron-open');
        saveLocal('ct_ai_open', false);
    } else {
        body.style.maxHeight = '2000px';
        body.style.paddingTop = '';
        body.style.paddingBottom = '';
        body.style.opacity = '1';
        chevron.classList.add('ai-chevron-open');
        saveLocal('ct_ai_open', true);
    }
};
function renderCatList(){
    const ul=document.getElementById('categoryList');ul.innerHTML='';
    categories.forEach((c,i)=>{
        const li=document.createElement('li');
        li.innerHTML=`<span>${c}</span><button class="cat-del" data-i="${i}"><span class="material-symbols-outlined">close</span></button>`;
        ul.appendChild(li);
    });
    ul.querySelectorAll('.cat-del').forEach(b=>{
        b.addEventListener('click',()=>{
            const idx=+b.dataset.i,nm=categories[idx],used=expenses.some(e=>e.category===nm);
            const doIt=()=>{categories.splice(idx,1);persist();renderAll();toast(`Rubro "${nm}" eliminado`);};
            if(used)confirm_('Eliminar Rubro',`"${nm}" tiene gastos. ¿Eliminar?`,doIt);else doIt();
        });
    });
}
function populateCatSelect(){
    const sel=document.getElementById('expenseCategory');sel.innerHTML='';
    categories.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
}
function renderMonthFilter(){
    const sel=document.getElementById('monthFilter'),cur=sel.value,months=new Set();
    allDates().forEach(d=>months.add(monYear(d)));
    sel.innerHTML='<option value="all">Todos los meses</option>';
    [...months].reverse().forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;sel.appendChild(o);});
    sel.value=cur||'all';
}

// ====== DAILY VIEW ======
function renderDaily(){
    const container=document.getElementById('dailyView'),empty=document.getElementById('emptyState'),fv=document.getElementById('monthFilter').value;
    let dates=allDates().sort().reverse();
    if(fv!=='all')dates=dates.filter(d=>monYear(d)===fv);
    container.querySelectorAll('.day-card').forEach(c=>c.remove());
    if(!dates.length){empty.style.display='';return;}
    empty.style.display='none';
    const DAY_COLORS = [
        {bg:'#fef2f2',border:'#fecaca',text:'#dc2626'}, // Domingo - rojo
        {bg:'#eff6ff',border:'#bfdbfe',text:'#2563eb'}, // Lunes - azul
        {bg:'#f0fdfa',border:'#99f6e4',text:'#0d9488'}, // Martes - teal
        {bg:'#faf5ff',border:'#e9d5ff',text:'#7c3aed'}, // Miércoles - morado
        {bg:'#fff7ed',border:'#fed7aa',text:'#ea580c'}, // Jueves - naranja
        {bg:'#eef2ff',border:'#c7d2fe',text:'#4f46e5'}, // Viernes - indigo
        {bg:'#fdf2f8',border:'#fbcfe8',text:'#db2777'}  // Sábado - rosa
    ];
    dates.forEach((dt,idx)=>{
        const deps=dayDeps(dt),exps=dayExps(dt),bb=balBefore(dt),depT=sumDeps(dt),expT=sumExps(dt),ba=bb+depT-expT;
        const dayOfWeek = d2(dt).getDay();
        const dc = DAY_COLORS[dayOfWeek];
        const card=document.createElement('div');card.className='day-card';card.dataset.date=dt;card.style.animationDelay=`${idx*.04}s`;
        const totalItems = deps.length + exps.length;
        let h=`<div class="day-head" onclick="toggleDay('${dt}')" style="cursor:pointer"><div class="day-left"><div class="day-icon" style="background:${dc.bg};border-color:${dc.border}"><span class="day-num" style="color:${dc.text}">${dayNum(dt)}</span><span class="day-mon">${monShort(dt)}</span></div><div><div class="day-label">${fmtDate(dt)}</div><div class="day-weekday" style="color:${dc.text};font-weight:600">${weekday(dt)}</div></div></div><div class="day-right"><div class="day-bal"><div class="day-bal-tag">Saldo Antes</div><div class="day-bal-val ${bb>=0?'pos':'neg'}">${money(bb)}</div></div><span class="material-symbols-outlined day-arrow">arrow_forward</span><div class="day-bal"><div class="day-bal-tag">Saldo Después</div><div class="day-bal-val ${ba>=0?'pos':'neg'}">${money(ba)}</div></div><div class="day-toggle-btn"><span class="material-symbols-outlined day-toggle-icon">expand_less</span></div></div></div><div class="day-body day-body-collapsible">`;
        deps.forEach(dep=>{h+=`<div class="row-deposit"><div class="dep-icon"><span class="material-symbols-outlined">arrow_upward</span></div><div class="dep-info"><div class="dep-type">Depósito ${dep.type}</div>${dep.description?`<div class="dep-desc">${dep.description}</div>`:''}</div><div class="dep-amt">+${money(dep.amount)}</div><div class="row-actions"><button class="row-btn row-btn--edit" onclick="editDeposit('${dep.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="deleteDeposit('${dep.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;});
        if(exps.length){
            h+='<div class="exp-table">';
            exps.forEach(exp=>{const ci=categories.indexOf(exp.category),col=COLORS[(ci>=0?ci:0)%COLORS.length];h+=`<div class="row-expense"><span class="exp-badge" style="background:${col}12;color:${col};border:1px solid ${col}30">${exp.category}</span><span class="exp-desc">${exp.description||'—'}</span><span class="exp-amt">-${money(exp.amount)}</span><div class="row-actions"><button class="row-btn row-btn--edit" onclick="editExpense('${exp.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="deleteExpense('${exp.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;});
            h+=`<div class="day-foot"><span class="day-foot-lbl">Total del día</span><span class="day-foot-val">-${money(expT)}</span></div></div>`;
        }
        h+='</div>';card.innerHTML=h;container.insertBefore(card,empty);
    });
}
window.toggleDay = function(dt) {
    const card = document.querySelector(`.day-card[data-date="${dt}"]`);
    if (!card) return;
    const body = card.querySelector('.day-body-collapsible');
    const icon = card.querySelector('.day-toggle-icon');
    if (!body) return;
    const isOpen = !card.classList.contains('day-collapsed');
    if (isOpen) {
        card.classList.add('day-collapsed');
        body.style.maxHeight = '0';
        body.style.paddingTop = '0';
        body.style.paddingBottom = '0';
        body.style.overflow = 'hidden';
        if (icon) icon.textContent = 'expand_more';
    } else {
        card.classList.remove('day-collapsed');
        body.style.maxHeight = '2000px';
        body.style.paddingTop = '';
        body.style.paddingBottom = '';
        body.style.overflow = '';
        if (icon) icon.textContent = 'expand_less';
    }
};

// ====== EDIT / DELETE ======
window.editDeposit=function(id){const dep=deposits.find(d=>d.id===id);if(!dep)return;editDepositId=id;document.getElementById('depositModalTitle').textContent='Editar Depósito';document.getElementById('depositDate').value=dep.date;document.getElementById('depositType').value=dep.type;document.getElementById('depositAmount').value=dep.amount;document.getElementById('depositDescription').value=dep.description||'';openM('depositModal');};
window.editExpense=function(id){const exp=expenses.find(e=>e.id===id);if(!exp)return;editExpenseId=id;document.getElementById('expenseModalTitle').textContent='Editar Gasto';document.getElementById('expenseDate').value=exp.date;populateCatSelect();document.getElementById('expenseCategory').value=exp.category;document.getElementById('expenseDescription').value=exp.description||'';document.getElementById('expenseAmount').value=exp.amount;openM('expenseModal');};
window.deleteDeposit=function(id){confirm_('Eliminar Depósito','¿Estás seguro?',()=>{deposits=deposits.filter(d=>d.id!==id);persist();renderAll();toast('Depósito eliminado');});};
window.deleteExpense=function(id){confirm_('Eliminar Gasto','¿Estás seguro?',()=>{expenses=expenses.filter(e=>e.id!==id);persist();renderAll();toast('Gasto eliminado');});};

function renderAll(){renderKPIs();renderCatBreakdown();renderCatList();populateCatSelect();renderMonthFilter();renderDaily();renderCalendar();renderReminders();}

// ====== EVENTS: DEPOSIT ======
document.getElementById('openDepositModal').addEventListener('click',()=>{editDepositId=null;document.getElementById('depositModalTitle').textContent='Nuevo Depósito';document.getElementById('depositDate').value=today();document.getElementById('depositAmount').value='';document.getElementById('depositDescription').value='';document.getElementById('depositType').value='quincenal';openM('depositModal');setTimeout(()=>document.getElementById('depositAmount').focus(),120);});
document.getElementById('saveDeposit').addEventListener('click',()=>{
    const date=document.getElementById('depositDate').value,type=document.getElementById('depositType').value,amount=parseFloat(document.getElementById('depositAmount').value),description=document.getElementById('depositDescription').value.trim();
    if(!date||isNaN(amount)||amount<=0){toast('Completa correctamente','err');return;}
    if(editDepositId){const dep=deposits.find(d=>d.id===editDepositId);if(dep){dep.date=date;dep.type=type;dep.amount=amount;dep.description=description;}editDepositId=null;toast('Depósito actualizado');}
    else{deposits.push({id:uid(),date,type,amount,description});toast(`Depósito de ${money(amount)} registrado`);}
    persist();closeM('depositModal');renderAll();
});

// ====== EVENTS: EXPENSE ======
document.getElementById('openExpenseModal').addEventListener('click',()=>{editExpenseId=null;document.getElementById('expenseModalTitle').textContent='Nuevo Gasto';document.getElementById('expenseDate').value=today();document.getElementById('expenseAmount').value='';document.getElementById('expenseDescription').value='';populateCatSelect();openM('expenseModal');setTimeout(()=>document.getElementById('expenseDescription').focus(),120);});
document.getElementById('saveExpense').addEventListener('click',()=>{
    const date=document.getElementById('expenseDate').value,category=document.getElementById('expenseCategory').value,description=document.getElementById('expenseDescription').value.trim(),amount=parseFloat(document.getElementById('expenseAmount').value);
    if(!date||!category||isNaN(amount)||amount<=0){toast('Completa correctamente','err');return;}
    if(editExpenseId){const exp=expenses.find(e=>e.id===editExpenseId);if(exp){exp.date=date;exp.category=category;exp.description=description;exp.amount=amount;}editExpenseId=null;toast('Gasto actualizado');}
    else{expenses.push({id:uid(),date,category,description,amount});toast(`Gasto de ${money(amount)} registrado`);}
    persist();closeM('expenseModal');renderAll();
});

// ====== EVENTS: CATEGORY ======
const addCat=()=>{const inp=document.getElementById('newCategoryInput'),nm=inp.value.trim();if(!nm){toast('Escribe un nombre','err');return;}if(categories.includes(nm)){toast('Ya existe','err');return;}categories.push(nm);persist();inp.value='';renderAll();toast(`Rubro "${nm}" agregado`);};
document.getElementById('addCategoryBtn').addEventListener('click',addCat);
document.getElementById('newCategoryInput').addEventListener('keydown',e=>{if(e.key==='Enter')addCat();});
document.getElementById('monthFilter').addEventListener('change',renderDaily);
document.getElementById('sidebarToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal-bg.active').forEach(m=>closeM(m.id));document.getElementById('sidebar').classList.remove('open');}});

// ====== CLOCK ======
function updateClock(){
    const now=new Date();
    document.getElementById('clockH').textContent=String(now.getHours()).padStart(2,'0');
    document.getElementById('clockM').textContent=String(now.getMinutes()).padStart(2,'0');
    document.getElementById('clockS').textContent=String(now.getSeconds()).padStart(2,'0');
}
setInterval(updateClock,1000);
updateClock();

// ====== CALENDAR ======
let calMonth=new Date().getMonth(), calYear=new Date().getFullYear();

function renderCalendar(){
    const titleEl=document.getElementById('calTitle');
    titleEl.textContent=`${MES[calMonth]} ${calYear}`;
    const daysEl=document.getElementById('calDays');
    daysEl.innerHTML='';
    const firstDay=new Date(calYear,calMonth,1).getDay();
    const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
    const daysInPrev=new Date(calYear,calMonth,0).getDate();
    const todayD=new Date(), isCurrentMonth=todayD.getMonth()===calMonth&&todayD.getFullYear()===calYear;
    const expDates=new Set(), depDates=new Set();
    expenses.forEach(e=>{const ed=d2(e.date);if(ed.getMonth()===calMonth&&ed.getFullYear()===calYear)expDates.add(ed.getDate());});
    deposits.forEach(d=>{const dd=d2(d.date);if(dd.getMonth()===calMonth&&dd.getFullYear()===calYear)depDates.add(dd.getDate());});
    for(let i=firstDay-1;i>=0;i--){const span=document.createElement('span');span.className='cal-day other';span.textContent=daysInPrev-i;daysEl.appendChild(span);}
    for(let d=1;d<=daysInMonth;d++){
        const span=document.createElement('span');let cls='cal-day';
        if(isCurrentMonth&&d===todayD.getDate())cls+=' today';
        const hasE=expDates.has(d),hasD=depDates.has(d);
        if(hasE&&hasD)cls+=' has-both';else if(hasE)cls+=' has-expense';else if(hasD)cls+=' has-deposit';
        span.className=cls;span.textContent=d;daysEl.appendChild(span);
    }
    const totalCells=firstDay+daysInMonth;const remaining=totalCells%7===0?0:7-totalCells%7;
    for(let i=1;i<=remaining;i++){const span=document.createElement('span');span.className='cal-day other';span.textContent=i;daysEl.appendChild(span);}
}
document.getElementById('calPrev').addEventListener('click',()=>{calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar();});
document.getElementById('calNext').addEventListener('click',()=>{calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar();});

// ====== REMINDERS ======
function renderReminders(){
    const list=document.getElementById('remindersList');list.innerHTML='';
    const todayDate=new Date().getDate();
    reminders.forEach(rem=>{
        let statusClass='normal',whenText='';
        const diff=rem.day-todayDate;
        if(rem.repeat==='inicio')whenText=`Día ${rem.day} — Inicio de mes`;
        else if(rem.repeat==='fin')whenText=`Último día del mes`;
        else whenText=`Cada día ${rem.day} del mes`;
        if(diff===0){statusClass='upcoming';whenText+=' — ¡HOY!';}
        else if(diff>0&&diff<=3){statusClass='upcoming';whenText+=` — en ${diff} día${diff>1?'s':''}`;}
        else if(diff<0){statusClass='done';whenText+=' — completado este mes';}
        const div=document.createElement('div');div.className='rem-item';
        div.innerHTML=`<div class="rem-icon ${statusClass}"><span class="material-symbols-outlined">${statusClass==='upcoming'?'warning':statusClass==='done'?'check_circle':'schedule'}</span></div><div class="rem-info"><div class="rem-desc">${rem.desc}</div><div class="rem-when">${whenText}</div></div><button class="rem-del" onclick="deleteReminder('${rem.id}')"><span class="material-symbols-outlined">close</span></button>`;
        list.appendChild(div);
    });
}
window.deleteReminder=function(id){confirm_('Eliminar Recordatorio','¿Eliminar este recordatorio?',()=>{reminders=reminders.filter(r=>r.id!==id);persist();renderReminders();toast('Recordatorio eliminado');});};
document.getElementById('addReminderBtn').addEventListener('click',()=>{document.getElementById('reminderModalTitle').textContent='Nuevo Recordatorio';document.getElementById('reminderDesc').value='';document.getElementById('reminderDay').value='';document.getElementById('reminderRepeat').value='mensual';openM('reminderModal');setTimeout(()=>document.getElementById('reminderDesc').focus(),120);});
document.getElementById('saveReminder').addEventListener('click',()=>{
    const desc=document.getElementById('reminderDesc').value.trim();const day=parseInt(document.getElementById('reminderDay').value);const repeat=document.getElementById('reminderRepeat').value;
    if(!desc||isNaN(day)||day<1||day>31){toast('Completa correctamente','err');return;}
    reminders.push({id:uid(),desc,day,repeat});persist();closeM('reminderModal');renderReminders();toast('Recordatorio agregado');
});

// ====== EXPORT / IMPORT ======
document.getElementById('exportBtn').addEventListener('click', () => {
    const data = { version:1, exportedAt:new Date().toISOString(), deposits, expenses, categories, reminders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');a.href = url;
    const d = new Date();
    a.download = `contacontrol_backup_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    toast('Datos exportados');
});
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0]; if(!file)return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(String(ev.target.result || ''));
            const isValid =
                data &&
                typeof data === 'object' &&
                Array.isArray(data.deposits) &&
                Array.isArray(data.expenses) &&
                Array.isArray(data.categories);
            if(!isValid){toast('Archivo no válido','err');return;}
            confirm_('Importar Datos',`Se reemplazarán todos los datos con "${file.name}". ¿Continuar?`,()=>{
                deposits = data.deposits;
                expenses = data.expenses;
                categories = data.categories;
                reminders = Array.isArray(data.reminders) ? data.reminders : reminders;
                persist();
                renderAll();
                toast(`Importados: ${deposits.length} depósitos, ${expenses.length} gastos`);
            });
        } catch(err){toast('Error al leer archivo','err');}
    };
    reader.onerror = () => toast('No se pudo leer el archivo','err');
    reader.readAsText(file);
    e.target.value = '';
});

// ====== REPORTS (PDF) — Professional v2 ======
document.getElementById('openReportModal').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; // page width
    const dStr = new Date().toISOString().slice(0,10);
    const genDate = fmtDate(dStr);

    // ── COVER HEADER ──────────────────────────────────────────────
    // Dark gradient bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 52, 'F');
    // Accent stripe
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 49, W, 3, 'F');

    // Logo circle
    doc.setFillColor(99, 102, 241);
    doc.circle(22, 22, 9, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica','bold');
    doc.text('CM', 22, 26, { align: 'center' });

    // Title
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica','bold');
    doc.text('Conta Medina', 36, 19);
    doc.setFontSize(9);
    doc.setFont('helvetica','normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Reporte Financiero General', 36, 26);

    // Generated date (right side)
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado: ${genDate}`, W - 14, 19, { align: 'right' });
    doc.text(`Período: ${allDates().length > 0 ? fmtDate(allDates()[0]) + ' — ' + fmtDate(allDates()[allDates().length-1]) : 'Sin datos'}`, W - 14, 26, { align: 'right' });

    // ── KPI SUMMARY BOXES ─────────────────────────────────────────
    const totalD = deposits.reduce((s,d)=>s + +d.amount, 0);
    const totalE = expenses.reduce((s,e)=>s + +e.amount, 0);
    const balance = totalD - totalE;
    const kpis = [
        { label: 'Total Ingresos', value: money(totalD), r:34, g:197, b:94 },
        { label: 'Total Gastos',   value: money(totalE), r:239, g:68, b:68 },
        { label: 'Balance Neto',   value: money(balance), r: balance>=0?37:220, g: balance>=0?99:38, b: balance>=0?235:38 },
        { label: 'Días Registrados', value: String(allDates().length), r:99, g:102, b:241 },
    ];
    const boxW = (W - 28 - 9) / 4;
    kpis.forEach((k, i) => {
        const bx = 14 + i * (boxW + 3);
        const by = 58;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(bx, by, boxW, 22, 2, 2, 'F');
        doc.setDrawColor(k.r, k.g, k.b);
        doc.setLineWidth(0.5);
        doc.line(bx, by, bx + boxW, by);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica','normal');
        doc.text(k.label.toUpperCase(), bx + boxW/2, by + 7, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica','bold');
        doc.setTextColor(k.r, k.g, k.b);
        doc.text(k.value, bx + boxW/2, by + 15, { align: 'center' });
    });

    // ── SECTION: CATEGORY BREAKDOWN ───────────────────────────────
    let y = 90;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y, W-28, 7, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.setTextColor(71, 85, 105);
    doc.text('RESUMEN POR RUBRO', 17, y + 5);
    y += 11;

    const catT = catTotals();
    const catRows = categories.map(c => [
        c,
        money(catT[c] || 0),
        totalE > 0 ? ((catT[c]||0)/totalE*100).toFixed(1)+'%' : '0%'
    ]);
    doc.autoTable({
        startY: y,
        head: [['Rubro / Categoría', 'Total Gastado', '% del Total']],
        body: catRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3, textColor: [51, 65, 85] },
        headStyles: { fillColor: [226,232,240], textColor: [71,85,105], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'center' } },
        margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── SECTION: TRANSACTION DETAIL ───────────────────────────────
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y, W-28, 7, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DETALLE DE MOVIMIENTOS', 17, y + 5);
    y += 11;

    const allRecs = [
        ...deposits.map(d => ({ ...d, t: 'Ingreso' })),
        ...expenses.map(e => ({ ...e, t: 'Gasto' }))
    ].sort((a,b) => b.date.localeCompare(a.date));

    const body = allRecs.map(r => [
        fmtDate(r.date),
        weekday(r.date),
        r.t,
        r.category || (r.type === 'quincenal' ? 'Quincenal' : 'Semanal'),
        r.description || '—',
        r.t === 'Gasto' ? `-${money(r.amount)}` : `+${money(r.amount)}`
    ]);

    doc.autoTable({
        startY: y,
        head: [['Fecha', 'Día', 'Tipo', 'Rubro', 'Descripción', 'Monto']],
        body: body,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3, textColor: [51, 65, 85], overflow: 'ellipsize' },
        headStyles: { fillColor: [15, 23, 42], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 18 },
            2: { cellWidth: 16 },
            3: { cellWidth: 30 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 5) {
                if (data.row.raw[2] === 'Gasto') data.cell.styles.textColor = [220, 38, 38];
                else data.cell.styles.textColor = [22, 163, 74];
            }
            if (data.section === 'body' && data.column.index === 2) {
                if (data.row.raw[2] === 'Gasto') data.cell.styles.textColor = [220, 38, 38];
                else data.cell.styles.textColor = [22, 163, 74];
            }
        }
    });

    // ── FOOTER on every page ──────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Bottom bar
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 285, W, 12, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica','normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Conta Medina — Reporte Financiero Confidencial', 14, 292);
        doc.text(`Pág. ${i} / ${pageCount}`, W - 14, 292, { align: 'right' });
    }

    doc.save(`ContaMedina_Reporte_${dStr}.pdf`);
    toast('✅ Reporte PDF generado con éxito');
});


// ====== INIT ======
renderAll();
initFirebase();
// Header date
const _now = new Date();
document.getElementById('headerDate').textContent = `${_now.getDate()} de ${MES[_now.getMonth()]}, ${_now.getFullYear()}`;
