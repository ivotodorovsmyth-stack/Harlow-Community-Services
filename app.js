// Harlow Community Services - client-side only

let SERVICES = [];
let fuse = null;
let selected = []; // [{id, editedText, editedTitle, websitesText, emailsText, phonesText, addressText}]
let linkMode = 'hyperlink'; // or 'plain'
let searchTimer = null;

// Category icons + colours (no branding)
const CATEGORY_META = {
  'Addiction & Substance Misuse': { icon: '🧩', colorVar: '--cat-addiction' },
  'Support for Carers': { icon: '🤝', colorVar: '--cat-carers' },
  'Mental Health & Emotional Support': { icon: '🧠', colorVar: '--cat-mental' },
  'Neurodiversity (ADHD, Autism, Learning Disability, etc)': { icon: '🌈', colorVar: '--cat-neuro' },
  'Musculoskeletal Health': { icon: '🦴', colorVar: '--cat-msk' },
  'Perinatal & Family Wellbeing': { icon: '👶', colorVar: '--cat-perinatal' },
  'Work, Money & Housing and Food Banks': { icon: '🏠', colorVar: '--cat-work' },
  'Safety & Abuse': { icon: '🛡️', colorVar: '--cat-safety' },
  'Age Related Needs (Mobility, Lifestyle, Care, Community)': { icon: '🧓', colorVar: '--cat-age' },
  'Physical Disability & Neurological Conditions': { icon: '♿', colorVar: '--cat-disability' },
  'Loneliness & Community Connections': { icon: '🧑‍🤝‍🧑', colorVar: '--cat-lonely' },
};

function normCategory(cat){
  return (cat||'').replace(/\s+/g,' ').trim();
}

function metaFor(cat){
  const c = normCategory(cat);
  if(CATEGORY_META[c]) return CATEGORY_META[c];
  if(c.toLowerCase().includes('neurodivers')) return CATEGORY_META['Neurodiversity (ADHD, Autism, Learning Disability, etc)'];
  if(c.toLowerCase().includes('mental')) return CATEGORY_META['Mental Health & Emotional Support'];
  if(c.toLowerCase().includes('carer')) return CATEGORY_META['Support for Carers'];
  if(c.toLowerCase().includes('addiction') || c.toLowerCase().includes('substance')) return CATEGORY_META['Addiction & Substance Misuse'];
  if(c.toLowerCase().includes('perinatal') || c.toLowerCase().includes('family')) return CATEGORY_META['Perinatal & Family Wellbeing'];
  if(c.toLowerCase().includes('work') || c.toLowerCase().includes('housing') || c.toLowerCase().includes('food')) return CATEGORY_META['Work, Money & Housing and Food Banks'];
  if(c.toLowerCase().includes('safety') || c.toLowerCase().includes('abuse')) return CATEGORY_META['Safety & Abuse'];
  if(c.toLowerCase().includes('lonely') || c.toLowerCase().includes('community')) return CATEGORY_META['Loneliness & Community Connections'];
  if(c.toLowerCase().includes('age') || c.toLowerCase().includes('older') || c.toLowerCase().includes('mobility')) return CATEGORY_META['Age Related Needs (Mobility, Lifestyle, Care, Community)'];
  if(c.toLowerCase().includes('musculoskeletal') || c.toLowerCase().includes('physio') || c.toLowerCase().includes('msk')) return CATEGORY_META['Musculoskeletal Health'];
  if(c.toLowerCase().includes('disability') || c.toLowerCase().includes('neurological')) return CATEGORY_META['Physical Disability & Neurological Conditions'];
  return { icon: 'ℹ️', colorVar: '--blue' };
}

const SYNONYMS = {
  'suicidal': ['suicide', 'self harm', 'crisis', '999', '111', 'samaritans', 'shout'],
  'panic': ['anxiety', 'panic attacks', 'breathless', 'talking therapies', 'vita minds'],
  'cant sleep': ['insomnia', 'anxiety', 'stress'],
  'low mood': ['depression', 'talking therapies', 'vita minds', 'counselling'],
  'bereavement': ['grief', 'support'],
  'lonely': ['loneliness', 'community', 'men’s shed', 'walking group', 'rainbow services'],
  'alcohol': ['addiction', 'substance misuse', 'open road', 'al-anon', 'smart recovery'],
  'drugs': ['substance misuse', 'open road', 'eypdas', 'phoenix futures'],
  'gambling': ['addiction', 'support'],
  'carer': ['carers', 'respite', 'action for family carers', 'carers first', 'mobilise'],
  'burnout': ['stress', 'carer', 'respite', 'counselling'],
  'housing': ['homeless', 'tenancy', 'benefits', 'peabody', 'streets2homes', 'citizens advice'],
  'eviction': ['housing', 'arrears', 'citizens advice', 'peabody'],
  'money': ['benefits', 'debt', 'citizens advice', 'jobcentre'],
  'food': ['foodbank', 'salvation army', 'the fridge'],
  'domestic abuse': ['abuse', 'compass', 'safer places', 'women’s aid', 'galop', 'respect'],
  'forced marriage': ['forced marriage unit', 'karma nirvana'],
  'autism': ['neurodiversity', 'adhd', 'pact', 'together for neurodiversity', 'families in focus'],
  'adhd': ['neurodiversity', 'autism', 'support'],
  'back pain': ['musculoskeletal', 'physio', 'msk', 'self-referral'],
  'joint pain': ['physio', 'msk'],
  'falls': ['fall', 'strength and balance', 'falls car'],
};

