/* ContaControl — App Logic with Firebase + Calendar & Reminders */

// DATA KEYS (localStorage fallback)
const KEYS = { d:'ct_deposits', e:'ct_expenses', c:'ct_categories', r:'ct_reminders', b:'ct_budgets', l:'ct_loans', p:'ct_lenders' };
const DEF_CATS    = ['Devolución Dinero Prestado','Gastos Diarios','Petróleo Eduardo','Viático Eduardo'];
const DEF_LENDERS = ['Mirtha', 'Yeiser'];
const COLORS = ['#2563eb','#16a34a','#dc2626','#0d9488','#ea580c','#7c3aed','#c026d3','#059669','#d97706','#4f46e5'];
const DEF_REMINDERS = [
    { id:'r1', desc:'Pagar banco', day:3, repeat:'mensual' },
    { id:'r2', desc:'Pagar luz', day:1, repeat:'inicio' },
    { id:'r3', desc:'Pagar agua', day:1, repeat:'inicio' }
];

const loadLocal = (k,fb) => { try { const d=localStorage.getItem(k); return d?JSON.parse(d):fb; } catch{ return fb; } };
const saveLocal = (k,v) => localStorage.setItem(k,JSON.stringify(v));
const uid = () => Date.now().toString(36)+Math.random().toString(36).substr(2,5);
const stripBase64 = arr => arr.map(e => ({ ...e, imageUrls: (e.imageUrls||[]).filter(u=>!u.startsWith('data:')) }));

// Limpia base64 acumulado en localStorage al arrancar
(function cleanupStorage() {
    try {
        const raw = localStorage.getItem(KEYS.e);
        if (raw) {
            const parsed = JSON.parse(raw);
            const hasBase64 = parsed.some(e => (e.imageUrls||[]).some(u => u.startsWith('data:')));
            if (hasBase64) localStorage.setItem(KEYS.e, JSON.stringify(stripBase64(parsed)));
        }
    } catch(e) {
        try { localStorage.removeItem(KEYS.e); } catch(_) {}
    }
})();

let deposits = loadLocal(KEYS.d,[]);
let expenses = loadLocal(KEYS.e,[]);
let categories = loadLocal(KEYS.c,DEF_CATS);
let reminders = loadLocal(KEYS.r,DEF_REMINDERS);
let budgets   = loadLocal(KEYS.b,{});
let loans     = loadLocal(KEYS.l,[]);
let lenders   = loadLocal(KEYS.p, DEF_LENDERS);
let searchQuery = '';

// Backend de comprobantes. Como la app y el backend están en el MISMO proyecto
// (mismo origen), se deja vacío y las llamadas son relativas: /api/comprobantes.
const BACKEND_URL = '';

// ====== FIREBASE SYNC ======
let db = null;
let auth = null;
let firebaseReady = false;
let currentUser = null;

let dbListenerActive = false;
let _isSaving = false;

function startDbListener() {
    if (dbListenerActive) return;
    dbListenerActive = true;
    db.ref('contacontrol').on('value', (snapshot) => {
        if (_isSaving) return;
        const data = snapshot.val();
        if (data) {
            deposits   = data.deposits   || [];
            expenses   = data.expenses   || [];
            categories = data.categories || DEF_CATS;
            reminders  = data.reminders  || DEF_REMINDERS;
            budgets    = data.budgets     || {};
            loans      = data.loans      || [];
            lenders    = data.lenders    || DEF_LENDERS;
            saveLocal(KEYS.d, deposits);
            saveLocal(KEYS.e, expenses);
            saveLocal(KEYS.c, categories);
            saveLocal(KEYS.r, reminders);
            saveLocal(KEYS.b, budgets);
            saveLocal(KEYS.l, loans);
            saveLocal(KEYS.p, lenders);
            renderAll();
            console.log('🔄 Datos sincronizados desde Firebase');
        }
    });
}

