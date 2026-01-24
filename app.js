// Harlow Community Services - client-side only

let SERVICES = [];
let fuse = null;
let selected = []; // [{id, editedText, editedTitle, includeFullDesc, websitesText, emailsText, phonesText, addressText}]
let linkMode = 'hyperlink'; // or 'plain'

// Query expansion for wide/natural language matching
const SYNONYMS = {
  // mental health
  'suicidal': ['suicide', 'self harm', 'crisis', '999', '111', 'samaritans', 'shout'],
  'panic': ['anxiety', 'panic attacks', 'breathless', 'talking therapies'],
  'low mood': ['depression', 'talking therapies', 'vita minds', 'counselling'],
  'bereavement': ['grief', 'support'],
  // substance misuse
  'alcohol': ['addiction', 'substance misuse', 'open road', 'al-anon', 'smart recovery'],
  'drugs': ['substance misuse', 'open road', 'eypdas', 'phoenix futures'],
  // carers
  'carer': ['carers', 'respite', 'action for family carers', 'carers first'],
  // housing / money
  'housing': ['homeless', 'tenancy', 'benefits', 'peabody', 'streets2homes', 'citizens advice'],
  'money': ['benefits', 'debt', 'citizens advice', 'jobcentre'],
  'food': ['foodbank', 'salvation army', 'the fridge'],
  // safety
  'domestic abuse': ['abuse', 'compass', 'safer places', 'women’s aid', 'galop', 'respect'],
  // neurodiversity
  'autism': ['neurodiversity', 'adhd', 'pact', 'together for neurodiversity'],
  'adhd': ['neurodiversity', 'autism', 'support'],
  // MSK
  'back pain': ['musculoskeletal', 'physio', 'msk', 'self-referral'],
  'joint pain': ['physio', 'msk'],
  // older adults
  'falls': ['fall', 'strength and balance', 'falls car'],
  'lonely': ['loneliness', 'community', 'men’s shed', 'rainbow services', 'walking groups'],
};

const QUICK_CHIPS = [
  {label:'Crisis / suicidal thoughts', q:'urgent crisis suicidal thoughts'},
  {label:'Anxiety / panic', q:'anxiety panic'},
  {label:'Depression / low mood', q:'low mood depression'},
  {label:'Alcohol / drugs', q:'alcohol drugs addiction'},
  {label:'Domestic abuse', q:'domestic abuse'},
  {label:'Carer support', q:'carer respite support'},
  {label:'Housing / benefits', q:'housing benefits money'},
  {label:'Neurodiversity (ADHD/autism)', q:'autism adhd neurodiversity'},
  {label:'MSK pain / physio', q:'back pain physio self referral'},
  {label:'Loneliness / social groups', q:'lonely social group'},
];

function $(id){ return document.getElementById(id); }