const QUICK_CHIPS = [
  {label:'“I feel panicky and can’t sleep” → anxiety / talking therapies', q:'I feel panicky and cant sleep'},
  {label:'“I’m having thoughts of ending my life” → crisis support', q:'I am suicidal and need urgent help'},
  {label:'“I’m drinking more and want help to stop” → alcohol support', q:'drinking too much alcohol want help'},
  {label:'“Cocaine / drugs are out of control” → substance misuse', q:'drug use cocaine support'},
  {label:'“I’m a carer and I’m exhausted” → carer breaks/respite', q:'carer burnout need a break'},
  {label:'“Money problems / benefits / debt” → advice services', q:'benefits debt money advice'},
  {label:'“I’m at risk of homelessness” → housing support', q:'eviction homeless housing help'},
  {label:'“Foodbank / emergency food” → food support', q:'foodbank emergency food'},
  {label:'“Domestic abuse / controlling partner” → safety support', q:'domestic abuse controlling partner'},
  {label:'“Autism/ADHD support for my child” → neurodiversity services', q:'autism adhd support for my child'},
  {label:'“Back pain, need physio” → MSK self-referral', q:'back pain need physio self referral'},
  {label:'“Lonely and isolated” → community connections', q:'lonely isolated need social group'},
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

function renderMarkdownLinksPreserveText(text){
  if(!text) return '';
  const re = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let out = '';
  let last = 0;
  let m;
  while((m = re.exec(text)) !== null){
    out += escapeHtml(text.slice(last, m.index));
    const label = escapeHtml(m[1]);
    const href = escapeHtml(m[2]);
    if(href.startsWith('mailto:')) out += `<a href="${href}">${label}</a>`;
    else out += `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
    last = re.lastIndex;
  }
  out += escapeHtml(text.slice(last));
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

function scoreBoost(service, q){
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
    if(normCategory(service.category).toLowerCase().includes('carer')) boost += 0.12;
  }
  if(/housing|homeless|evict|rent|arrears|benefit|universal credit|foodbank/.test(t)){
    if(normCategory(service.category).toLowerCase().includes('work') || service.name.toLowerCase().includes('food')) boost += 0.10;
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

  let items = results.map(r => ({...r.item, _score: r.score}));

  const cost = $('costFilter')?.value || '';
  if(cost){
    items = items.filter(s => (s.cost||'').toLowerCase().includes(cost.toLowerCase()));
  }

  if(q){
    items.forEach(s => {
      const b = scoreBoost(s, q0);
      s._score = Math.max(0, (s._score ?? 0.6) - b);
    });
    items.sort((a,b)=> (a._score??1)-(b._score??1));
  }

  renderResults(items.slice(0, 40));
  $('resultsMeta').textContent = q0 ? `Showing top ${Math.min(40, items.length)} of ${items.length} matches` : `Showing all ${items.length} services`;
}

function scheduleSearch(){
  clearTimeout(searchTimer);
  searchTimer = setTimeout(search, 180);
}

function renderResults(list){
  const container = $('results');
  container.innerHTML = '';
  if(!list.length){
    container.innerHTML = `<div class="small">No matches found. Try different words or use the category tiles below.</div>`;
    return;
  }
  for(const s of list){
    container.appendChild(serviceCard(s));
  }
}

function serviceCard(service){
  const el = document.createElement('div');
  el.className = 'card';

  const meta = metaFor(service.category);
  el.dataset.cat = normCategory(service.category);
  el.style.setProperty('--cat-color', `var(${meta.colorVar})`);

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
      <div class="title-row">
        <span class="cat-accent" title="${escapeHtml(normCategory(service.category))}">${escapeHtml(meta.icon)}</span>
        <div>
          <h3>${escapeHtml(service.name)}</h3>
          <div class="pills">
            <span class="pill">${escapeHtml(normCategory(service.category))}</span>
            ${service.cost ? `<span class="pill pill-cost">${escapeHtml(service.cost)}</span>`:''}
          </div>
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
    websitesText: (svc.websites||[]).join('
'),
    emailsText: (svc.emails||[]).join('
'),
    phonesText: (svc.phones||[]).join('
'),
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
    .split(/
?
/)
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

    const meta = metaFor(svc.category);

    const wrap = document.createElement('div');
    wrap.className = 'selected-item';
    wrap.style.setProperty('--cat-color', `var(${meta.colorVar})`);
    wrap.style.borderLeft = '6px solid var(--cat-color)';

    wrap.innerHTML = `
      <div class="row">
        <div style="display:flex;gap:10px;align-items:center">
          <span class="cat-accent" title="${escapeHtml(normCategory(svc.category))}">${escapeHtml(meta.icon)}</span>
          <div>
            <div style="font-weight:800;color:var(--dark)">${escapeHtml(item.editedTitle || svc.name)}</div>
            <div class="small">${escapeHtml(normCategory(svc.category))}${svc.cost ? ' • ' + escapeHtml(svc.cost):''}</div>
          </div>
        </div>
        <button class="btn btn-ghost" data-action="remove" data-id="${svc.id}">Remove</button>
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
      <textarea rows="3" data-id="${svc.id}" data-field="editedText" placeholder="Add any appointment instructions or personalised notes…">${escapeHtml(item.editedText || '')}</textarea>

      <div class="small" style="margin-top:6px">Full service descriptions are always included in the patient output.</div>
    `;

    wrap.querySelector('[data-action=remove]').addEventListener('click', ()=>removeSelected(svc.id));

    wrap.querySelectorAll('[data-field]').forEach(inp => {
      const field = inp.getAttribute('data-field');
      const id = inp.getAttribute('data-id');
      inp.addEventListener('input', (e)=>{
        const it = selected.find(x=>x.id===id);
        if(!it) return;
        it[field] = e.target.value;
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
    const costLine = svc.cost ? `<div style="color:#4C6272;font-size:12px"><b>Cost:</b> ${escapeHtml(svc.cost)}</div>` : ``;

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
    const userBlock = userText ? `<div style="margin-top:6px">${escapeHtml(userText).replace(/
/g,'<br/>')}</div>` : '';

    const descBlock = `<div style="margin-top:8px"><b>Description:</b><br/>${renderMarkdownLinksPreserveText(svc.description)}</div>`;

    blocks.push(`
      <div class="final-block" style="border:1px solid #D8DDE6;border-radius:12px;padding:10px;margin:10px 0">
        <div style="font-weight:800">${title}</div>
        ${costLine}
        <div style="margin-top:6px">${escapeHtml(svc.summary||'')}</div>
        ${websites}${emails}${phones}${addr}
        ${userBlock}
        ${descBlock}
      </div>
    `);
  }

  return blocks.join('
');
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
    if(svc.cost) lines.push('Cost: ' + svc.cost);
    lines.push(svc.summary || '');

    for(const u of (c.websites||[])) lines.push('Website: ' + u);
    for(const e of (c.emails||[])) lines.push('Email: ' + e);
    for(const p of (c.phones||[])) lines.push('Tel: ' + p);
    if(c.address) lines.push('Address: ' + c.address);

    if((item.editedText||'').trim()){
      lines.push('');
      lines.push(item.editedText.trim());
    }

    lines.push('');
    lines.push('Description:');
    lines.push((svc.description||'').trim());

    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('
');
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
  const cats = Array.from(new Set(SERVICES.map(s=>normCategory(s.category)))).sort();
  const grid = $('categoryGrid');
  grid.innerHTML = '';
  for(const c of cats){
    const count = SERVICES.filter(s=>normCategory(s.category)===c).length;
    const meta = metaFor(c);
    const tile = document.createElement('div');
    tile.className='category-tile';
    tile.style.borderLeft = `6px solid var(${meta.colorVar})`;
    tile.innerHTML = `<div class="category-title"><span class="cat-accent" style="margin-right:8px">${escapeHtml(meta.icon)}</span>${escapeHtml(c)}</div><div class="category-count">${count} services</div>`;
    tile.addEventListener('click', ()=>{
      $('q').value = c;
      scheduleSearch();
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
  SERVICES = (data.services || []).map(s=>({ ...s, category: normCategory(s.category) }));

  buildFuse();
  setupQuickChips();
  setupCategoryBrowse();
  setupToggles();
  setupHelp();

  $('q').addEventListener('input', scheduleSearch);
  $('costFilter').addEventListener('change', search);
  $('btnBrowseAll').addEventListener('click', ()=>{ $('q').value=''; $('costFilter').value=''; search(); });

  $('btnCopy').addEventListener('click', copyToClipboard);
  $('btnPrint').addEventListener('click', printSelected);
  $('btnPdf').addEventListener('click', downloadPdf);
  $('btnReset').addEventListener('click', resetAll);

  renderSelected();
  updatePreview();
  search();
}

init();
