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
const money = n => `S/ ${Number(n).toFixed(2)}`;

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
    });
}
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
    dates.forEach((dt,idx)=>{
        const deps=dayDeps(dt),exps=dayExps(dt),bb=balBefore(dt),depT=sumDeps(dt),expT=sumExps(dt),ba=bb+depT-expT;
        const card=document.createElement('div');card.className='day-card';card.style.animationDelay=`${idx*.04}s`;
        let h=`<div class="day-head"><div class="day-left"><div class="day-icon"><span class="day-num">${dayNum(dt)}</span><span class="day-mon">${monShort(dt)}</span></div><div><div class="day-label">${fmtDate(dt)}</div><div class="day-weekday">${weekday(dt)}</div></div></div><div class="day-right"><div class="day-bal"><div class="day-bal-tag">Saldo Antes</div><div class="day-bal-val ${bb>=0?'pos':'neg'}">${money(bb)}</div></div><span class="material-symbols-outlined day-arrow">arrow_forward</span><div class="day-bal"><div class="day-bal-tag">Saldo Después</div><div class="day-bal-val ${ba>=0?'pos':'neg'}">${money(ba)}</div></div></div></div><div class="day-body">`;
        deps.forEach(dep=>{h+=`<div class="row-deposit"><div class="dep-icon"><span class="material-symbols-outlined">arrow_upward</span></div><div class="dep-info"><div class="dep-type">Depósito ${dep.type}</div>${dep.description?`<div class="dep-desc">${dep.description}</div>`:''}</div><div class="dep-amt">+${money(dep.amount)}</div><div class="row-actions"><button class="row-btn row-btn--edit" onclick="editDeposit('${dep.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="deleteDeposit('${dep.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;});
        if(exps.length){
            h+='<div class="exp-table">';
            exps.forEach(exp=>{const ci=categories.indexOf(exp.category),col=COLORS[(ci>=0?ci:0)%COLORS.length];h+=`<div class="row-expense"><span class="exp-badge" style="background:${col}12;color:${col};border:1px solid ${col}30">${exp.category}</span><span class="exp-desc">${exp.description||'—'}</span><span class="exp-amt">-${money(exp.amount)}</span><div class="row-actions"><button class="row-btn row-btn--edit" onclick="editExpense('${exp.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="deleteExpense('${exp.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;});
            h+=`<div class="day-foot"><span class="day-foot-lbl">Total del día</span><span class="day-foot-val">-${money(expT)}</span></div></div>`;
        }
        h+='</div>';card.innerHTML=h;container.insertBefore(card,empty);
    });
}

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
            const data = JSON.parse(ev.target.result);
            if(!data.deposits||!data.expenses||!data.categories){toast('Archivo no válido','err');return;}
            confirm_('Importar Datos',`Se reemplazarán todos los datos con "${file.name}". ¿Continuar?`,()=>{
                deposits=data.deposits||[];expenses=data.expenses||[];categories=data.categories||[];reminders=data.reminders||reminders;
                persist();renderAll();toast(`Importados: ${deposits.length} depósitos, ${expenses.length} gastos`);
            });
        } catch(err){toast('Error al leer archivo','err');}
    };
    reader.readAsText(file);e.target.value='';
});

// ====== INIT ======
renderAll();
initFirebase();
// Header date
const _now = new Date();
document.getElementById('headerDate').textContent = `${_now.getDate()} de ${MES[_now.getMonth()]}, ${_now.getFullYear()}`;