function updateAuthUI(user) {
    const loginBtn    = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userAvatar  = document.getElementById('userAvatar');
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (user && !user.isAnonymous) {
        if (loginBtn)    loginBtn.style.display    = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (userAvatar)  userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email.split('@')[0])}&background=4f46e5&color=fff`;
        if (userNameDisplay) userNameDisplay.textContent = user.email.split('@')[0];
    } else {
        if (loginBtn)    loginBtn.style.display    = 'flex';
        if (userProfile) userProfile.style.display = 'none';
    }
}

function initFirebase() {
    if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === 'TU_API_KEY_AQUI') {
        console.log('⚠️ Firebase no configurado. Usando solo localStorage.');
        return;
    }
    try {
        firebase.initializeApp(firebaseConfig);
        db   = firebase.database();
        auth = firebase.auth();
        console.log('✅ Firebase conectado');

        auth.onAuthStateChanged(user => {
            if (!user) {
                // Nadie autenticado → entrar como anónimo para leer datos
                auth.signInAnonymously().catch(err => console.error('❌ Auth anónimo:', err));
                return;
            }
            // Usuario autenticado (anónimo o email)
            firebaseReady = true;
            currentUser = user.isAnonymous ? null : user; // solo email = acceso de escritura
            updateAuthUI(user);
            startDbListener();
            console.log(user.isAnonymous ? '👁 Modo lectura (anónimo)' : `🔐 Sesión activa: ${user.email}`);
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
    const expensesSafe = stripBase64(expenses);
    try {
        saveLocal(KEYS.d, deposits);
        saveLocal(KEYS.e, expensesSafe);
        saveLocal(KEYS.c, categories);
        saveLocal(KEYS.r, reminders);
        saveLocal(KEYS.b, budgets);
        saveLocal(KEYS.l, loans);
        saveLocal(KEYS.p, lenders);
    } catch(e) {
        console.error('Error guardando en localStorage:', e);
    }
    if (firebaseReady && db) {
        _isSaving = true;
        db.ref('contacontrol').set({
            deposits,
            expenses: expensesSafe,
            categories,
            reminders,
            budgets,
            loans,
            lenders,
            lastUpdated: new Date().toISOString()
        }).then(() => {
            _isSaving = false;
        }).catch(err => {
            _isSaving = false;
            console.error('Error guardando en Firebase:', err);
        });
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

function animateCount(el, targetNum, duration = 550) {
    const startNum = parseFloat(String(el.dataset.rawVal || '0').replace(/[^\d.-]/g, '')) || 0;
    el.dataset.rawVal = targetNum;
    const startTime = performance.now();
    const tick = now => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = money(startNum + (targetNum - startNum) * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = money(targetNum);
    };
    requestAnimationFrame(tick);
}

window.getWalletIcon = (w, size=22) => {
    if(w==='yape') return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="wallet-icon" style="margin-right:6px; flex-shrink:0; vertical-align:middle; box-shadow: 0 1px 3px rgba(0,0,0,0.15); border-radius: 22%;" title="Yape"><defs><linearGradient id="yg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#91139e"/><stop offset="100%" stop-color="#55006b"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#yg)"/><path d="M50 14 C 64 14 74 22 74 33 C 74 44 64 52 50 52 C 47 52 44 51.5 41 50 L 32 58 L 35 46 C 29 42 26 38 26 33 C 26 22 36 14 50 14 Z" fill="#00E5C0"/><text x="51" y="41" font-family="Arial, sans-serif" font-weight="bold" font-size="22" fill="#55006b" text-anchor="middle">S/</text><text x="50" y="86" font-family="'Brush Script MT', 'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="44" fill="#ffffff" text-anchor="middle" transform="rotate(-6 50 86)">yape</text></svg>`;
    if(w==='bcp') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="wallet-icon" style="margin-right:6px; flex-shrink:0; vertical-align:middle;" title="BCP"><path d="M12.5 3.5 C 19 3.5 22 9.5 19.5 16.5 C 17 21.5 10 22 7.5 19 C 12.5 19 14.5 14 14.5 10 C 14.5 7.5 11.5 5.5 8.5 5.5 C 10.5 4 11.5 3.5 12.5 3.5 Z" fill="#FF7A00"/><path d="M8.5 5.5 C 11.5 5.5 14.5 7.5 14.5 10 C 13.5 10 12 11 10.5 13 C 7 13 4 8 8.5 5.5 Z" fill="#002A8D"/></svg>`;
    const efSize = size * 0.85;
    return `<svg width="${efSize*1.8}" height="${efSize}" viewBox="0 0 90 50" fill="none" xmlns="http://www.w3.org/2000/svg" class="wallet-icon" style="margin-right:6px; flex-shrink:0; vertical-align:middle; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.12));" title="Efectivo"><rect width="90" height="50" fill="#91BED4"/><rect x="5" y="5" width="80" height="40" fill="#E8ECEB"/><rect x="62" y="5" width="18" height="40" fill="#586E9A"/><path d="M45 45 L 72 45 L 68 32 C 68 24 62 20 57 20 C 51 20 48 24 50 32 C 50 37 45 40 45 45 Z" fill="#505469"/><path d="M48 45 L 70 45 L 65 33 C 65 26 60 23 57 23 C 53 23 51 26 53 33 C 53 38 48 41 48 45 Z" fill="#9DA2B1"/><circle cx="53" cy="27" r="2.5" fill="#9DA2B1"/><path d="M57 32 Q 60 30 63 32 Q 60 34 57 32 Z" fill="#505469"/><path d="M55 20 Q 57 15 62 17 Q 60 21 55 20 Z" fill="#505469"/><text x="8" y="40" font-family="'Arial Black', sans-serif" font-weight="900" font-size="18" fill="#3670A0">100</text><text x="64" y="20" font-family="'Arial Black', sans-serif" font-weight="900" font-size="12" fill="#E8ECEB">100</text><path d="M70 33 L 80 33 L 83 40 L 70 40 Z" fill="#9C4C82"/><rect x="8" y="7" width="2" height="4" fill="#505469"/><rect x="12" y="7" width="2" height="4" fill="#505469"/><rect x="16" y="7" width="2" height="4" fill="#505469"/><rect x="20" y="7" width="2" height="4" fill="#505469"/><rect x="24" y="7" width="2" height="4" fill="#505469"/></svg>`;
};
window.getWalletName = (w) => w==='yape'?'Yape':w==='bcp'?'BCP':'Efectivo';

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
const openM = id => {
    document.getElementById(id).classList.add('active');
    document.body.classList.add('modal-open');
};
const closeM = id => {
    document.getElementById(id).classList.remove('active');
    // Desbloquear el scroll solo si ya no queda ningún modal abierto
    if (!document.querySelector('.modal-bg.active')) document.body.classList.remove('modal-open');
    if (id === 'expenseModal' || id === 'depositModal') {
        const dl = document.getElementById('dailyView');
        if (dl) { dl.style.pointerEvents = 'none'; setTimeout(() => { dl.style.pointerEvents = ''; }, 300); }
    }
};
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeM(b.dataset.close)));
document.querySelectorAll('.modal-bg').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)closeM(bg.id);}));
let pendingConfirm=null;
function confirm_(title,msg,fn){document.getElementById('confirmTitle').textContent=title;document.getElementById('confirmMessage').textContent=msg;pendingConfirm=fn;openM('confirmModal');}
document.getElementById('confirmAction').addEventListener('click',()=>{if(pendingConfirm)pendingConfirm();pendingConfirm=null;closeM('confirmModal');});

let editDepositId=null, editExpenseId=null, editLoanId=null;

// ====== RENDER KPIs ======
function renderKPIs(){
    const ti=deposits.reduce((s,d)=>s+ +d.amount,0), te=expenses.reduce((s,e)=>s+ +e.amount,0);
    animateCount(document.getElementById('totalIncome'), ti);
    animateCount(document.getElementById('totalExpenses'), te);
    document.getElementById('totalDeposits').textContent=deposits.length;
    document.getElementById('totalDays').textContent=allDates().length;
    const balEl = document.getElementById('currentBalance');
    animateCount(balEl, totalBal());
    balEl.classList.remove('updated');
    void balEl.offsetWidth;
    balEl.classList.add('updated');
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
if(typeof Chart!=='undefined'&&!Chart.registry.plugins.get('donutPct')){
    Chart.register({
        id:'donutPct',
        afterDraw(chart){
            if(!chart.config.type||chart.config.type.indexOf('doughnut')===-1)return;
            if(chart.tooltip&&chart.tooltip._active&&chart.tooltip._active.length)return;
            const{ctx,chartArea:{left,right,top,bottom},data}=chart;
            const ds=data.datasets[0],total=ds.data.reduce((a,b)=>a+b,0);
            if(!total)return;
            const meta=chart.getDatasetMeta(0),cx=(left+right)/2,cy=(top+bottom)/2;
            const r=Math.min(right-left,bottom-top)/2*0.82;
            ctx.save();
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.font='bold 12px Sofia Sans, Arial';
            ctx.fillStyle='#fff';
            meta.data.forEach((el,i)=>{
                const v=ds.data[i],p=Math.round(v/total*100);
                if(p<4)return;
                const mid=(el.startAngle+el.endAngle)/2;
                ctx.fillText(p+'%',cx+Math.cos(mid)*r,cy+Math.sin(mid)*r);
            });
            ctx.restore();
        }
    });
}
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
        ]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:1200,easing:'easeOutQuart',delay:c=>c.type==='data'?c.dataIndex*100+c.datasetIndex*100:0},plugins:{legend:{labels:{font:{size:10,family:'Sofia Sans, Arial'},color:'#64748b'},boxWidth:10,padding:10},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{color:'#94a3b8',font:{size:10}}},y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{color:'#94a3b8',font:{size:10},callback:v=>v>=1000?`S/${(v/1000).toFixed(0)}k`:`S/${v}`}}}}});
    }
    const donutCtx=document.getElementById('chartDonut');
    if(donutCtx){
        const ct=catTotals(),cats=categories.filter(c=>(ct[c]||0)>0);
        if(donutChart)donutChart.destroy();
        if(!cats.length){donutChart=null;return;}
        donutChart=new Chart(donutCtx,{type:'doughnut',data:{labels:cats,datasets:[{data:cats.map(c=>ct[c]),backgroundColor:cats.map((_,i)=>COLORS[i%COLORS.length]+'CC'),borderColor:cats.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',animation:{animateScale:true,animateRotate:true,duration:1200,easing:'easeOutQuart'},plugins:{legend:{position:'bottom',labels:{font:{size:10,family:'Sofia Sans, Arial'},color:'#64748b',boxWidth:10,padding:8}},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
    }
}

let lineChart = null;
function renderLineChart() {
    const ctx = document.getElementById('chartLine');
    if (!ctx || typeof Chart === 'undefined') return;
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = [], balData = [];
    let runBal = 0;
    // Pre-calculate balance before this month
    deposits.forEach(d => { const dd = d2(d.date); if(dd.getFullYear() < year || (dd.getFullYear() === year && dd.getMonth() < month)) runBal += +d.amount; });
    expenses.forEach(e => { const dd = d2(e.date); if(dd.getFullYear() < year || (dd.getFullYear() === year && dd.getMonth() < month)) runBal -= +e.amount; });
    for (let day = 1; day <= daysInMonth; day++) {
        const dtStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        deposits.filter(d => d.date === dtStr).forEach(d => runBal += +d.amount);
        expenses.filter(e => e.date === dtStr).forEach(e => runBal -= +e.amount);
        labels.push(day === 1 || day % 5 === 0 || day === daysInMonth ? `${day}` : '');
        balData.push(runBal);
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const tickCol = isDark ? '#9b9bba' : '#94a3b8';
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(207,69,0,0.3)');
    gradient.addColorStop(1, 'rgba(207,69,0,0)');
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Saldo acumulado',
                data: balData,
                borderColor: '#CF4500',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#CF4500',
                fill: true,
                backgroundColor: gradient,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1400, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => money(c.raw) } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: tickCol, font: { size: 10 } } },
                y: { grid: { color: gridCol }, ticks: { color: tickCol, font: { size: 10 }, callback: v => v >= 1000 ? `S/${(v/1000).toFixed(1)}k` : `S/${v}` } }
            }
        }
    });
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
    const skeleton = document.getElementById('skeletonFeed');
    if(skeleton) skeleton.style.display = 'none';
    if(!dates.length){empty.style.display='flex';return;}
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
        deps.forEach(dep=>{h+=`<div class="row-deposit" onclick="viewRecord('deposit','${dep.id}')" style="cursor:pointer"><div class="dep-icon"><span class="material-symbols-outlined">arrow_upward</span></div><div class="dep-info"><div class="dep-type">Depósito ${dep.type}</div>${dep.description?`<div class="dep-desc">${dep.description}</div>`:''}</div><div class="dep-amt">+${money(dep.amount)}</div><div class="row-actions"><button class="row-btn" style="color:var(--signal-orange);" onclick="event.stopPropagation(); viewRecord('deposit','${dep.id}')"><span class="material-symbols-outlined">visibility</span></button><button class="row-btn row-btn--edit" onclick="event.stopPropagation(); editDeposit('${dep.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="event.stopPropagation(); deleteDeposit('${dep.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;});
        if(exps.length){
            h+='<div class="exp-table">';
            exps.forEach(exp=>{
                const ci=categories.indexOf(exp.category),col=COLORS[(ci>=0?ci:0)%COLORS.length];
                const imgs=exp.imageUrls||(exp.imageUrl?[exp.imageUrl]:[]);
                const imgBtn=`<button class="exp-img-btn" onclick="event.stopPropagation(); viewRecord('expense','${exp.id}')">
                    <span class="material-symbols-outlined hide-on-mobile" ${imgs.length?'':'style="display:none;"'}>${imgs.length>1?'photo_library':'image'}</span>
                    <span class="material-symbols-outlined show-on-mobile" style="color:var(--signal-orange); font-size:18px;">visibility</span>
                </button>`;
                let styledDesc = (exp.description||'—').replace(/(#[a-zA-Z0-9_]+)/g, '<span style="display:inline-block; background:var(--canvas-cream); color:var(--ink-black); border:1px solid rgba(20,20,19,0.1); border-radius:4px; padding:0 4px; font-size:11px; margin-left:4px; font-weight:600;">$1</span>');
                let walletHtml = window.getWalletIcon(exp.wallet, 20);
                h+=`<div class="row-expense" onclick="viewRecord('expense','${exp.id}')" style="cursor:pointer"><span class="exp-badge" style="background:${col}12;color:${col};border:1px solid ${col}30">${exp.category}</span>${walletHtml}<div class="exp-desc"><span>${styledDesc}</span></div>${imgBtn}<span class="exp-amt">-${money(exp.amount)}</span><div class="row-actions"><button class="row-btn" style="color:var(--signal-orange);" onclick="event.stopPropagation(); viewRecord('expense','${exp.id}')"><span class="material-symbols-outlined">visibility</span></button><button class="row-btn row-btn--edit" onclick="event.stopPropagation(); editExpense('${exp.id}')"><span class="material-symbols-outlined">edit</span></button><button class="row-btn row-btn--del" onclick="event.stopPropagation(); deleteExpense('${exp.id}')"><span class="material-symbols-outlined">delete</span></button></div></div>`;
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
// Borra en Google Drive los comprobantes cuyas URLs apuntan a nuestro backend.
// Las URLs viejas de ImgBB (no coinciden con el patrón) se ignoran.
async function deleteDriveComprobantes(urls){
    if(!urls||!urls.length) return;
    let idToken=null;
    try{ idToken=(auth&&auth.currentUser)?await auth.currentUser.getIdToken():null; }catch(e){}
    if(!idToken) return;
    for(const url of urls){
        const m=/\/api\/comprobantes\/([^/?#]+)/.exec(url||'');
        if(!m) continue;
        try{ await fetch(`${BACKEND_URL}/api/comprobantes/${m[1]}`,{method:'DELETE',headers:{'Authorization':`Bearer ${idToken}`}}); }
        catch(e){ console.warn('No se pudo borrar comprobante de Drive:',e.message); }
    }
}
window.deleteExpense=requireAuth(function(id){const exp=expenses.find(e=>e.id===id);const imgs=exp?(exp.imageUrls||(exp.imageUrl?[exp.imageUrl]:[])):[];confirm_('Eliminar Gasto','¿Estás seguro?',()=>{deleteDriveComprobantes(imgs);expenses=expenses.filter(e=>e.id!==id);persist();renderAll();toast('Gasto eliminado');});});
window.deleteLoan=requireAuth(function(id){confirm_('Eliminar Préstamo','¿Eliminar este registro de préstamo?',()=>{loans=loans.filter(l=>l.id!==id);persist();renderLoans();toast('Préstamo eliminado');});});
window.editLoan=requireAuth(function(id){
    const loan=loans.find(l=>l.id===id);if(!loan)return;
    editLoanId=id;
    const t=document.getElementById('loanModalTitle');if(t)t.textContent='Editar Préstamo';
    document.getElementById('loanDate').value=loan.date;
    populateLenderSelect();
    document.getElementById('loanPerson').value=loan.person;
    document.getElementById('loanAmount').value=loan.amount;
    document.getElementById('loanDesc').value=loan.description||'';
    openM('loanModal');
    setTimeout(()=>document.getElementById('loanAmount').focus(),120);
});

window.viewRecord = function(type, id) {
    let rec = type === 'deposit' ? deposits.find(d => d.id === id) : expenses.find(e => e.id === id);
    if(!rec) return;
    
    document.getElementById('viewRecordTitle').textContent = type === 'deposit' ? 'Detalle de Ingreso' : 'Detalle de Gasto';
    const amtEl = document.getElementById('viewRecordAmount');
    const isDep = type === 'deposit';
    amtEl.style.color = isDep ? 'var(--link-blue)' : 'var(--signal-orange)';
    
    amtEl.classList.remove('price-anim');
    void amtEl.offsetWidth; 
    amtEl.classList.add('price-anim');
    
    const targetAmt = Number(rec.amount);
    const prefix = isDep ? '+' : '-';
    let startTs = null;
    const dur = 700; 
    
    const step = (ts) => {
        if (!startTs) startTs = ts;
        const progress = Math.min((ts - startTs) / dur, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4); 
        amtEl.textContent = prefix + money(easeOut * targetAmt);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            amtEl.textContent = prefix + money(targetAmt);
        }
    };
    window.requestAnimationFrame(step);
    
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
    
    let walletWrap = document.getElementById('viewRecordWalletWrap');
    let walletDiv = document.getElementById('viewRecordWallet');
    if (type === 'expense') {
        const w = rec.wallet || 'efectivo';
        walletDiv.innerHTML = window.getWalletIcon(w, 24) + ' <span>' + window.getWalletName(w) + '</span>';
        if (walletWrap) walletWrap.style.display = 'block';
    } else {
        if (walletWrap) walletWrap.style.display = 'none';
    }
    
    let imgWrap = document.getElementById('viewRecordImageWrap');
    let multiWrap = document.getElementById('viewRecordMultiImages');
    
    if(type === 'expense') {
        const imgs = rec.imageUrls || (rec.imageUrl ? [rec.imageUrl] : []);
        if (imgs.length > 0) {
            multiWrap.innerHTML = '';
            imgs.forEach(url => {
                const imgEl = document.createElement('img');
                imgEl.src = url;
                imgEl.className = 'vr-photo';
                imgEl.loading = 'lazy';
                imgEl.alt = 'Comprobante';
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
    
    // Ancho del modal: dos paneles solo si hay comprobantes
    const vrModal = document.querySelector('#viewRecordModal .modal');
    if (vrModal) vrModal.classList.toggle('vr-has-photos', imgWrap.style.display !== 'none');

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

    const actionsWrap = document.getElementById('viewRecordActions');
    if (actionsWrap) {
        actionsWrap.style.display = currentUser ? 'flex' : 'none';
    }

    openM('viewRecordModal');
};

window.openLightboxFromView = function() {
    if(window.currentLightboxUrl) {
        document.getElementById('lightboxImg').src = window.currentLightboxUrl;
        openM('lightboxModal');
    }
};

function renderAll(){renderKPIs();renderCharts();renderLineChart();renderCatBreakdown();renderCatList();populateCatSelect();renderMonthFilter();renderDaily();renderCalendar();renderReminders();renderLoans();}

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
            const newImgs = pendingImagesData.filter(img => img.startsWith('data:image'));
            const oldUrls = pendingImagesData.filter(img => !img.startsWith('data:image'));
            
            // Keep existing URLs as-is
            finalImageUrls.push(...oldUrls);
            
            if (newImgs.length > 0) {
                btn.textContent = 'Subiendo foto(s)...';
                let idToken = null;
                try {
                    idToken = (auth && auth.currentUser) ? await auth.currentUser.getIdToken() : null;
                } catch (e) { /* sin sesión */ }

                if (!idToken) {
                    toast('Inicia sesión para subir comprobantes.', 'err');
                } else {
                    for (let img of newImgs) {
                        try {
                            const res = await fetch(`${BACKEND_URL}/api/comprobantes`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${idToken}`
                                },
                                body: JSON.stringify({ image: img, mimeType: 'image/jpeg' })
                            });
                            const data = await res.json();
                            if (res.ok && data.fileId) {
                                // Guardamos la URL del proxy: el render existente la muestra tal cual.
                                finalImageUrls.push(`${BACKEND_URL}/api/comprobantes/${data.fileId}`);
                            } else {
                                throw new Error(data.error || 'Error backend');
                            }
                        } catch (e) {
                            console.error('❌ Error subiendo foto:', e.message);
                            toast('Error al subir foto. Verifica tu conexión.', 'err');
                        }
                    }
                }
                btn.textContent = 'Guardando...';
            }
        }

        if(editExpenseId){
            const exp=expenses.find(e=>e.id===editExpenseId);
            if(exp){
                // Borrar de Drive los comprobantes que se quitaron al editar
                const oldImgs = exp.imageUrls || (exp.imageUrl ? [exp.imageUrl] : []);
                deleteDriveComprobantes(oldImgs.filter(u => !finalImageUrls.includes(u)));
                exp.date=date;exp.category=category;exp.description=description;exp.amount=amount;exp.wallet=wallet;
                if(finalImageUrls.length > 0) {
                    exp.imageUrls = finalImageUrls;
                } else {
                    delete exp.imageUrls;
                }
                delete exp.imageUrl; // migrate old field
            }
            editExpenseId=null;
            persist();closeM('expenseModal');renderAll();
            toast('Gasto actualizado');
        }
        else{
            const nx={id:uid(),date,category,description,amount,wallet};
            if(finalImageUrls.length > 0) nx.imageUrls = finalImageUrls;
            expenses.push(nx);
            persist();closeM('expenseModal');renderAll();
            toast(`Gasto de ${money(amount)} registrado`);
        }
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
    const titleEls=document.querySelectorAll('.cal-title-sync');
    titleEls.forEach(t=>t.textContent=`${MES[calMonth]} ${calYear}`);
    const daysEls=document.querySelectorAll('.cal-days-sync');
    const firstDay=new Date(calYear,calMonth,1).getDay();
    const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
    const daysInPrev=new Date(calYear,calMonth,0).getDate();
    const todayD=new Date(), isCurrentMonth=todayD.getMonth()===calMonth&&todayD.getFullYear()===calYear;
    
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

    let html = '';
    for(let i=firstDay-1;i>=0;i--){html+=`<span class="cal-day" style="opacity:0; pointer-events:none;"></span>`;}
    for(let d=1;d<=daysInMonth;d++){
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
        const dtStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        html+=`<span class="${cls}"${styleStr?` style="${styleStr}"`:''} onclick="window.scrollToDate('${dtStr}')">${d}</span>`;
    }
    const totalCells=firstDay+daysInMonth;const remaining=totalCells%7===0?0:7-totalCells%7;
    for(let i=1;i<=remaining;i++){html+=`<span class="cal-day" style="opacity:0; pointer-events:none;"></span>`;}
    
    daysEls.forEach(el=>el.innerHTML=html);
}
document.querySelectorAll('.cal-nav-prev').forEach(b=>b.addEventListener('click',()=>{calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}));
document.querySelectorAll('.cal-nav-next').forEach(b=>b.addEventListener('click',()=>{calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar();}));

window.scrollToDate = function(dt) {
    const card = document.querySelector(`.day-card[data-date="${dt}"]`);
    if (card) {
        closeM('calendarModal');
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.style.transition = 'background-color 0.5s ease';
        card.style.backgroundColor = 'var(--signal-orange)';
        setTimeout(() => {
            card.style.backgroundColor = '';
        }, 800);
    } else {
        toast('No hay registros para este día', 'err');
    }
};

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
    const data = { version:1, exportedAt:new Date().toISOString(), deposits, expenses, categories, reminders, loans, lenders };
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
                loans   = Array.isArray(data.loans)   ? data.loans   : [];
                lenders = Array.isArray(data.lenders) ? data.lenders : DEF_LENDERS;
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

// Compresión máxima: 1000px lado mayor + calidad JPEG adaptativa hasta ~130 KB.
// Mantiene legible el texto del comprobante mientras minimiza el almacenamiento.
const IMG_MAX_DIM = 1000;        // lado más largo en px
const IMG_TARGET_BYTES = 130000; // objetivo ~130 KB por imagen
const IMG_MIN_QUALITY = 0.45;    // piso de calidad para no perder legibilidad

function dataUrlBytes(dataUrl) {
    const b64 = (dataUrl.split(',')[1] || '');
    return Math.floor(b64.length * 3 / 4);
}

function resizeToThumb(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const MAX = IMG_MAX_DIM;
                let w = img.width, h = img.height;
                if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                else if (h >= w && h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';            // fondo blanco para PNG con transparencia
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                // Baja la calidad por pasos hasta alcanzar el tamaño objetivo
                let q = 0.72;
                let out = canvas.toDataURL('image/jpeg', q);
                while (dataUrlBytes(out) > IMG_TARGET_BYTES && q > IMG_MIN_QUALITY) {
                    q = Math.max(IMG_MIN_QUALITY, q - 0.08);
                    out = canvas.toDataURL('image/jpeg', q);
                }
                resolve(out);
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
        
        rm.onclick = (e) => {
            e.stopPropagation(); // Prevent label from triggering file input on remove
            pendingImagesData.splice(index, 1);
            renderPendingImages();
        };
        
        wrap.appendChild(img);
        wrap.appendChild(rm);
        container.appendChild(wrap);
    });
}

document.getElementById('imgUploadBtn').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent label from double-triggering the file input
    document.getElementById('expenseImage').click();
});
document.getElementById('expenseImage').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    document.getElementById('imgUploadBtn').querySelector('span:last-child').textContent = 'Adjuntando...';
    for(let file of files) {
        const data = await resizeToThumb(file);
        pendingImagesData.push(data);
    }
    e.target.value = ''; // Reset so the same file can be re-selected after removal
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

// ====== LOANS ======
function renderLoans() {
    const totalLoaned   = loans.reduce((s,l) => s + +l.amount, 0);
    const totalDevolved = loans.reduce((s,l) => s + (l.devolutions||[]).reduce((ds,d) => ds + +d.amount, 0), 0);
    const totalDebt     = Math.max(0, totalLoaned - totalDevolved);

    // Toolbar button text
    const loansBtnText = document.getElementById('loansBtnText');
    if (loansBtnText) {
        if (totalDebt > 0)        loansBtnText.textContent = `Préstamos  ${money(totalDebt)}`;
        else if (totalLoaned > 0) loansBtnText.textContent = 'Préstamos ✓';
        else                      loansBtnText.textContent = 'Préstamos';
    }
    // Bottom nav badge
    const bnavBadge = document.getElementById('bnavLoansBadge');
    if (bnavBadge) bnavBadge.textContent = totalDebt > 0 ? money(totalDebt) : 'Préstamos';

    const body = document.getElementById('loansModalBody');
    if (!body) return;

    if (loans.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:48px 20px 36px;">
            <span class="material-symbols-outlined" style="font-size:52px;opacity:0.15;display:block;margin-bottom:14px;color:var(--ink-black);">account_balance_wallet</span>
            <p style="font-weight:700;font-size:15px;color:var(--ink-black);margin-bottom:6px;">Sin préstamos registrados</p>
            <p style="font-size:12px;color:var(--slate-gray);">Toca "Nuevo Préstamo" cuando alguien te preste dinero.</p>
        </div>`;
        return;
    }

    const pct     = totalLoaned > 0 ? Math.min(totalDevolved / totalLoaned * 100, 100) : 0;
    const settled = totalDebt === 0;
    let html = '';

    // ── Summary 3-chip strip ──
    html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
        <div class="loan-chip" style="--i:0;text-align:center;padding:12px 6px;background:var(--canvas-cream);border-radius:var(--radius-lg);border:1px solid rgba(20,20,19,0.06);">
            <div style="font-size:14px;font-weight:900;color:var(--ink-black);letter-spacing:-0.02em;">${money(totalLoaned)}</div>
            <div style="font-size:9px;color:var(--slate-gray);text-transform:uppercase;letter-spacing:0.07em;margin-top:3px;font-weight:700;">Prestado</div>
        </div>
        <div class="loan-chip" style="--i:1;text-align:center;padding:12px 6px;background:var(--canvas-cream);border-radius:var(--radius-lg);border:1px solid rgba(20,20,19,0.06);">
            <div style="font-size:14px;font-weight:900;color:#16a34a;letter-spacing:-0.02em;">${money(totalDevolved)}</div>
            <div style="font-size:9px;color:var(--slate-gray);text-transform:uppercase;letter-spacing:0.07em;margin-top:3px;font-weight:700;">Devuelto</div>
        </div>
        <div class="loan-chip" style="--i:2;text-align:center;padding:12px 6px;background:${settled?'#f0fdf4':'#fef2f2'};border-radius:var(--radius-lg);border:1px solid ${settled?'#bbf7d0':'#fecaca'};">
            <div style="font-size:14px;font-weight:900;color:${settled?'#16a34a':'#dc2626'};letter-spacing:-0.02em;">${settled?'¡OK!':money(totalDebt)}</div>
            <div style="font-size:9px;color:var(--slate-gray);text-transform:uppercase;letter-spacing:0.07em;margin-top:3px;font-weight:700;">Pendiente</div>
        </div>
    </div>`;

    // ── Overall progress bar ──
    html += `<div style="height:3px;background:rgba(20,20,19,0.06);border-radius:2px;margin-bottom:20px;overflow:hidden;">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:2px;transition:width 0.6s ease;"></div>
    </div>`;

    // ── Group by person (preserving newest-first order within each group) ──
    const personOrder = [];
    const personGroups = {};
    [...loans].sort((a,b) => d2(b.date) - d2(a.date)).forEach(l => {
        if (!personGroups[l.person]) { personGroups[l.person] = []; personOrder.push(l.person); }
        personGroups[l.person].push(l);
    });

    personOrder.forEach((person, personIdx) => {
        const pLoans    = personGroups[person];
        const pLoaned   = pLoans.reduce((s,l) => s + +l.amount, 0);
        const pDevolved = pLoans.reduce((s,l) => s + (l.devolutions||[]).reduce((ds,d) => ds + +d.amount, 0), 0);
        const pDebt     = Math.max(0, pLoaned - pDevolved);
        const pSettled  = pDebt === 0;
        const pPct      = pLoaned > 0 ? Math.min(pDevolved / pLoaned * 100, 100) : 0;

        // ── Person group header ──
        html += `<div class="loan-group" style="--i:${personIdx};border:1px solid ${pSettled?'rgba(22,163,74,0.2)':'rgba(220,38,38,0.12)'};border-radius:var(--radius-lg);overflow:hidden;margin-bottom:14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:${pSettled?'rgba(22,163,74,0.04)':'rgba(220,38,38,0.03)'};">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;border-radius:50%;background:${pSettled?'#dcfce7':'#fef2f2'};border:1.5px solid ${pSettled?'#bbf7d0':'#fecaca'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:${pSettled?'#16a34a':'#dc2626'};flex-shrink:0;">${person.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-size:14px;font-weight:800;color:var(--ink-black);">${person}</div>
                        <div style="font-size:10px;color:var(--slate-gray);">${pLoans.length} préstamo${pLoans.length>1?'s':''}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:16px;font-weight:900;letter-spacing:-0.03em;color:${pSettled?'#16a34a':'#dc2626'};">${pSettled?'✓ Saldado':money(pDebt)}</div>
                    <div style="font-size:10px;color:var(--slate-gray);">de ${money(pLoaned)}</div>
                </div>
            </div>
            ${!pSettled?`<div style="padding:0 14px 6px;background:${pSettled?'rgba(22,163,74,0.04)':'rgba(220,38,38,0.03)'};"><div style="height:3px;background:rgba(20,20,19,0.06);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pPct.toFixed(1)}%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:2px;transition:width 0.6s;"></div></div></div>`:''}
            ${!pSettled?`<div style="padding:6px 14px 10px;background:${pSettled?'rgba(22,163,74,0.04)':'rgba(220,38,38,0.03)'};">
                <button onclick="openAddDevolution('${person.replace(/'/g,"\\'")}')" style="width:100%;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:var(--radius-md);padding:8px 10px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:background 0.15s;"><span class="material-symbols-outlined" style="font-size:15px;">payments</span>Registrar devolución de ${person}</button>
            </div>`:''}

            <div style="border-top:1px solid rgba(20,20,19,0.06);">`;

        // ── Individual loan rows (compact, no devolution button) ──
        pLoans.forEach((l, idx) => {
            const loanDev  = (l.devolutions||[]).reduce((s,d) => s + +d.amount, 0);
            const loanDebt = Math.max(0, +l.amount - loanDev);
            const lSettled = loanDebt === 0;

            let devHtml = '';
            if ((l.devolutions||[]).length > 0) {
                devHtml += `<div style="padding:6px 12px 4px;background:rgba(22,163,74,0.04);border-top:1px dashed rgba(22,163,74,0.15);">`;
                l.devolutions.forEach(d => {
                    devHtml += `<div style="display:flex;align-items:center;gap:5px;padding:3px 0;">
                        <span class="material-symbols-outlined" style="font-size:12px;color:#16a34a;flex-shrink:0;">check</span>
                        <span style="flex:1;font-size:10px;color:var(--slate-gray);">${fmtDate(d.date)}${d.description?' · '+d.description:''}</span>
                        <span style="font-size:11px;font-weight:700;color:#16a34a;flex-shrink:0;">+${money(d.amount)}</span>
                        <button onclick="deleteDevolution('${l.id}','${d.id}')" style="background:none;border:none;cursor:pointer;color:rgba(20,20,19,0.22);padding:0;display:flex;line-height:1;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:12px;">close</span></button>
                    </div>`;
                });
                devHtml += `</div>`;
            }

            html += `<div style="${idx>0?'border-top:1px solid rgba(20,20,19,0.05);':''}">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;">
                    <div style="min-width:0;flex:1;margin-right:10px;">
                        <div style="font-size:11px;color:var(--slate-gray);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fmtDate(l.date)}${l.description?' · <em>'+l.description+'</em>':''}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                        <div style="text-align:right;">
                            <div style="font-size:13px;font-weight:800;color:${lSettled?'#16a34a':'var(--ink-black)'};">${lSettled?'✓':money(+l.amount)}</div>
                            ${lSettled?'':`<div style="font-size:9px;color:var(--slate-gray);">orig.</div>`}
                        </div>
                        <button onclick="editLoan('${l.id}')" style="background:none;color:rgba(20,20,19,0.35);border:1px solid rgba(20,20,19,0.09);border-radius:8px;padding:5px 7px;font-family:inherit;cursor:pointer;display:flex;align-items:center;" onmouseover="this.style.color='#2563eb';this.style.borderColor='#bfdbfe';this.style.background='#eff6ff';" onmouseout="this.style.color='rgba(20,20,19,0.35)';this.style.borderColor='rgba(20,20,19,0.09)';this.style.background='none';"><span class="material-symbols-outlined" style="font-size:14px;">edit</span></button>
                        <button onclick="deleteLoan('${l.id}')" style="background:none;color:rgba(20,20,19,0.25);border:1px solid rgba(20,20,19,0.09);border-radius:8px;padding:5px 7px;font-family:inherit;cursor:pointer;display:flex;align-items:center;" onmouseover="this.style.color='#dc2626';this.style.borderColor='#fecaca';this.style.background='#fef2f2';" onmouseout="this.style.color='rgba(20,20,19,0.25)';this.style.borderColor='rgba(20,20,19,0.09)';this.style.background='none';"><span class="material-symbols-outlined" style="font-size:14px;">delete</span></button>
                    </div>
                </div>
                ${devHtml}
            </div>`;
        });

        html += `</div></div>`;
    });

    body.innerHTML = html;
}

function populateLenderSelect() {
    const sel = document.getElementById('loanPerson');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    lenders.forEach(l => {
        const o = document.createElement('option');
        o.value = l; o.textContent = l;
        sel.appendChild(o);
    });
    if (prev && lenders.includes(prev)) sel.value = prev;
}

function renderLendersModal() {
    const body = document.getElementById('lendersModalBody');
    if (!body) return;
    body.innerHTML = `
        <div style="padding-bottom:16px;">
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                ${lenders.length === 0
                    ? `<p style="font-size:12px;color:var(--slate-gray);padding:8px 0;">Sin prestadores aún.</p>`
                    : lenders.map((name,i) => `
                        <div style="display:inline-flex;align-items:center;gap:3px;background:var(--canvas-cream);border:1px solid rgba(20,20,19,0.09);border-radius:999px;padding:4px 8px 4px 12px;font-size:12px;font-weight:600;color:var(--ink-black);">
                            ${name}
                            <button onclick="deleteLender(${i})" style="background:none;border:none;cursor:pointer;color:rgba(20,20,19,0.3);padding:0;margin-left:2px;display:flex;line-height:1;" title="Eliminar">
                                <span class="material-symbols-outlined" style="font-size:13px;">close</span>
                            </button>
                        </div>`).join('')
                }
            </div>
            <div style="display:flex;gap:8px;">
                <input type="text" id="newLenderInput" class="mi" placeholder="Nuevo prestador..." style="flex:1;margin:0;" onkeydown="if(event.key==='Enter')addLender()">
                <button onclick="addLender()" style="background:var(--ink-black);color:var(--canvas-cream);border:none;border-radius:var(--radius-md);padding:0 14px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;">Agregar</button>
            </div>
        </div>`;
}

window.addLender = requireAuth(function() {
    const inp  = document.getElementById('newLenderInput');
    const name = inp ? inp.value.trim() : '';
    if (!name) { toast('Escribe un nombre', 'err'); return; }
    if (lenders.map(l=>l.toLowerCase()).includes(name.toLowerCase())) { toast('Ya existe', 'err'); return; }
    lenders.push(name);
    persist();
    populateLenderSelect();
    renderLendersModal();
    toast(`"${name}" agregado como prestador`);
});

window.deleteLender = requireAuth(function(idx) {
    const name  = lenders[idx];
    const inUse = loans.some(l => l.person === name);
    const doIt  = () => {
        lenders.splice(idx, 1);
        persist();
        populateLenderSelect();
        renderLendersModal();
        toast(`Prestador "${name}" eliminado`);
    };
    if (inUse) confirm_('Eliminar Prestador', `"${name}" tiene préstamos registrados. ¿Eliminar de todas formas?`, doIt);
    else doIt();
});

let currentDevLoanId = null;

window.openAddDevolution = requireAuth(function(person) {
    // Find loans for this person sorted oldest-first; attach to oldest with remaining balance
    const pLoans  = loans.filter(l => l.person === person);
    const pLoaned = pLoans.reduce((s,l) => s + +l.amount, 0);
    const pDev    = pLoans.reduce((s,l) => s + (l.devolutions||[]).reduce((ds,d) => ds + +d.amount, 0), 0);
    const remaining = Math.max(0, pLoaned - pDev);

    const sorted = [...pLoans].sort((a,b) => d2(a.date) - d2(b.date));
    const target = sorted.find(l => {
        const ld = (l.devolutions||[]).reduce((s,d) => s + +d.amount, 0);
        return +l.amount > ld;
    }) || sorted[sorted.length - 1];
    if (!target) return;

    currentDevLoanId = target.id;
    const info = document.getElementById('devLoanInfo');
    if (info) info.innerHTML = `<span style="font-weight:400;color:var(--slate-gray);font-size:11px;">Devolución a</span> <strong>${person}</strong> &nbsp;·&nbsp; <span style="color:#dc2626;font-weight:700;">Total pendiente: ${money(remaining)}</span>`;
    document.getElementById('devDate').value   = today();
    document.getElementById('devAmount').value = '';
    document.getElementById('devDesc').value   = '';
    openM('devolutionModal');
    setTimeout(() => document.getElementById('devAmount').focus(), 120);
});

if (document.getElementById('saveDevolution')) {
    document.getElementById('saveDevolution').addEventListener('click', () => {
        const date        = document.getElementById('devDate').value;
        const amount      = parseFloat(document.getElementById('devAmount').value);
        const description = document.getElementById('devDesc').value.trim();
        if (!date || isNaN(amount) || amount <= 0) { toast('Completa correctamente', 'err'); return; }
        const loan = loans.find(l => l.id === currentDevLoanId);
        if (!loan) return;
        if (!loan.devolutions) loan.devolutions = [];
        loan.devolutions.push({ id: uid(), date, amount, description });
        persist();
        closeM('devolutionModal');
        renderLoans();
        toast(`Devolución de ${money(amount)} registrada`);
    });
}

window.deleteDevolution = requireAuth(function(loanId, devId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || !loan.devolutions) return;
    confirm_('Eliminar Devolución', '¿Eliminar esta devolución?', () => {
        loan.devolutions = loan.devolutions.filter(d => d.id !== devId);
        persist();
        renderLoans();
        toast('Devolución eliminada');
    });
});

if (document.getElementById('addLoanBtn')) {
    document.getElementById('addLoanBtn').addEventListener('click', requireAuth(() => {
        editLoanId = null;
        const t = document.getElementById('loanModalTitle'); if(t) t.textContent = 'Registrar Préstamo';
        document.getElementById('loanDate').value   = today();
        document.getElementById('loanAmount').value = '';
        document.getElementById('loanDesc').value   = '';
        populateLenderSelect();
        openM('loanModal');
        setTimeout(() => document.getElementById('loanAmount').focus(), 120);
    }));
}
if (document.getElementById('saveLoan')) {
    document.getElementById('saveLoan').addEventListener('click', () => {
        const date        = document.getElementById('loanDate').value;
        const person      = document.getElementById('loanPerson').value.trim();
        const amount      = parseFloat(document.getElementById('loanAmount').value);
        const description = document.getElementById('loanDesc').value.trim();
        if (!date || !person || isNaN(amount) || amount <= 0) { toast('Completa correctamente', 'err'); return; }
        if (editLoanId) {
            const loan = loans.find(l => l.id === editLoanId);
            if (loan) { loan.date=date; loan.person=person; loan.amount=amount; loan.description=description; }
            editLoanId = null;
            persist(); closeM('loanModal'); renderLoans();
            toast('Préstamo actualizado');
        } else {
            loans.push({ id: uid(), date, person, amount, description, devolutions: [] });
            persist(); closeM('loanModal'); renderLoans();
            toast(`Préstamo de ${money(amount)} registrado`);
        }
    });
}
if (document.getElementById('openLoansModal')) {
    document.getElementById('openLoansModal').addEventListener('click', () => openM('loansModal'));
}
if (document.getElementById('openLendersModal')) {
    document.getElementById('openLendersModal').addEventListener('click', () => {
        renderLendersModal();
        openM('lendersModal');
    });
}

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

// ====== DARK MODE TOGGLE ======
(function(){
    const btn = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeIcon');
    const root = document.documentElement;
    // Restore saved preference
    const saved = localStorage.getItem('ct_theme') || 'light';
    if (saved === 'dark') {
        root.setAttribute('data-theme', 'dark');
        if (icon) icon.textContent = 'light_mode';
    }
    if (btn) {
        btn.addEventListener('click', () => {
            const isDark = root.getAttribute('data-theme') === 'dark';
            if (isDark) {
                root.removeAttribute('data-theme');
                localStorage.setItem('ct_theme', 'light');
                if (icon) icon.textContent = 'dark_mode';
                btn.title = 'Modo Oscuro';
            } else {
                root.setAttribute('data-theme', 'dark');
                localStorage.setItem('ct_theme', 'dark');
                if (icon) icon.textContent = 'light_mode';
                btn.title = 'Modo Claro';
            }
            // Re-render line chart so grid colors update
            setTimeout(() => renderLineChart(), 50);
        });
    }
})();
