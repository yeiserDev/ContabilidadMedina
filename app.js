/* ContaControl — App Logic with Firebase + Calendar & Reminders */

// DATA KEYS (localStorage fallback)
const KEYS = { d:'ct_deposits', e:'ct_expenses', c:'ct_categories', r:'ct_reminders', b:'ct_budgets' };
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
let budgets   = loadLocal(KEYS.b,{});
let searchQuery = '';

const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzda_bfUwOLG0eHFRt8WDqlp6V2V8Ql0GJMvXhQ-3reRMaWuNy95Swcsdq6wywC_SbjLA/exec';

// ====== FIREBASE SYNC ======
let db = null;
let auth = null;
let firebaseReady = false;
let currentUser = null;

function initFirebase() {
    if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === 'TU_API_KEY_AQUI') {
        console.log('⚠️ Firebase no configurado. Usando solo localStorage.');
        return;
    }
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();
        firebaseReady = true;
        console.log('✅ Firebase conectado');

        // Auth Listener
        auth.onAuthStateChanged(user => {
            const loginBtn = document.getElementById('loginBtn');
            const userProfile = document.getElementById('userProfile');
            const userAvatar = document.getElementById('userAvatar');
            const userNameDisplay = document.getElementById('userNameDisplay');
            
            if (user) {
                currentUser = user;
                if(loginBtn) loginBtn.style.display = 'none';
                if(userProfile) userProfile.style.display = 'flex';
                if(userAvatar) userAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=4f46e5&color=fff';
                if(userNameDisplay) userNameDisplay.textContent = user.email.split('@')[0];
                document.body.classList.add('is-auth');
            } else {
                currentUser = null;
                if(loginBtn) loginBtn.style.display = 'flex';
                if(userProfile) userProfile.style.display = 'none';
                document.body.classList.remove('is-auth');
            }
        });

        // Listen for realtime changes
        db.ref('contacontrol').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                deposits = data.deposits || [];
                expenses = data.expenses || [];
                categories = data.categories || DEF_CATS;
                reminders = data.reminders || DEF_REMINDERS;
                budgets   = data.budgets   || {};
                saveLocal(KEYS.d, deposits);
                saveLocal(KEYS.e, expenses);
                saveLocal(KEYS.c, categories);
                saveLocal(KEYS.r, reminders);
                saveLocal(KEYS.b, budgets);
                renderAll();
                console.log('🔄 Datos sincronizados desde Firebase');
            }
        });
    } catch (err) {
        console.error('❌ Error Firebase:', err);
    }
}

// AUTH HANDLERS
if (document.getElementById('doLoginBtn')) {
    document.getElementById('doLoginBtn').addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) {
            toast('Ingresa tu correo y contraseña', 'err');
            return;
        }
        
        const btn = document.getElementById('doLoginBtn');
        btn.textContent = 'Verificando...';
        btn.disabled = true;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                closeM('loginModal');
                toast('Sesión iniciada correctamente');
            })
            .catch(err => {
                console.error(err);
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    toast('Usuario o contraseña incorrectos', 'err');
                } else {
                    toast('Error al iniciar sesión', 'err');
                }
            })
            .finally(() => {
                btn.textContent = 'Entrar';
                btn.disabled = false;
            });
    });
}

function requireAuth(fn) {
    return function(...args) {
        if (!currentUser) {
            toast('Inicia sesión para realizar esta acción', 'err');
            return;
        }
        return fn.apply(this, args);
    };
}