function escapeHtml(s){
  return (s ?? '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function catTheme(category){
  const c = (category || '').trim();

  // Map your category names to CSS variables
  const map = {
    'Addiction & Substance Misuse': {
      accent: 'var(--cat-addiction-accent)',
      bg:     'var(--cat-addiction-bg)'
    },
    'Support for Carers': {
      accent: 'var(--cat-carers-accent)',
      bg:     'var(--cat-carers-bg)'
    },
    'Mental Health & Emotional Support': {
      accent: 'var(--cat-mental-accent)',
      bg:     'var(--cat-mental-bg)'
    },
    'Neurodiversity (ADHD, Autism, Learning Disability, etc)': {
      accent: 'var(--cat-neuro-accent)',
      bg:     'var(--cat-neuro-bg)'
    },
    'Musculoskeletal Health': {
      accent: 'var(--cat-msk-accent)',
      bg:     'var(--cat-msk-bg)'
    },
    'Perinatal & Family Wellbeing': {
      accent: 'var(--cat-perinatal-accent)',
      bg:     'var(--cat-perinatal-bg)'
    },
    'Work, Money & Housing and Food Banks': {
      accent: 'var(--cat-work-accent)',
      bg:     'var(--cat-work-bg)'
    },
    'Safety & Abuse': {
      accent: 'var(--cat-safety-accent)',
      bg:     'var(--cat-safety-bg)'
    },
    'Age Related Needs (Mobility, Lifestyle, Care, Community)': {
      accent: 'var(--cat-age-accent)',
      bg:     'var(--cat-age-bg)'
    },
    'Physical Disability & Neurological Conditions': {
      accent: 'var(--cat-disability-accent)',
      bg:     'var(--cat-disability-bg)'
    },
    'Loneliness & Community Connections': {
      accent: 'var(--cat-lonely-accent)',
      bg:     'var(--cat-lonely-bg)'
    },
  };

  return map[c] || { accent: 'var(--cat-default-accent)', bg: 'var(--cat-default-bg)' };
}

function applyCatTheme(el, category){
  
// --- Category icons (Set A) ------------------------------------
// Uses "contains" matching so small wording differences still get the right icon.
function catIcon(category){
  const c = (category || '').toLowerCase();

  if(c.includes('addiction') || c.includes('substance')) return '🧩';
  if(c.includes('carer')) return '🤝';
  if(c.includes('mental') || c.includes('emotional')) return '🧠';
  if(c.includes('neurodivers')) return '🌈';
  if(c.includes('musculoskeletal') || c.includes('msk')) return '🦴';
  if(c.includes('perinatal') || c.includes('family')) return '👶';
  if(c.includes('work') || c.includes('money') || c.includes('housing') || c.includes('food bank') || c.includes('foodbank')) return '🏠';
  if(c.includes('safety') || c.includes('abuse') || c.includes('domestic')) return '🛡️';
  if(c.includes('age related') || c.includes('older') || c.includes('mobility') || c.includes('care, community')) return '🧓';
  if(c.includes('disability') || c.includes('neurological')) return '♿';
  if(c.includes('loneliness') || c.includes('community connections') || c.includes('community')) return '🧑‍🤝‍🧑';

  return '';
}

function displayCategory(category){
  const icon = catIcon(category);
  return icon ? `${icon} ${category}` : category;
}

  const theme = catTheme(category);
  el.dataset.cat = (category || '').trim();
  el.style.setProperty('--cat-accent', theme.accent);
  el.style.setProperty('--cat-bg', theme.bg);
}

function renderMarkdownLinksPreserveText(text){
  // Render [label](href) as <a href="href">label</a> while keeping visible text identical.
  if(!text) return '';
  const re = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let out = '';
  let last = 0;
  let m;
  while((m = re.exec(text)) !== null){
    out += escapeHtml(text.slice(last, m.index));
    const label = escapeHtml(m[1]);
    const href = escapeHtml(m[2]);
    if(href.startsWith('mailto:')){
      out += `<a href="${href}">${label}</a>`;
    } else {
      out += `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
    }
    last = re.lastIndex;
  }
  out += escapeHtml(text.slice(last));
  // Also auto-link bare URLs while keeping them visible
  out = out.replace(/(https?:\/\/[^\s<]+)/g, (u)=>`<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  return out;
}

function buildFuse(){
  fuse = new Fuse(SERVICES, {
    includeScore:true,
    threshold:0.45,
    ignoreLocation:true,
    minMatchCharLength:2,
    keys:[
      {name:'name', weight:0.33},
      {name:'category', weight:0.12},
      {name:'keywords', weight:0.20},
      {name:'summary', weight:0.18},
      {name:'description', weight:0.17},
    ]
  });
}

function expandQuery(q){
  const base = (q||'').toLowerCase();
  let extra = [];
  for(const [k,v] of Object.entries(SYNONYMS)){
    if(base.includes(k)) extra.push(...v);
  }
  return (q + ' ' + extra.join(' ')).trim();
}

function applyFilters(items){
  const cat = $('categoryFilter').value;
  const cost = $('costFilter').value;
  return items.filter(s => (!cat || s.category === cat) && (!cost || (s.cost||'').toLowerCase().includes(cost.toLowerCase())));
}

function scoreBoost(service, q){
  // Rule-based boosts for safety/crisis etc.
  const t = (q||'').toLowerCase();
  let boost = 0;
  if(/suicid|self harm|kill myself|end my life|overdose/.test(t)){
    if(['Suicide attempt','NHS 111','Samaritans','Shout'].includes(service.name)) boost += 0.25;
  }
  if(/domestic|abuse|coercive|violent|forced marriage|honou?r/.test(t)){
    if(['Compass Essex','Safer Places','Women’s Aid','Forced Marriage Unit','Karma Nirvana','LGBTQ+ Domestic Abuse - Galop','Respect'].includes(service.name)) boost += 0.20;
  }
  if(/alcohol|drug|cocaine|heroin|cannabis|substance|withdrawal/.test(t)){
    if(['Open Road','AL-Anon','Phoenix Futures','Essex Young People’s Drug and Alcohol Service (EYPDAS)','Smart Recovery'].includes(service.name)) boost += 0.15;
  }
  if(/carer|caring|respite/.test(t)){
    if(service.category.includes('Carers')) boost += 0.12;
  }
  if(/housing|homeless|evict|rent|arrears|benefit|universal credit|foodbank/.test(t)){
    if(service.category.includes('Work, Money') || service.name.toLowerCase().includes('food')) boost += 0.10;
  }
  return boost;
}

function search(){
  const q0 = $('q').value.trim();
  const q = expandQuery(q0);

  let results;
  if(!q){
    results = SERVICES.map(s => ({item:s, score:0.5}));
  } else {
    results = fuse.search(q);
  }

  // Convert to list and apply rule boosts
  let items = results.map(r => ({...r.item, _score: r.score}));
  items = applyFilters(items);

  if(q){
    items.forEach(s => {
      const b = scoreBoost(s, q0);
      s._score = Math.max(0, (s._score ?? 0.6) - b); // lower Fuse score = better
    });
    items.sort((a,b)=> (a._score??1)-(b._score??1));
  }

  renderResults(items.slice(0, 40));
  $('resultsMeta').textContent = q0 ? `Showing top ${Math.min(40, items.length)} of ${items.length} matches` : `Showing all ${items.length} services`;
}

function renderResults(list){
  const container = $('results');
  container.innerHTML = '';
  if(!list.length){
    container.innerHTML = `<div class="small">No matches found. Try different words or browse categories.</div>`;
    return;
  }
  for(const s of list){
    container.appendChild(serviceCard(s));
  }
}

function serviceCard(service){
  const el = document.createElement('div');
  el.className = 'card';
applyCatTheme(el, service.category);
  const websites = (service.websites||[]).slice(0,3)
    .map(u => `<div><span class="small">Website:</span> <a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(u)}</a></div>`)
    .join('');
  const emails = (service.emails||[]).slice(0,3)
    .map(e => `<div><span class="small">Email:</span> <a href="mailto:${escapeHtml(e)}">${escapeHtml(e)}</a></div>`)
    .join('');
  const phones = (service.phones||[]).slice(0,2)
    .map(p => `<div><span class="small">Tel:</span> <a href="tel:${escapeHtml(p)}">${escapeHtml(p)}</a></div>`)
    .join('');

  const already = selected.some(x => x.id === service.id);

  el.innerHTML = `
    <div class="card-head">
      <div>
        <h3>${escapeHtml(service.name)}</h3>
        <div class="pills">
       <span class="pill">${escapeHtml(displayCategory(service.category))}</span>
          ${service.cost ? `<span class="pill pill-cost">${escapeHtml(service.cost)}</span>`:''}
        </div>
      </div>
      <div class="actions">
        <button class="btn ${already ? 'btn-ghost':''}" data-id="${service.id}">${already ? 'Remove':'Add'}</button>
      </div>
    </div>
<p class="summary">${escapeHtml(service.summary || '')}</p>
    <div class="contacts">
      ${websites}
      ${emails}
      ${phones}
      ${service.address ? `<div><span class="small">Address:</span> ${escapeHtml(service.address)}</div>`:''}
    </div>
    <details>
      <summary>Full description</summary>
      <div class="desc">${renderMarkdownLinksPreserveText(service.description)}</div>
    </details>
  `;

  el.querySelector('button').addEventListener('click', () => {
    if(already) removeSelected(service.id);
    else addSelected(service.id);
  });

  return el;
}

function addSelected(id){
  const svc = SERVICES.find(s=>s.id===id);
  if(!svc) return;
  if(selected.some(x=>x.id===id)) return;

  selected.push({
    id,
    editedTitle: svc.name,
    editedText: '',
    includeFullDesc: false,
    websitesText: (svc.websites||[]).join('\n'),
    emailsText: (svc.emails||[]).join('\n'),
    phonesText: (svc.phones||[]).join('\n'),
    addressText: svc.address || ''
  });
  renderSelected();
  updatePreview();
  search();
}

function removeSelected(id){
  selected = selected.filter(x=>x.id!==id);
  renderSelected();
  updatePreview();
  search();
}

function parseLines(text){
  return (text||'')
    .split(/\r?\n/)
    .map(s=>s.trim())
    .filter(Boolean);
}

function effectiveContacts(item, svc){
  return {
    websites: parseLines(item.websitesText) || (svc.websites||[]),
    emails: parseLines(item.emailsText) || (svc.emails||[]),
    phones: parseLines(item.phonesText) || (svc.phones||[]),
    address: (item.addressText ?? '').trim() || (svc.address||'')
  };
}

function renderSelected(){
  const container = $('selected');
  container.innerHTML = '';
  if(!selected.length){
    container.innerHTML = `<div class="small">No services selected yet. Use <b>Add</b> on any service card.</div>`;
    return;
  }
  for(const item of selected){
    const svc = SERVICES.find(s=>s.id===item.id);
    if(!svc) continue;

    const wrap = document.createElement('div');
    wrap.className = 'selected-item';
    applyCatTheme(wrap, svc.category);
    wrap.innerHTML = `
      <div class="row">
        <div>
          <div style="font-weight:800;color:var(--dark)">${escapeHtml(item.editedTitle || svc.name)}</div>
        <div class="small">${escapeHtml(displayCategory(svc.category))}${svc.cost ? ' • ' + escapeHtml(svc.cost):''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <label class="small"><input type="checkbox" data-id="${svc.id}" data-field="includeFullDesc" ${item.includeFullDesc?'checked':''}/> include full description</label>
          <button class="btn btn-ghost" data-action="remove" data-id="${svc.id}">Remove</button>
        </div>
      </div>

      <label class="label" style="margin-top:8px">Edit title (optional)</label>
      <input type="text" data-id="${svc.id}" data-field="editedTitle" value="${escapeHtml(item.editedTitle || '')}" class="input" />

      <label class="label" style="margin-top:8px">Edit contact details (optional)</label>
      <div class="contact-edit">
        <div>
          <label class="label">Websites (one per line)</label>
          <textarea rows="2" data-id="${svc.id}" data-field="websitesText">${escapeHtml(item.websitesText||'')}</textarea>
        </div>
        <div>
          <label class="label">Emails (one per line)</label>
          <textarea rows="2" data-id="${svc.id}" data-field="emailsText">${escapeHtml(item.emailsText||'')}</textarea>
        </div>
        <div>
          <label class="label">Telephone(s) (one per line)</label>
          <textarea rows="2" data-id="${svc.id}" data-field="phonesText">${escapeHtml(item.phonesText||'')}</textarea>
        </div>
        <div>
          <label class="label">Address</label>
          <textarea rows="2" data-id="${svc.id}" data-field="addressText">${escapeHtml(item.addressText||'')}</textarea>
        </div>
      </div>

      <label class="label" style="margin-top:8px">Add / edit text for this service (optional)</label>
      <textarea rows="3" data-id="${svc.id}" data-field="editedText" placeholder="Add any details, appointment instructions, or personalised notes…">${escapeHtml(item.editedText || '')}</textarea>

      <div class="small" style="margin-top:6px">Tip: Use the toggle above to control whether links are copied as clickable hyperlinks or as plain URLs.</div>
    `;

    wrap.querySelector('[data-action=remove]').addEventListener('click', ()=>removeSelected(svc.id));

    wrap.querySelectorAll('[data-field]').forEach(inp => {
      const field = inp.getAttribute('data-field');
      const id = inp.getAttribute('data-id');
      inp.addEventListener('input', (e)=>{
        const it = selected.find(x=>x.id===id);
        if(!it) return;
        if(field === 'includeFullDesc') it.includeFullDesc = e.target.checked;
        else it[field] = e.target.value;
        updatePreview();
      });
      inp.addEventListener('change', ()=> updatePreview());
    });

    container.appendChild(wrap);
  }
}

function buildFinalHtml(){
  const note = $('patientNote').value.trim();
  const blocks = [];
  if(note){
    blocks.push(`<p><b>Note:</b> ${escapeHtml(note)}</p>`);
  }
  blocks.push(`<h3>Recommended services</h3>`);

  for(const item of selected){
    const svc = SERVICES.find(s=>s.id===item.id);
    if(!svc) continue;

    const c = effectiveContacts(item, svc);

    const title = escapeHtml(item.editedTitle || svc.name);
    const category = escapeHtml(svc.category || '');
    const cost = svc.cost ? ` • ${escapeHtml(svc.cost)}` : '';

    const websites = (c.websites||[]).map(u => {
      if(linkMode === 'hyperlink') return `<div><b>Website:</b> <a href="${escapeHtml(u)}">${escapeHtml(u)}</a></div>`;
      return `<div><b>Website:</b> ${escapeHtml(u)}</div>`;
    }).join('');

    const emails = (c.emails||[]).map(e => {
      if(linkMode === 'hyperlink') return `<div><b>Email:</b> <a href="mailto:${escapeHtml(e)}">${escapeHtml(e)}</a></div>`;
      return `<div><b>Email:</b> ${escapeHtml(e)}</div>`;
    }).join('');

    const phones = (c.phones||[]).map(p => `<div><b>Tel:</b> ${escapeHtml(p)}</div>`).join('');

    const addr = c.address ? `<div><b>Address:</b> ${escapeHtml(c.address)}</div>` : '';

    const userText = (item.editedText||'').trim();
    const userBlock = userText ? `<div style="margin-top:6px">${escapeHtml(userText).replace(/\n/g,'<br/>')}</div>` : '';

    const descBlock = item.includeFullDesc ? `<div style="margin-top:6px"><b>Description:</b><br/>${renderMarkdownLinksPreserveText(svc.description)}</div>` : '';

    blocks.push(`
      <div class="final-block" style="border:1px solid #D8DDE6;border-radius:12px;padding:10px;margin:10px 0">
        <div style="font-weight:800">${title}</div>
        <div style="color:#4C6272;font-size:12px">${category}${cost}</div>
        <div style="margin-top:6px">${escapeHtml(svc.summary||'')}</div>
        ${websites}${emails}${phones}${addr}
        ${userBlock}
        ${descBlock}
      </div>
    `);
  }

  return blocks.join('\n');
}

function buildFinalText(){
  const note = $('patientNote').value.trim();
  const lines = [];
  if(note){
    lines.push('Note: ' + note);
    lines.push('');
  }
  lines.push('Recommended services');
  lines.push('');

  for(const item of selected){
    const svc = SERVICES.find(s=>s.id===item.id);
    if(!svc) continue;

    const c = effectiveContacts(item, svc);

    lines.push(item.editedTitle || svc.name);
    lines.push(`${svc.category}${svc.cost ? ' • ' + svc.cost : ''}`);


    for(const u of (c.websites||[])) lines.push('Website: ' + u);
    for(const e of (c.emails||[])) lines.push('Email: ' + e);
    for(const p of (c.phones||[])) lines.push('Tel: ' + p);
    if(c.address) lines.push('Address: ' + c.address);

    if((item.editedText||'').trim()){
      lines.push('');
      lines.push(item.editedText.trim());
    }

    if(item.includeFullDesc){
      lines.push('');
      lines.push('Description:');
      // Preserve exactly as source (including [label](url))
      lines.push((svc.description||'').trim());
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

async function copyToClipboard(){
  if(!selected.length){
    alert('Select at least one service first.');
    return;
  }

  const html = buildFinalHtml();
  const text = buildFinalText();

  try{
    if(linkMode === 'hyperlink' && window.ClipboardItem){
      const blobHtml = new Blob([`<div>${html}</div>`], {type:'text/html'});
      const blobText = new Blob([text], {type:'text/plain'});
      await navigator.clipboard.write([new ClipboardItem({'text/html': blobHtml, 'text/plain': blobText})]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    alert('Copied to clipboard.');
  } catch(err){
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    alert('Copied to clipboard.');
  }
}

function printSelected(){
  if(!selected.length){
    alert('Select at least one service first.');
    return;
  }
  const w = window.open('', '_blank');
  const html = buildFinalHtml();
  w.document.write(`
    <html><head><title>Harlow Community Services - Print</title>
      <style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:16px} a[href]:after{content:" (" attr(href) ")"}</style>
    </head><body>${html}</body></html>
  `);
  w.document.close();
  w.focus();
  w.print();
}

async function downloadPdf(){
  if(!selected.length){
    alert('Select at least one service first.');
    return;
  }
  const holder = document.createElement('div');
  holder.style.padding='16px';
  holder.innerHTML = buildFinalHtml();

  const opt = {
    margin:       10,
    filename:     'Harlow Community Services - recommendations.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  await html2pdf().set(opt).from(holder).save();
}

function updatePreview(){
  $('finalPreview').innerHTML = buildFinalHtml();
}

function setupCategoryBrowse(){
  const cats = Array.from(new Set(SERVICES.map(s=>s.category))).sort();
  const sel = $('categoryFilter');
  sel.innerHTML = `<option value="">All categories</option>` + cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  const grid = $('categoryGrid');
  grid.innerHTML = '';
  for(const c of cats){
    const count = SERVICES.filter(s=>s.category===c).length;
    const tile = document.createElement('div');
    tile.className='category-tile';
    applyCatTheme(tile, c);
    tile.innerHTML = `<div class="category-title">${escapeHtml(displayCategory(c))}</div><div class="category-count">${count} services</div>`;
    tile.addEventListener('click', ()=>{
      $('categoryFilter').value = c;
      $('q').value = '';
      search();
      window.scrollTo({top:0, behavior:'smooth'});
    });
    grid.appendChild(tile);
  }
}

function setupQuickChips(){
  const wrap = $('quickChips');
  wrap.innerHTML='';
  for(const ch of QUICK_CHIPS){
    const b = document.createElement('button');
    b.className='chip';
    b.textContent = ch.label;
    b.addEventListener('click', ()=>{ $('q').value = ch.q; search(); });
    wrap.appendChild(b);
  }
}

function setupToggles(){
  const btnLink = $('toggleLinks');
  const btnPlain = $('togglePlain');

  function setMode(mode){
    linkMode = mode;
    btnLink.setAttribute('aria-pressed', mode==='hyperlink');
    btnPlain.setAttribute('aria-pressed', mode==='plain');
    updatePreview();
  }

  btnLink.addEventListener('click', ()=> setMode('hyperlink'));
  btnPlain.addEventListener('click', ()=> setMode('plain'));
}

function setupHelp(){
  const dlg = $('helpDialog');
  $('btnHelp').addEventListener('click', ()=> dlg.showModal());
  $('btnCloseHelp').addEventListener('click', ()=> dlg.close());
}

function resetAll(){
  $('q').value='';
  $('categoryFilter').value='';
  $('costFilter').value='';
  $('patientNote').value='';
  selected=[];
  renderSelected();
  updatePreview();
  search();
}

async function init(){
  const res = await fetch('./data/services.json');
  const data = await res.json();
  SERVICES = data.services || [];

  buildFuse();
  setupQuickChips();
  setupCategoryBrowse();
  setupToggles();
  setupHelp();

  $('btnSearch').addEventListener('click', search);
  $('q').addEventListener('keydown', (e)=>{ if(e.key==='Enter') search(); });
  $('categoryFilter').addEventListener('change', search);
  $('costFilter').addEventListener('change', search);
  $('btnBrowseAll').addEventListener('click', ()=>{ $('q').value=''; $('categoryFilter').value=''; $('costFilter').value=''; search(); });

  $('btnCopy').addEventListener('click', copyToClipboard);
  $('btnPrint').addEventListener('click', printSelected);
  $('btnPdf').addEventListener('click', downloadPdf);
  $('btnReset').addEventListener('click', resetAll);

  renderSelected();
  updatePreview();
  search();
}

init();
