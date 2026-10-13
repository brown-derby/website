/* All decisions are explicit, per candidate, and saved by the local server. */
let state, selected, candidateIndex=0, page=0, decisionAction, busy=false, imageLoaded=false;
let candidatesByProduct=new Map();
let batchProducts=null, publishing=null;
const selectedBatch=()=>state.batches?.find(b=>b.id===$('batch').value);
const $=id=>document.getElementById(id);
const labels={sku:'Item / SKU',brand:'Brand',product_name:'Product',flavor:'Flavour',size:'Size',format:'Format',case_pack:'Case pack'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const candidates=product=>candidatesByProduct.get(product.id)||[];
function status(product){const cs=candidates(product);if(product.stale)return 'stale';if(product.approved_candidate)return 'approved';if(cs.some(c=>c.status==='pending'&&c.product_revision===product.revision))return 'ready';return cs.length?'rejected':'research';}
const statusLabels={ready:'Ready to review',approved:'Approved',research:'Needs research',rejected:'Needs new proposal',stale:'Re-verify inventory'};
function filtered(){const q=$('search').value.toLowerCase().trim();return state.products.filter(p=>(!batchProducts||batchProducts.has(p.id))&&(!q||`${p.id} ${p.name} ${candidates(p).map(c=>c.evidence.match.brand.detail).join(' ')}`.toLowerCase().includes(q))&&(!$('category').value||p.category===$('category').value)&&($('filter').value==='all'||status(p)===$('filter').value));}
function showPublishing(){
  if(!state)return;
  const added=state.products.filter(p=>p.approved_candidate&&!p.stale);
  if(!publishing?.products){$('publishing-status').textContent=`${added.length} images saved here · live publication not yet verified`;return;}
  const live=new Map(publishing.products.map(p=>[p.id,p]));
  const published=added.filter(p=>{const c=state.candidates.find(c=>c.id===p.approved_candidate),l=live.get(p.id);return c&&l?.name===p.name&&l.imageUrl===`/product-images/${c.asset}`;}).length;
  $('publishing-status').innerHTML=`<strong>${added.length} saved here · ${published} published · ${added.length-published} awaiting publication</strong> · <a href="https://brownderby.ca/products" target="_blank" rel="noreferrer noopener">View live catalog ↗</a>${publishing.error?' · Live check unavailable; showing last verified status.':''}`;
}
async function loadPublishing(){try{const r=await fetch('/api/publishing',{cache:'no-store'});if(r.ok)publishing=await r.json();showPublishing();}catch{showPublishing();}}
function current(){return state.products.find(p=>p.id===selected);}
function currentCandidate(){const p=current();return p&&candidates(p)[candidateIndex];}
async function load(){
  const r=await fetch('/api/queue',{cache:'no-store'});if(!r.ok)throw Error('Unable to load review data.');state=await r.json();
  const savedBatch=localStorage.getItem('bd-image-review-batch')||($('batch').options.length>1?$('batch').value:null);
  $('batch').innerHTML='<option value="all">All inventory</option>'+(state.batches||[]).map(b=>`<option value="${esc(b.id)}">${esc(b.name)} (${b.product_ids.length})</option>`).join('');
  $('batch').value=(state.batches||[]).some(b=>b.id===savedBatch)?savedBatch:(savedBatch==='all'?'all':state.batches?.[0]?.id||'all');
  setBatch();
  candidatesByProduct=new Map();for(const c of state.candidates){if(!candidatesByProduct.has(c.product_id))candidatesByProduct.set(c.product_id,[]);candidatesByProduct.get(c.product_id).push(c);}
  const categories=[...new Set(state.products.map(p=>p.category))].sort();const old=$('category').value;
  $('category').innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('category').value=old;
  const count=state.products.filter(p=>status(p)==='approved').length;
  $('approved-count').textContent=count.toLocaleString();$('progress').max=state.products.length;$('progress').value=count;
  $('progress-detail').textContent=`of ${state.products.length.toLocaleString()} inventory items · ${state.products.filter(p=>status(p)==='ready').length} ready`;
  const restoredPosition=filtered().findIndex(p=>p.id===selected);if(restoredPosition>=0)page=Math.floor(restoredPosition/25);
  render();showPublishing();void loadPublishing();
}
function setBatch(){const b=selectedBatch();batchProducts=b?new Set(b.product_ids):null;localStorage.setItem('bd-image-review-batch',$('batch').value);}
function select(pid){selected=pid;const p=current();const cs=candidates(p);page=Math.floor(Math.max(0,filtered().findIndex(x=>x.id===pid))/25);candidateIndex=Math.max(0,cs.findIndex(c=>c.status==='pending'&&c.product_revision===p.revision));localStorage.setItem('bd-image-review-last',pid);render();}
function render(){
  const list=filtered();page=Math.min(page,Math.max(0,Math.ceil(list.length/25)-1));
  if(!list.some(p=>p.id===selected)){selected=list[0]?.id;candidateIndex=0;}

  const batch=selectedBatch();const rows=state.products.filter(p=>!batchProducts||batchProducts.has(p.id));
  $('batch-progress').textContent=batch?`${rows.filter(p=>status(p)==='approved').length} of ${rows.length} added · ${rows.filter(p=>status(p)==='ready').length} images ready · ${rows.filter(p=>status(p)==='research').length} need research`:'';
  $('queue-count').textContent=`${list.length.toLocaleString()} items`;$('page-label').textContent=`${page+1} / ${Math.max(1,Math.ceil(list.length/25))}`;
  $('page-prev').disabled=page===0;$('page-next').disabled=(page+1)*25>=list.length;
  $('items').innerHTML=list.slice(page*25,page*25+25).map(p=>`<button class="item ${p.id===selected?'active':''}" data-product="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>Item #${esc(p.id)}</small><span class="tag ${status(p)==='approved'?'':'warning'}">${statusLabels[status(p)]}</span></button>`).join('')||'<p class="empty">No items in this filter.</p>';
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>select(b.dataset.product));renderDetail(list);
}
function renderDetail(list){
  imageLoaded=false;const p=current();if(!p){$('detail').innerHTML='<div class="empty"><h2>No products in this view</h2><p>Choose All inventory or another filter to continue.</p></div>';return;}
  const cs=candidates(p);candidateIndex=Math.max(0,Math.min(candidateIndex,cs.length-1));const c=cs[candidateIndex];const ev=c?.evidence;const pos=list.findIndex(x=>x.id===p.id);
  const old=state.candidates.find(x=>x.id===p.approved_candidate);
  $('detail').innerHTML=`<div class="review-controls"><span>Item #${esc(p.id)} · ${esc(p.name)}</span>${c?`<button class="primary" id="approve" disabled>${p.approved_candidate?'Replace approved image':'Add'}</button>`:''}</div><div class="batch-navigation"><button id="item-prev" ${pos===0?'disabled':''}>← Previous item</button><button id="item-next" ${pos===list.length-1?'disabled':''}>Next item →</button></div><div class="product-head"><div><p class="eyebrow">ITEM #${esc(p.id)}</p><h2>${esc(p.name)}</h2><p class="product-meta">${esc(p.category)} · ${statusLabels[status(p)]}</p></div><button id="new-candidate">Choose another image</button></div>
  ${old?`<div class="approved-current"><strong>Current approved image${p.stale?' · withheld from new exports until re-verified':''}</strong><img src="/assets/${esc(old.asset)}" alt="Currently approved image"><span>Existing approval is preserved. A new proposal requires an explicit replacement decision.</span></div>`:''}
  ${c?`<div class="candidate-nav"><button id="candidate-prev" ${candidateIndex===0?'disabled':''}>←</button><span>Proposal ${candidateIndex+1} of ${cs.length} · ${esc(c.status)} · ${esc(ev.confidence)}</span><button id="candidate-next" ${candidateIndex===cs.length-1?'disabled':''}>→</button></div><div class="image-evidence"><div><div class="image-stage" id="image-stage">${c.asset?`<img id="candidate-image" src="/assets/${esc(c.asset)}" alt="Proposed image for ${esc(p.name)}">`:'<p>Image snapshot missing.<br>Add an image file before approving.</p>'}</div><p class="image-caption">${esc(ev.source_type)} source · ${esc(ev.image_scope||'Scope needs verification')}<br>Click image to inspect at full size.</p>${ev.research_date?`<small>Image snapshot researched ${esc(ev.research_date)}</small>`:''}</div><div><table class="evidence-table"><tbody>${Object.entries(labels).map(([key,label])=>`<tr><td>${label}</td><td><span class="tag ${ev.match[key].status==='matched'?'':'warning'}">${esc(ev.match[key].status)}</span>${esc(ev.match[key].detail)}</td></tr>`).join('')}</tbody></table><p class="source-links">${ev.source_url?`<a href="${esc(ev.source_url)}" target="_blank" rel="noreferrer noopener">Manufacturer / source page ↗</a><br>`:''}${(ev.supporting_sources||[]).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noreferrer noopener">${esc(x.label)} ↗</a><br>`).join('')}</p></div></div><div class="notice"><strong>Match and source notes</strong><p>${esc(ev.ambiguity)}</p><p><strong>Image use:</strong> ${esc(ev.usage_suitability)}</p></div><div class="actions"><button class="danger" id="reject" ${c.status!=='pending'||c.product_revision!==p.revision?'disabled':''}>Reject proposal</button></div>`:`<div class="empty"><h3>This item needs image research</h3><p>${esc(selectedBatch()?.research_notes?.find(n=>n.product_id===p.id)?.note||'No match has been proposed.')} The exact inventory name above is the source of truth; missing brand or pack details must be verified.</p><a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p.id+' '+p.name)}" target="_blank" rel="noreferrer noopener">Search this exact item ↗</a></div>`}
  <details class="history"><summary>Decision history for this item</summary><ul>${state.events.filter(e=>e.product_id===p.id).slice(-12).reverse().map(e=>`<li>${esc(new Date(e.created_at).toLocaleString())} · ${esc(e.action)}${e.payload.reviewer?' · '+esc(e.payload.reviewer):''}<br>${esc(e.payload.note||'')}${e.candidate_id?'<br>Proposal '+esc(e.candidate_id):''}</li>`).join('')||'<li>No decisions recorded.</li>'}</ul></details>`;
  $('item-prev').onclick=()=>select(list[pos-1].id);$('item-next').onclick=()=>select(list[pos+1].id);
  $('new-candidate').onclick=()=>{$('upload-product').textContent=`${p.id} · ${p.name}`;$('upload-error').textContent='';$('upload-form').reset();$('upload-dialog').showModal();};
  if(c){
    $('candidate-prev').onclick=()=>{candidateIndex--;renderDetail(list);};$('candidate-next').onclick=()=>{candidateIndex++;renderDetail(list);};
    $('reject').onclick=()=>openDecision('reject');$('approve').onclick=addImage;
    const img=$('candidate-image');if(img){const ready=()=>{imageLoaded=true;$('approve').disabled=c.status!=='pending'||c.product_revision!==p.revision;};img.onload=ready;img.onerror=()=>{$('message').textContent='Image could not be displayed. Approval is disabled; add a new proposal.';};if(img.complete&&img.naturalWidth)ready();$('image-stage').onclick=()=>{$('zoom-image').src=img.src;$('zoom-dialog').showModal();};}
  }
}
async function addImage(){
  if(busy||!imageLoaded)return;
  const p=current(),c=currentCandidate();busy=true;$('approve').disabled=true;
  try{
    const result=await post('/api/decision',{action:'approve',approval_method:'one_click_add',image_confirmed:true,product_id:p.id,candidate_id:c.id,revision:p.revision,expected_approved:p.approved_candidate,replace_confirmed:Boolean(p.approved_candidate),reviewer:localStorage.getItem('bd-image-review-reviewer')||'Local review desk user'});
    $('message').textContent=result.warning||`Added image for item #${p.id}. Saved to your product sheet; awaiting website publication.`;
    const list=filtered(),position=list.findIndex(x=>x.id===p.id);
    selected=[...list.slice(position+1),...list.slice(0,position)].find(x=>status(x)==='ready')?.id;
    candidateIndex=0;await load();if(selected)select(selected);
  }catch(error){$('message').textContent=error.message;}
  finally{busy=false;const button=$('approve');if(button)button.disabled=!imageLoaded||currentCandidate()?.status!=='pending';}
}
function openDecision(action){if(busy)return;const p=current(),c=currentCandidate();
  decisionAction='reject';$('decision-form').reset();$('reviewer').value=localStorage.getItem('bd-image-review-reviewer')||'';$('decision-title').textContent='Reject this proposal';$('decision-product').textContent=`Item #${p.id} · ${p.name} · Proposal ${c.id}`;
  $('decision-note').required=true;$('decision-error').textContent='';$('decision-dialog').showModal();
}
async function post(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':state.token},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to save.');return data;}
$('decision-form').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;$('commit-decision').disabled=true;const p=current(),c=currentCandidate();
  try{await post('/api/decision',{action:decisionAction,product_id:p.id,candidate_id:c.id,revision:p.revision,expected_approved:p.approved_candidate,reviewer:$('reviewer').value,note:$('decision-note').value});localStorage.setItem('bd-image-review-reviewer',$('reviewer').value);$('decision-dialog').close();$('message').textContent=`Rejection saved for item #${p.id}.`;await load();}
  catch(error){$('decision-error').textContent=error.message;}finally{busy=false;$('commit-decision').disabled=false;}
};
$('upload-form').onsubmit=async event=>{event.preventDefault();if(busy)return;const file=$('upload-file').files[0];if(!file||file.size>12*1024*1024){$('upload-error').textContent='Choose an image up to 12 MB.';return;}busy=true;$('commit-upload').disabled=true;
  try{const imageBase64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const result=await post('/api/candidate',{product_id:current().id,image_base64:imageBase64,evidence:{source_url:$('source-url').value,source_type:$('source-type').value,source_note:$('source-note').value,confidence:'manual verification required',ambiguity:$('source-note').value,usage_suitability:'User-supplied proposal; verify image-use permission before approving.',image_scope:'User-supplied image; verify unit / case format.',original_filename:file.name}});$('upload-dialog').close();$('message').textContent='New image proposal saved. It is awaiting your review.';await load();candidateIndex=candidates(current()).findIndex(c=>c.id===result.candidate_id);render();}
  catch(error){$('upload-error').textContent=error.message;}finally{busy=false;$('commit-upload').disabled=false;}
};
$('cancel-decision').onclick=()=>$('decision-dialog').close();$('cancel-upload').onclick=()=>$('upload-dialog').close();$('close-zoom').onclick=()=>$('zoom-dialog').close();
$('batch').onchange=()=>{setBatch();page=0;render();};
['search','filter','category'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;render();}));
$('page-prev').onclick=()=>{page--;render();};$('page-next').onclick=()=>{page++;render();};$('refresh').onclick=()=>load().catch(e=>$('message').textContent=e.message);
selected=localStorage.getItem('bd-image-review-last');load().catch(e=>$('message').textContent=e.message);

setInterval(()=>{void loadPublishing();},30000);