function persist() {
    saveLocal(KEYS.d, deposits);
    saveLocal(KEYS.e, expenses);
    saveLocal(KEYS.c, categories);
    saveLocal(KEYS.r, reminders);
    saveLocal(KEYS.b, budgets);
    if (firebaseReady && db) {
        db.ref('contacontrol').set({
            deposits,
            expenses,
            categories,
            reminders,
            budgets,
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
const catTotals = () => {
    const fv = document.getElementById('monthFilter').value;
    const cycles = typeof getCycles !== 'undefined' ? getCycles() : [];
    const cycle = cycles.find(c => c.id === fv);
    let exps = expenses;
    if(cycle && fv!=='all'){exps=expenses.filter(e=>{const d=d2(e.date);return d>=cycle.start&&d<=cycle.end;});}
    const t={}; categories.forEach(c=>t[c]=0); exps.forEach(e=>{if(t[e.category]!==undefined)t[e.category]+= +e.amount}); return t;
};

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
    // Delta vs previous cycle
    const cycles = typeof getCycles !== 'undefined' ? getCycles() : [];
    const curC = cycles[0];
    const prevC = cycles[1];
    const inCycle = (arr, c) => c ? arr.filter(r => { const d = d2(r.date); return d >= c.start && d <= c.end; }) : [];
    
    const curInc = inCycle(deposits, curC).reduce((s,d)=>s+ +d.amount,0);
    const prevInc = inCycle(deposits, prevC).reduce((s,d)=>s+ +d.amount,0);
    const curExp = inCycle(expenses, curC).reduce((s,e)=>s+ +e.amount,0);
    const prevExp = inCycle(expenses, prevC).reduce((s,e)=>s+ +e.amount,0);
    const setDelta=(elId,cur,prev)=>{
        const el=document.getElementById(elId);if(!el)return;
        if(prev===0&&cur===0){el.textContent='';el.className='kpi-delta';return;}
        if(prev===0){el.textContent='Nuevo ciclo';el.className='kpi-delta neutral';return;}
        const pct=Math.abs((cur-prev)/prev*100).toFixed(0);
        const up=cur>=prev;
        el.textContent=`${up?'▲':'▼'} ${pct}% vs Ciclo ant.`;
        el.className=`kpi-delta ${up?'up':'down'}`;
    };
    setDelta('incomeDelta',curInc,prevInc);
    setDelta('expenseDelta',curExp,prevExp);
}

// ====== CHARTS ======
let barChart=null,donutChart=null;
function renderCharts(){
    if(typeof Chart==='undefined')return;
    const now=new Date();
    const cycles = typeof getCycles !== 'undefined' ? getCycles().slice(0,6).reverse() : [];
    const labels=[],incData=[],expData=[];
    cycles.forEach(c => {
        labels.push(`${c.start.getDate()} ${monShort(c.start.toISOString().split('T')[0])}`);
        incData.push(deposits.filter(d=>{const dd=d2(d.date);return dd>=c.start&&dd<=c.end;}).reduce((s,d)=>s+ +d.amount,0));
        expData.push(expenses.filter(e=>{const dd=d2(e.date);return dd>=c.start&&dd<=c.end;}).reduce((s,e)=>s+ +e.amount,0));
    });
    const barCtx=document.getElementById('chartBar');
    if(barCtx){
        if(barChart)barChart.destroy();
        barChart=new Chart(barCtx,{type:'bar',data:{labels,datasets:[
            {label:'Ingresos',data:incData,backgroundColor:'rgba(22,163,74,0.72)',borderColor:'rgba(22,163,74,1)',borderWidth:1.5,borderRadius:4,borderSkipped:false},
            {label:'Gastos',data:expData,backgroundColor:'rgba(220,38,38,0.62)',borderColor:'rgba(220,38,38,0.9)',borderWidth:1.5,borderRadius:4,borderSkipped:false}
        ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10,family:'Sofia Sans, Arial'},color:'#64748b'},boxWidth:10,padding:10},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{color:'#94a3b8',font:{size:10}}},y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{color:'#94a3b8',font:{size:10},callback:v=>v>=1000?`S/${(v/1000).toFixed(0)}k`:`S/${v}`}}}}});
    }
    const donutCtx=document.getElementById('chartDonut');
    if(donutCtx){
        const ct=catTotals(),cats=categories.filter(c=>(ct[c]||0)>0);
        if(donutChart)donutChart.destroy();
        if(!cats.length){donutChart=null;return;}
        donutChart=new Chart(donutCtx,{type:'doughnut',data:{labels:cats,datasets:[{data:cats.map(c=>ct[c]),backgroundColor:cats.map((_,i)=>COLORS[i%COLORS.length]+'CC'),borderColor:cats.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Sofia Sans, Arial'},color:'#64748b',boxWidth:10,padding:8}},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
    }
}

// ====== SIDEBAR ======
function renderCatBreakdown(){
    const el=document.getElementById('categoryBreakdown'),t=catTotals(),mx=Math.max(...Object.values(t),1);
    const totalExp=Object.values(t).reduce((s,v)=>s+v,0);
    el.innerHTML='';
    categories.forEach((c,i)=>{
        const col=COLORS[i%COLORS.length],amt=t[c]||0,pct=mx>0?(amt/mx)*100:0;
        const pctOfTotal=totalExp>0?(amt/totalExp*100).toFixed(0):0;
        const bgt=budgets[c]>0?+budgets[c]:0;
        const bgtPct=bgt>0?(amt/bgt*100):0;
        const bgtCls=bgtPct>=100?'over':bgtPct>=80?'warn':'ok';
        const bgtBar=bgt>0?`<div class="cat-budget-row"><span class="cat-budget-label">Presup. ${money(bgt)}</span><div class="cat-budget-bar-bg"><div class="cat-budget-bar ${bgtCls}" style="width:${Math.min(bgtPct,100).toFixed(0)}%"></div></div><span class="cat-budget-pct ${bgtCls}">${bgtPct.toFixed(0)}%</span></div>`:'';
        
        // Sparkline 14 days
        const sparkDays = 14;
        const now = new Date();
        let maxAmt = 1;
        const sparkData = [];
        for(let j=sparkDays-1; j>=0; j--){
            const d = new Date(now.getTime() - j*86400000);
            const dtStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const ex = expenses.filter(x => x.date === dtStr && x.category === c).reduce((s,x)=>s+x.amount, 0);
            sparkData.push(ex);
            if(ex>maxAmt) maxAmt=ex;
        }
        let pathD = "";
        const w = 40, h = 14;
        sparkData.forEach((val, idx) => {
            const x = (idx / (sparkDays-1)) * w;
            const y = h - (val / maxAmt * h);
            pathD += (idx===0?'M':'L') + `${x.toFixed(1)},${y.toFixed(1)} `;
        });
        const sparkHtml = `<svg width="${w}" height="${h}" style="margin-left:auto; opacity:0.8; flex-shrink:0;"><path d="${pathD}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        
        el.innerHTML+=`<div class="cat-item"><div class="cat-accent" style="background:${col}"></div><div class="cat-info"><div class="cat-top" style="display:flex;align-items:center;"><span class="cat-name">${c}</span>${sparkHtml}${amt>0?`<span class="cat-pct" style="margin-left:8px;">${pctOfTotal}%</span>`:''}</div><div class="cat-bar-bg"><div class="cat-bar" style="width:${pct}%;background:${col}"></div></div><span class="cat-amount">${amt>0?money(amt):'<span class="cat-empty">Sin gastos</span>'}</span>${bgtBar}</div></div>`;
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
                    const rankBadge=idx<3?`<span class="ai-rank-badge ai-rank-badge-${idx+1}">${idx+1}</span>`:`<span class="ai-rank-num">${idx+1}</span>`;
                    analysisHtml += `<div class="ai-item-head">${rankBadge}<span class="ai-item-name">${item.label}</span><span class="ai-item-pct">${pctItem}%</span></div>`;
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
        li.style.cssText='flex-direction:column;align-items:stretch;gap:2px;';
        li.innerHTML=`<div style="display:flex;align-items:center;gap:4px;width:100%"><span class="sl-cat-row"><span class="sl-cat-dot" style="background:${COLORS[i%COLORS.length]}"></span>${c}</span><button class="cat-del" data-i="${i}"><span class="material-symbols-outlined">close</span></button></div><div class="cat-budget-input-wrap"><span class="cat-budget-lbl">Presup. S/</span><input type="number" class="cat-budget-inp" data-cat="${c}" placeholder="—" step="0.01" min="0" value="${budgets[c]||''}"></div>`;
        ul.appendChild(li);
    });
    ul.querySelectorAll('.cat-del').forEach(b=>{
        b.addEventListener('click',()=>{
            const idx=+b.dataset.i,nm=categories[idx],used=expenses.some(e=>e.category===nm);
            const doIt=()=>{categories.splice(idx,1);delete budgets[nm];persist();renderAll();toast(`Rubro "${nm}" eliminado`);};
            if(used)confirm_('Eliminar Rubro',`"${nm}" tiene gastos. ¿Eliminar?`,doIt);else doIt();
        });
    });
    ul.querySelectorAll('.cat-budget-inp').forEach(inp=>{
        inp.addEventListener('change',()=>{
            const v=parseFloat(inp.value);
            if(isNaN(v)||v<=0)delete budgets[inp.dataset.cat];
            else budgets[inp.dataset.cat]=v;
            persist();renderCatBreakdown();
        });
    });
}
function populateCatSelect(){
    const sel=document.getElementById('expenseCategory');sel.innerHTML='';
    categories.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
}
// ====== CYCLES ======
function getCycles() {
    const sorted = [...deposits].sort((a,b) => d2(a.date) - d2(b.date));
    let cycles = [];
    let curCycle = null;
    sorted.forEach((d) => {
        if (d.isCycleStart || cycles.length === 0) {
            if (curCycle) curCycle.end = new Date(d2(d.date).getTime() - 1000);
            curCycle = { id: d.id, name: `Ciclo: ${fmtDate(d.date)}`, start: d2(d.date), end: new Date('2099-12-31T23:59:59') };
            cycles.push(curCycle);
        }
    });
    return cycles.reverse();
}

function renderMonthFilter(){
    const sel=document.getElementById('monthFilter'),cur=sel.value;
    const mobSel=document.getElementById('mobileMonthFilter');
    const cycles=getCycles();
    
    let html = '<option value="all">Todos los ciclos</option>';
    cycles.forEach(c=>{ html += `<option value="${c.id}">${c.name}</option>`; });
    
    sel.innerHTML=html;
    if(mobSel) mobSel.innerHTML=html;
    
    const newVal = (!cur || cur==='all') ? (cycles.length?cycles[0].id:'all') : cur;
    sel.value = newVal;
    if(mobSel) mobSel.value = newVal;
}

// ====== DAILY VIEW ======
function renderDaily(){
    const container=document.getElementById('dailyView'),empty=document.getElementById('emptyState'),fv=document.getElementById('monthFilter').value;
    let dates=allDates().sort().reverse();
    if(fv!=='all'){
        const cycle = getCycles().find(c=>c.id===fv);
        if(cycle) dates=dates.filter(dt=>{const d=d2(dt);return d>=cycle.start&&d<=cycle.end;});
    }
    if(searchQuery){const q=searchQuery.toLowerCase();dates=dates.filter(dt=>dayDeps(dt).some(d=>(d.description||'').toLowerCase().includes(q)||d.type.includes(q)||String(d.amount).includes(q))||dayExps(dt).some(e=>(e.description||'').toLowerCase().includes(q)||(e.category||'').toLowerCase().includes(q)||String(e.amount).includes(q)));}
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
        deps.forEach(dep=>{h+=`<div class="row-deposit" onclick="viewRecord('deposit','${dep.id}')" style="cursor:pointer"><div class="dep-icon"><span class="material-symbols-outlined">arrow_upward</span></div><div class="dep-info"><div class="dep-type">Depósito ${dep.type}</div>${dep.description?`<div class="dep-desc">${dep.description}</div>`:''}</div><div class="dep-amt">+${money(dep.amount)}</div><div class="row-actions"><button class="row-btn" style="color:var(--link-blue);" onclick="event.stopPropagation(); viewRecord('deposit','${dep.id}')"><span class="material-symbols-outlined">visibility</span></button><button class="row-btn row-btn--edit" onclick="event.stopPropagation(); editDeposit('${dep.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="event.stopPropagation(); deleteDeposit('${dep.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;});
        if(exps.length){
            h+='<div class="exp-table">';
            exps.forEach(exp=>{
                const ci=categories.indexOf(exp.category),col=COLORS[(ci>=0?ci:0)%COLORS.length];
                const imgs=exp.imageUrls||(exp.imageUrl?[exp.imageUrl]:[]);
                const imgBtn=imgs.length?`<button class="exp-img-btn" onclick="event.stopPropagation(); openLightbox('${imgs[0]}')"><span class="material-symbols-outlined">${imgs.length>1?'photo_library':'image'}</span></button>`:'';
                let styledDesc = (exp.description||'—').replace(/(#[a-zA-Z0-9_]+)/g, '<span style="display:inline-block; background:var(--canvas-cream); color:var(--ink-black); border:1px solid rgba(20,20,19,0.1); border-radius:4px; padding:0 4px; font-size:11px; margin-left:4px; font-weight:600;">$1</span>');
                let walletHtml = '';
                if(exp.wallet === 'yape') walletHtml = '<svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="wallet-icon" style="margin-right:6px; border-radius:4px; flex-shrink: 0;" title="Yape"><rect width="40" height="40" fill="#742384"/><path d="M14 11L20 21L26 11H31L22 25V31H18V25L9 11H14Z" fill="#00E5C0"/></svg>';
                else if(exp.wallet === 'bcp') walletHtml = '<svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="wallet-icon" style="margin-right:6px; border-radius:4px; flex-shrink: 0;" title="BCP"><rect width="40" height="40" fill="#002A8D"/><text x="20" y="22" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-style="italic" font-size="20" fill="#FF7A00" text-anchor="middle" dominant-baseline="middle">BCP</text></svg>';
                else walletHtml = '<span class="material-symbols-outlined wallet-icon" style="font-size:16px;color:#16a34a;margin-right:6px;" title="Efectivo">payments</span>';
                h+=`<div class="row-expense" onclick="viewRecord('expense','${exp.id}')" style="cursor:pointer"><span class="exp-badge" style="background:${col}12;color:${col};border:1px solid ${col}30">${exp.category}</span>${walletHtml}<div class="exp-desc"><span>${styledDesc}</span></div>${imgBtn}<span class="exp-amt">-${money(exp.amount)}</span><div class="row-actions"><button class="row-btn" style="color:var(--link-blue);" onclick="event.stopPropagation(); viewRecord('expense','${exp.id}')"><span class="material-symbols-outlined">visibility</span></button><button class="row-btn row-btn--edit" onclick="event.stopPropagation(); editExpense('${exp.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="event.stopPropagation(); deleteExpense('${exp.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;
            });
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
window.editDeposit=requireAuth(function(id){const dep=deposits.find(d=>d.id===id);if(!dep)return;editDepositId=id;document.getElementById('depositModalTitle').textContent='Editar Depósito';document.getElementById('depositDate').value=dep.date;document.getElementById('depositType').value=dep.type;document.getElementById('depositAmount').value=dep.amount;document.getElementById('depositDescription').value=dep.description||'';document.getElementById('depositCycleStart').checked=!!dep.isCycleStart;openM('depositModal');});
window.editExpense=requireAuth(function(id){const exp=expenses.find(e=>e.id===id);if(!exp)return;editExpenseId=id;document.getElementById('expenseModalTitle').textContent='Editar Gasto';document.getElementById('expenseDate').value=exp.date;populateCatSelect();document.getElementById('expenseCategory').value=exp.category;document.getElementById('expenseDescription').value=exp.description||'';document.getElementById('expenseAmount').value=exp.amount;document.getElementById('expenseWallet').value=exp.wallet||'efectivo';resetImageUI();const imgs=exp.imageUrls||(exp.imageUrl?[exp.imageUrl]:[]);if(imgs.length){pendingImagesData=[...imgs];renderPendingImages();document.getElementById('imgUploadBtn').querySelector('span:last-child').textContent='Adjuntar fotos';}openM('expenseModal');});
window.deleteDeposit=requireAuth(function(id){confirm_('Eliminar Depósito','¿Estás seguro?',()=>{deposits=deposits.filter(d=>d.id!==id);persist();renderAll();toast('Depósito eliminado');});});
window.deleteExpense=requireAuth(function(id){confirm_('Eliminar Gasto','¿Estás seguro?',()=>{expenses=expenses.filter(e=>e.id!==id);persist();renderAll();toast('Gasto eliminado');});});

window.viewRecord = function(type, id) {
    let rec = type === 'deposit' ? deposits.find(d => d.id === id) : expenses.find(e => e.id === id);
    if(!rec) return;
    
    document.getElementById('viewRecordTitle').textContent = type === 'deposit' ? 'Detalle de Ingreso' : 'Detalle de Gasto';
    document.getElementById('viewRecordAmount').textContent = (type === 'deposit' ? '+' : '-') + money(rec.amount);
    document.getElementById('viewRecordAmount').style.color = type === 'deposit' ? 'var(--link-blue)' : 'var(--signal-orange)';
    
    let badge = document.getElementById('viewRecordBadge');
    if(type === 'deposit') {
        badge.textContent = `Depósito ${rec.type || ''}`;
        badge.style.background = '#eff6ff';
        badge.style.color = '#2563eb';
    } else {
        badge.textContent = rec.category;
        const ci = categories.indexOf(rec.category);
        const col = COLORS[(ci>=0?ci:0)%COLORS.length];
        badge.style.background = col + '20';
        badge.style.color = col;
    }
    
    document.getElementById('viewRecordDate').textContent = fmtDate(rec.date);
    document.getElementById('viewRecordDesc').textContent = rec.description || 'Sin descripción adicional.';
    
    let imgWrap = document.getElementById('viewRecordImageWrap');
    let multiWrap = document.getElementById('viewRecordMultiImages');
    
    if(type === 'expense') {
        const imgs = rec.imageUrls || (rec.imageUrl ? [rec.imageUrl] : []);
        if (imgs.length > 0) {
            multiWrap.innerHTML = '';
            imgs.forEach(url => {
                const imgEl = document.createElement('img');
                imgEl.src = url;
                imgEl.style.height = '150px';
                imgEl.style.minWidth = '100px';
                imgEl.style.objectFit = 'cover';
                imgEl.style.borderRadius = 'var(--radius-md)';
                imgEl.style.border = '1px solid rgba(20,20,19,0.05)';
                imgEl.style.cursor = 'pointer';
                imgEl.onclick = () => window.openLightbox(url);
                multiWrap.appendChild(imgEl);
            });
            imgWrap.style.display = '';
        } else {
            imgWrap.style.display = 'none';
        }
    } else {
        imgWrap.style.display = 'none';
    }
    
    document.getElementById('viewRecordEditBtn').onclick = () => {
        closeM('viewRecordModal');
        if (type === 'deposit') editDeposit(id);
        else editExpense(id);
    };
    
    document.getElementById('viewRecordDelBtn').onclick = () => {
        closeM('viewRecordModal');
        if (type === 'deposit') deleteDeposit(id);
        else deleteExpense(id);
    };

    openM('viewRecordModal');
};

window.openLightboxFromView = function() {
    if(window.currentLightboxUrl) {
        document.getElementById('lightboxImg').src = window.currentLightboxUrl;
        openM('lightboxModal');
    }
};

function renderAll(){renderKPIs();renderCharts();renderCatBreakdown();renderCatList();populateCatSelect();renderMonthFilter();renderDaily();renderCalendar();renderReminders();}

// ====== EVENTS: DEPOSIT ======
document.getElementById('openDepositModal').addEventListener('click',requireAuth(()=>{editDepositId=null;document.getElementById('depositModalTitle').textContent='Nuevo Depósito';document.getElementById('depositDate').value=today();document.getElementById('depositAmount').value='';document.getElementById('depositDescription').value='';document.getElementById('depositType').value='quincenal';document.getElementById('depositCycleStart').checked=false;openM('depositModal');setTimeout(()=>document.getElementById('depositAmount').focus(),120);}));
document.getElementById('saveDeposit').addEventListener('click',()=>{
    const date=document.getElementById('depositDate').value,type=document.getElementById('depositType').value,amount=parseFloat(document.getElementById('depositAmount').value),description=document.getElementById('depositDescription').value.trim(),isCycleStart=document.getElementById('depositCycleStart').checked;
    if(!date||isNaN(amount)||amount<=0){toast('Completa correctamente','err');return;}
    if(editDepositId){const dep=deposits.find(d=>d.id===editDepositId);if(dep){dep.date=date;dep.type=type;dep.amount=amount;dep.description=description;dep.isCycleStart=isCycleStart;}editDepositId=null;toast('Depósito actualizado');}
    else{deposits.push({id:uid(),date,type,amount,description,isCycleStart});toast(`Depósito de ${money(amount)} registrado`);}
    persist();closeM('depositModal');renderAll();
});

// ====== EVENTS: EXPENSE ======
document.getElementById('openExpenseModal').addEventListener('click',requireAuth(()=>{editExpenseId=null;document.getElementById('expenseModalTitle').textContent='Nuevo Gasto';document.getElementById('expenseDate').value=today();document.getElementById('expenseAmount').value='';document.getElementById('expenseDescription').value='';document.getElementById('expenseWallet').value='bcp';populateCatSelect();resetImageUI();openM('expenseModal');setTimeout(()=>document.getElementById('expenseDescription').focus(),120);}));
document.getElementById('saveExpense').addEventListener('click', async ()=>{
    const date=document.getElementById('expenseDate').value,category=document.getElementById('expenseCategory').value,description=document.getElementById('expenseDescription').value.trim(),amount=parseFloat(document.getElementById('expenseAmount').value),wallet=document.getElementById('expenseWallet').value;
    if(!date||!category||isNaN(amount)||amount<=0){toast('Completa correctamente','err');return;}
    
    const btn = document.getElementById('saveExpense');
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    try {
        let finalImageUrls = [];
        
        if (pendingImagesData && pendingImagesData.length > 0) {
            let hasNew = pendingImagesData.some(img => img.startsWith('data:image'));
            if (hasNew) toast('Subiendo foto(s) a Google Drive...');
            
            for (let img of pendingImagesData) {
                if (img.startsWith('data:image')) {
                    if (GOOGLE_APPS_SCRIPT_URL.includes('PEGA_AQUI')) {
                        console.warn('URL de Google Apps Script no configurada. Guardando como Base64.');
                        finalImageUrls.push(img);
                    } else {
                        try {
                            const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                                method: 'POST',
                                body: JSON.stringify({ base64: img })
                            });
                            const data = await res.json();
                            if (data.success) {
                                finalImageUrls.push(data.url);
                            } else {
                                console.error('Error Drive:', data.error);
                                finalImageUrls.push(img); // Fallback
                            }
                        } catch(e) {
                            console.error('Error de red al subir a Drive:', e);
                            finalImageUrls.push(img); // Fallback
                        }
                    }
                } else {
                    finalImageUrls.push(img); // Ya era URL
                }
            }
            if (hasNew) toast('Fotos subidas con éxito');
        }

        if(editExpenseId){
            const exp=expenses.find(e=>e.id===editExpenseId);
            if(exp){
                exp.date=date;exp.category=category;exp.description=description;exp.amount=amount;exp.wallet=wallet;
                if(finalImageUrls.length > 0) {
                    exp.imageUrls = finalImageUrls;
                } else {
                    delete exp.imageUrls;
                }
                delete exp.imageUrl; // migrate old field
            }
            editExpenseId=null;toast('Gasto actualizado');
        }
        else{
            const nx={id:uid(),date,category,description,amount,wallet};
            if(finalImageUrls.length > 0) nx.imageUrls = finalImageUrls;
            expenses.push(nx);
            toast(`Gasto de ${money(amount)} registrado`);
        }
        persist();closeM('expenseModal');renderAll();
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

document.getElementById('expenseDescription').addEventListener('input', (e) => {
    const text = e.target.value.trim().toLowerCase();
    if (!text || text.length < 3) return;
    
    // Find the most recent expense matching this description substring
    const match = [...expenses].reverse().find(exp => (exp.description || '').toLowerCase().includes(text));
    
    if (match && match.category) {
        const catSelect = document.getElementById('expenseCategory');
        // Only update if it actually changes, to avoid jitter
        if (catSelect.value !== match.category && categories.includes(match.category)) {
            catSelect.value = match.category;
            catSelect.style.transition = 'all 0.3s';
            catSelect.style.boxShadow = '0 0 0 2px var(--signal-orange)';
            setTimeout(() => { catSelect.style.boxShadow = 'none'; }, 600);
        }
    }
});

// ====== EVENTS: CATEGORY ======
const addCat=requireAuth(()=>{const inp=document.getElementById('newCategoryInput'),nm=inp.value.trim();if(!nm){toast('Escribe un nombre','err');return;}if(categories.includes(nm)){toast('Ya existe','err');return;}categories.push(nm);persist();inp.value='';renderAll();toast(`Rubro "${nm}" agregado`);});
document.getElementById('addCategoryBtn').addEventListener('click',addCat);
document.getElementById('newCategoryInput').addEventListener('keydown',e=>{if(e.key==='Enter')addCat();});
document.getElementById('monthFilter').addEventListener('change',(e)=>{ 
    const mobSel = document.getElementById('mobileMonthFilter');
    if(mobSel) mobSel.value = e.target.value;
    renderDaily(); renderKPIs(); renderCharts(); renderCatBreakdown(); 
});
const mobSel = document.getElementById('mobileMonthFilter');
if(mobSel) mobSel.addEventListener('change',(e)=>{ 
    document.getElementById('monthFilter').value = e.target.value;
    renderDaily(); renderKPIs(); renderCharts(); renderCatBreakdown(); 
    setTimeout(()=>closeM('filterModal'), 150);
});
document.getElementById('sidebarToggle').addEventListener('click',()=>{
    const sb=document.getElementById('sidebar');
    const ov=document.getElementById('sidebarOverlay');
    sb.classList.toggle('open');
    ov.classList.toggle('active');
});
document.getElementById('sidebarOverlay').addEventListener('click',()=>{
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){
    document.querySelectorAll('.modal-bg.active').forEach(m=>closeM(m.id));
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}});

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
    
    // Heatmap data
    const dailyData = {};
    let maxDailyExp = 1;
    expenses.forEach(e=>{
        const ed=d2(e.date);
        if(ed.getMonth()===calMonth&&ed.getFullYear()===calYear){
            const d=ed.getDate();
            if(!dailyData[d]) dailyData[d] = {exp:0, dep:0};
            dailyData[d].exp += +e.amount;
            if(dailyData[d].exp > maxDailyExp) maxDailyExp = dailyData[d].exp;
        }
    });
    deposits.forEach(d=>{
        const dd=d2(d.date);
        if(dd.getMonth()===calMonth&&dd.getFullYear()===calYear){
            const d=dd.getDate();
            if(!dailyData[d]) dailyData[d] = {exp:0, dep:0};
            dailyData[d].dep += +d.amount;
        }
    });

    for(let i=firstDay-1;i>=0;i--){const span=document.createElement('span');span.className='cal-day other';span.textContent=daysInPrev-i;daysEl.appendChild(span);}
    for(let d=1;d<=daysInMonth;d++){
        const span=document.createElement('span');
        let cls='cal-day heatmap-cell';
        if(isCurrentMonth&&d===todayD.getDate())cls+=' today';
        
        let styleStr = '';
        if(dailyData[d]){
            if(dailyData[d].exp > 0){
                const opacity = Math.max(0.15, dailyData[d].exp / maxDailyExp);
                styleStr = `background-color: rgba(220, 38, 38, ${opacity}); color: ${opacity > 0.5 ? '#fff' : 'var(--ink-black)'}; border: none; font-weight: ${opacity > 0.5 ? '700' : '500'};`;
            } else if(dailyData[d].dep > 0){
                styleStr = `background-color: rgba(22, 163, 74, 0.2); color: #16a34a; border: none; font-weight: 700;`;
            }
        }
        
        span.className=cls;
        span.textContent=d;
        if(styleStr) span.style.cssText = styleStr;
        daysEl.appendChild(span);
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
window.deleteReminder=requireAuth(function(id){confirm_('Eliminar Recordatorio','¿Eliminar este recordatorio?',()=>{reminders=reminders.filter(r=>r.id!==id);persist();renderReminders();toast('Recordatorio eliminado');});});
document.getElementById('addReminderBtn').addEventListener('click',requireAuth(()=>{document.getElementById('reminderModalTitle').textContent='Nuevo Recordatorio';document.getElementById('reminderDesc').value='';document.getElementById('reminderDay').value='';document.getElementById('reminderRepeat').value='mensual';openM('reminderModal');setTimeout(()=>document.getElementById('reminderDesc').focus(),120);}));
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
document.getElementById('importBtn').addEventListener('click', requireAuth(() => document.getElementById('importFile').click()));
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


// ====== IMAGE HANDLING ======
let pendingImagesData = [];

function resizeToThumb(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const MAX = 900;
                let w = img.width, h = img.height;
                if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.78));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function resetImageUI() {
    pendingImagesData = [];
    const container = document.getElementById('multiImgPreviewContainer');
    const inp = document.getElementById('expenseImage');
    if (container) container.innerHTML = '';
    if (inp) inp.value = '';
}

function renderPendingImages() {
    const container = document.getElementById('multiImgPreviewContainer');
    if(!container) return;
    container.innerHTML = '';
    pendingImagesData.forEach((data, index) => {
        const wrap = document.createElement('div');
        wrap.style.position = 'relative';
        wrap.style.width = '64px';
        wrap.style.height = '64px';
        
        const img = document.createElement('img');
        img.src = data;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = 'var(--radius-md)';
        img.style.border = '1px solid rgba(20,20,19,0.1)';
        
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">close</span>';
        rm.style.position = 'absolute';
        rm.style.top = '-6px';
        rm.style.right = '-6px';
        rm.style.background = 'var(--signal-orange)';
        rm.style.color = '#fff';
        rm.style.border = 'none';
        rm.style.borderRadius = '50%';
        rm.style.width = '20px';
        rm.style.height = '20px';
        rm.style.display = 'flex';
        rm.style.alignItems = 'center';
        rm.style.justifyContent = 'center';
        rm.style.cursor = 'pointer';
        
        rm.onclick = () => {
            pendingImagesData.splice(index, 1);
            renderPendingImages();
        };
        
        wrap.appendChild(img);
        wrap.appendChild(rm);
        container.appendChild(wrap);
    });
}

document.getElementById('imgUploadBtn').addEventListener('click', () => document.getElementById('expenseImage').click());
document.getElementById('expenseImage').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    document.getElementById('imgUploadBtn').querySelector('span:last-child').textContent = 'Adjuntando...';
    for(let file of files) {
        const data = await resizeToThumb(file);
        pendingImagesData.push(data);
    }
    document.getElementById('imgUploadBtn').querySelector('span:last-child').textContent = 'Adjuntar fotos';
    renderPendingImages();
});

window.openLightbox = function(url) {
    if (!url) return;
    document.getElementById('lightboxImg').src = url;
    openM('lightboxModal');
};

// ====== SEARCH ======
(function(){
    const inp = document.getElementById('searchInput');
    const clr = document.getElementById('searchClear');
    const mInp = document.getElementById('mobileSearchInput');
    const mClr = document.getElementById('mobileSearchClear');

    const handleSearch = (val) => {
        searchQuery = val.trim();
        if (clr) clr.style.display = searchQuery ? '' : 'none';
        if (mClr) mClr.style.display = searchQuery ? '' : 'none';
        if (inp && inp.value !== val) inp.value = val;
        if (mInp && mInp.value !== val) mInp.value = val;
        renderDaily();
    };

    if (inp) inp.addEventListener('input', (e) => handleSearch(e.target.value));
    if (mInp) mInp.addEventListener('input', (e) => handleSearch(e.target.value));

    const handleClear = () => { handleSearch(''); };

    if (clr) clr.addEventListener('click', handleClear);
    if (mClr) mClr.addEventListener('click', handleClear);
})();

// ====== BOTTOM NAV ======
const bnavMenu = document.getElementById('bnavMenu');
const bnavSearch = document.getElementById('bnavSearch');
const bnavDeposit = document.getElementById('bnavDeposit');
const bnavExpense = document.getElementById('bnavExpense');
const bnavFilter = document.getElementById('bnavFilter');

if (bnavMenu) bnavMenu.addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebarOverlay');
    sb.classList.toggle('open');
    ov.classList.toggle('active');
    document.body.style.overflow = sb.classList.contains('open') ? 'hidden' : '';
});
const sbOverlay = document.getElementById('sidebarOverlay');
if (sbOverlay) sbOverlay.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    sbOverlay.classList.remove('active');
    document.body.style.overflow = '';
});
if (bnavDeposit) bnavDeposit.addEventListener('click', () => document.getElementById('openDepositModal').click());
if (bnavExpense) bnavExpense.addEventListener('click', () => document.getElementById('openExpenseModal').click());
if (bnavSearch) bnavSearch.addEventListener('click', () => {
    openM('searchModal');
    setTimeout(() => {
        const inp = document.getElementById('mobileSearchInput');
        if (inp) inp.focus();
    }, 100);
});
if (bnavFilter) bnavFilter.addEventListener('click', () => {
    openM('filterModal');
});

// ====== INIT ======
renderAll();
initFirebase();

// Handle PWA shortcuts (?open=deposit|expense)
const _urlParams = new URLSearchParams(window.location.search);
const _openAction = _urlParams.get('open');
if (_openAction === 'deposit') setTimeout(() => document.getElementById('openDepositModal').click(), 400);
if (_openAction === 'expense') setTimeout(() => document.getElementById('openExpenseModal').click(), 400);

// Setup Login/Logout buttons
if (document.getElementById('loginBtn')) {
    document.getElementById('loginBtn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        const overlay = document.getElementById('sidebarOverlay');
        if(overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('loginEmail').value = '';
        const pw = document.getElementById('loginPassword');
        pw.value = '';
        pw.type = 'password';
        const icon = document.getElementById('togglePasswordIcon');
        if(icon) icon.textContent = 'visibility_off';
        openM('loginModal');
    });
}
if (document.getElementById('togglePasswordBtn')) {
    document.getElementById('togglePasswordBtn').addEventListener('click', () => {
        const input = document.getElementById('loginPassword');
        const icon = document.getElementById('togglePasswordIcon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });
}
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (auth) auth.signOut();
    });
}
