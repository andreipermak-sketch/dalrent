(function () {
  'use strict';

  const CFG = window.SITE_CONFIG;
  const CATS = window.CATEGORIES;
  const TASKS = window.TASKS;
  const TOOLS = window.TOOLS;
  const toolById = Object.fromEntries(TOOLS.map(t => [t.id, t]));
  const catById = Object.fromEntries(CATS.map(c => [c.id, c]));

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const fmt = n => n.toLocaleString('ru-RU');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Иконки категорий (заглушки, пока нет фото) ----------
  const ICONS = {
    hammer: '<path d="M14 18h22l6 6v6H30l-4 6v22h-8V36l-4-4Z" fill="currentColor"/><path d="M42 24h8v8h-8z" fill="currentColor" opacity=".6"/>',
    drill: '<path d="M10 20h30a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6H32l-4 22H18l2-22h-10Z" fill="currentColor"/><path d="M46 26h8v4h-8z" fill="currentColor" opacity=".6"/>',
    saw: '<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="6" stroke-dasharray="6 4"/><circle cx="32" cy="32" r="6" fill="currentColor"/>',
    grinder: '<rect x="8" y="26" width="34" height="12" rx="6" fill="currentColor"/><circle cx="48" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="5"/>',
    laser: '<rect x="20" y="20" width="24" height="24" rx="4" fill="currentColor"/><path d="M4 32h14M46 32h14M32 4v14M32 46v14" stroke="currentColor" stroke-width="3" opacity=".6"/>',
    vacuum: '<rect x="16" y="22" width="26" height="30" rx="8" fill="currentColor"/><path d="M42 30c10 0 14 6 14 14v12" fill="none" stroke="currentColor" stroke-width="4" opacity=".6"/><circle cx="22" cy="56" r="4" fill="currentColor"/><circle cx="36" cy="56" r="4" fill="currentColor"/>',
    mixer: '<path d="M16 16h28l6 26H10Z" fill="currentColor"/><path d="M14 42l-4 16M46 42l4 16" stroke="currentColor" stroke-width="4" opacity=".6"/>',
    heat: '<rect x="8" y="20" width="38" height="24" rx="12" fill="currentColor"/><path d="M50 24c4 3 4 13 0 16M56 20c6 5 6 19 0 24" fill="none" stroke="currentColor" stroke-width="3" opacity=".6"/>',
    bolt: '<path d="M36 4 14 36h14l-4 24 26-34H36Z" fill="currentColor"/>',
    leaf: '<path d="M12 52C12 24 30 10 54 10c0 26-14 42-42 42Z" fill="currentColor"/><path d="M12 52 40 24" stroke="#141414" stroke-width="3"/>',
  };
  function iconFor(tool) {
    const key = (catById[tool.cat] || {}).icon || 'bolt';
    return `<svg class="tool-icon" viewBox="0 0 64 64" aria-hidden="true">${ICONS[key]}</svg>`;
  }
  function media(tool) {
    return tool.image ? `<img src="${esc(tool.image)}" alt="${esc(tool.name)}" loading="lazy">` : iconFor(tool);
  }

  // ---------- Цены ----------
  function discountFor(days) {
    if (days >= 7) return 0.25;
    if (days >= 3) return 0.10;
    return 0;
  }
  function dayPrice(tool, days) {
    return Math.round(tool.price * (1 - discountFor(days)));
  }

  // ---------- Хранилище ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* приватный режим */ }
    },
  };

  // ---------- Состояние ----------
  const state = {
    query: '',
    cat: 'all',
    task: null,
    onlyStock: false,
    sort: 'popular',
    cart: store.get('dalrent_cart', []).filter(i => toolById[i.id]),
    booking: store.get('dalrent_booking', {}),
  };
  function saveCart() {
    store.set('dalrent_cart', state.cart);
    $('#cartCount').textContent = state.cart.reduce((s, i) => s + i.qty, 0);
  }

  // ---------- Контакты из конфига ----------
  function fillContacts() {
    $$('[data-phone]').forEach(a => { a.textContent = CFG.phone; a.href = 'tel:' + CFG.phoneRaw; });
    $$('[data-phone-btn]').forEach(a => { a.href = 'tel:' + CFG.phoneRaw; a.textContent = 'Позвонить ' + CFG.phone; });
    $$('[data-email]').forEach(a => { a.textContent = CFG.email; a.href = 'mailto:' + CFG.email; });
    $$('[data-address]').forEach(el => el.textContent = CFG.address);
    $$('[data-hours]').forEach(el => el.textContent = CFG.hours);
    $$('[data-city]').forEach(el => el.textContent = CFG.city);
    $$('[data-delivery]').forEach(el => el.textContent = fmt(CFG.deliveryPrice));
    $$('[data-count-tools]').forEach(el => el.textContent = TOOLS.reduce((s, t) => s + t.stock, 0) + '+');
    $('#year').textContent = new Date().getFullYear();
  }

  // ---------- Фильтры ----------
  function renderCats() {
    const counts = {};
    TOOLS.forEach(t => counts[t.cat] = (counts[t.cat] || 0) + 1);
    const items = [{ id: 'all', name: 'Все инструменты' }, ...CATS];
    $('#catList').innerHTML = items.map(c => `
      <li><button data-cat="${c.id}" class="${state.cat === c.id ? 'is-active' : ''}">
        <span>${esc(c.name)}</span><small>${c.id === 'all' ? TOOLS.length : counts[c.id] || 0}</small>
      </button></li>`).join('');
  }
  function renderTaskChips() {
    const html = TASKS.map(t => `<button class="chip ${state.task === t.id ? 'is-active' : ''}" data-task="${t.id}">${esc(t.name)}</button>`).join('');
    $('#taskFilter').innerHTML = html;
    $('#heroTasks').innerHTML = html;
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    let list = TOOLS.filter(t => {
      if (state.cat !== 'all' && t.cat !== state.cat) return false;
      if (state.task && !t.tasks.includes(state.task)) return false;
      if (state.onlyStock && t.stock < 1) return false;
      if (q) {
        const hay = [t.name, t.brand, t.short, catById[t.cat].name, ...t.tasks.map(id => (TASKS.find(x => x.id === id) || {}).name)].join(' ').toLowerCase();
        if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });
    const sorters = {
      popular: (a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || a.price - b.price,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name, 'ru'),
    };
    return list.sort(sorters[state.sort]);
  }

  function availability(t) {
    if (t.stock < 1) return '<span class="avail avail--no">Под заказ</span>';
    if (t.stock === 1) return '<span class="avail avail--low">Осталась 1 шт.</span>';
    return '<span class="avail avail--yes">В наличии</span>';
  }
  function inCart(id) { return state.cart.some(i => i.id === id); }

  function renderGrid() {
    const list = filtered();
    const active = [];
    if (state.cat !== 'all') active.push(catById[state.cat].name);
    if (state.task) active.push(TASKS.find(t => t.id === state.task).name);
    if (state.query) active.push('«' + state.query + '»');
    $('#resultInfo').innerHTML = `Найдено: <b>${list.length}</b>${active.length ? ' · ' + esc(active.join(', ')) + '<button data-reset>Сбросить</button>' : ''}`;

    if (!list.length) {
      $('#grid').innerHTML = `<div class="empty"><h3>Ничего не нашли</h3><p>Попробуйте изменить запрос или позвоните — подберём инструмент под задачу.</p><button class="btn btn--dark" data-reset>Показать все</button></div>`;
      return;
    }
    $('#grid').innerHTML = list.map(t => `
      <article class="card" data-open="${t.id}" tabindex="0" aria-label="${esc(t.name)}">
        <div class="card__media">
          ${t.popular ? '<span class="badge">Хит проката</span>' : ''}
          ${media(t)}
          <span class="card__brand">${esc(t.brand)}</span>
        </div>
        <div class="card__body">
          ${availability(t)}
          <h3 class="card__title">${esc(t.name)}</h3>
          <p class="card__short">${esc(t.short)}</p>
          <div class="card__foot">
            <div class="price">${fmt(t.price)} ₽ <small>/ сутки</small></div>
            <button class="btn btn--primary card__add ${inCart(t.id) ? 'is-added' : ''}" data-add="${t.id}">${inCart(t.id) ? '✓ В списке' : 'Арендовать'}</button>
          </div>
        </div>
      </article>`).join('');
  }

  function update() { renderCats(); renderTaskChips(); renderGrid(); }

  function resetFilters() {
    Object.assign(state, { query: '', cat: 'all', task: null, onlyStock: false });
    $('#query').value = ''; $('#heroQuery').value = ''; $('#onlyStock').checked = false;
    update();
  }

  // ---------- Карточка инструмента ----------
  function openProduct(id) {
    const t = toolById[id];
    if (!t) return;
    const tasks = t.tasks.map(tid => (TASKS.find(x => x.id === tid) || {}).name).filter(Boolean);
    $('#productBody').innerHTML = `
      <div class="product">
        <div class="product__media">${media(t)}</div>
        <div class="product__info">
          ${availability(t)}
          <h2 id="pmTitle">${esc(t.name)}</h2>
          <p>${esc(t.short)}</p>
          <div class="price-table">
            <div><span>1–2 суток</span><b>${fmt(t.price)} ₽</b></div>
            <div><span>от 3 суток</span><b>${fmt(dayPrice(t, 3))} ₽</b></div>
            <div><span>от 7 суток</span><b>${fmt(dayPrice(t, 7))} ₽</b></div>
          </div>
          <p class="deposit-note">Залог: <b>${fmt(t.deposit)} ₽</b> — возвращается при сдаче инструмента</p>
          <h4>Характеристики</h4>
          <table class="specs">${Object.entries(t.specs).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
          ${t.kit.length ? `<h4>Комплектация</h4><ul class="kit">${t.kit.map(k => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
          ${tasks.length ? `<h4>Подходит для</h4><p style="margin:0;font-size:14px">${esc(tasks.join(' · '))}</p>` : ''}
          <div class="product__actions">
            <button class="btn btn--primary btn--lg" data-book="${t.id}">Забронировать</button>
            <button class="btn btn--ghost btn--lg" data-add-close="${t.id}">${inCart(t.id) ? '✓ В списке' : 'Добавить в список'}</button>
          </div>
        </div>
      </div>`;
    openLayer('#productModal');
  }

  // ---------- Слои (модалки) ----------
  let lastFocus = null;
  function openLayer(sel) {
    lastFocus = document.activeElement;
    $(sel).hidden = false;
    document.body.classList.add('no-scroll');
    const close = $(sel + ' .modal__close');
    if (close) close.focus();
  }
  function closeLayer(el) {
    el.hidden = true;
    if ($$('.modal:not([hidden]), .drawer:not([hidden])').length === 0) document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }

  // ---------- Список аренды ----------
  function addToCart(id, silent) {
    const item = state.cart.find(i => i.id === id);
    if (item) { if (!silent) toast('Уже в списке аренды'); return; }
    state.cart.push({ id, qty: 1 });
    saveCart();
    renderGrid();
    const btn = $('#cartOpen');
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    if (!silent) toast('Добавлено: ' + toolById[id].name);
  }
  function changeQty(id, delta) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    const max = Math.max(toolById[id].stock, 1);
    item.qty += delta;
    if (item.qty > max) { item.qty = max; toast('В наличии только ' + max + ' шт.'); }
    if (item.qty < 1) state.cart = state.cart.filter(i => i.id !== id);
    saveCart();
    renderGrid();
    renderCart();
  }

  function isoDate(d) {
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  function daysBetween(a, b) {
    const ms = new Date(b + 'T12:00') - new Date(a + 'T12:00');
    return Math.max(1, Math.round(ms / 86400000));
  }

  function calc() {
    const b = state.booking;
    const days = b.start && b.end ? daysBetween(b.start, b.end) : 1;
    let base = 0, rent = 0, deposit = 0;
    state.cart.forEach(i => {
      const t = toolById[i.id];
      base += t.price * days * i.qty;
      rent += dayPrice(t, days) * days * i.qty;
      deposit += t.deposit * i.qty;
    });
    const delivery = b.delivery === 'delivery' ? CFG.deliveryPrice : 0;
    return { days, base, rent, discount: base - rent, deposit, delivery, total: rent + delivery };
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function renderCart() {
    const body = $('#cartBody');
    if (!state.cart.length) {
      body.innerHTML = `<div class="cart-empty"><p>Список аренды пуст.<br>Добавьте инструмент из каталога.</p><button class="btn btn--primary" data-goto-catalog>Перейти в каталог</button></div>`;
      return;
    }
    const today = isoDate(new Date());
    const b = state.booking;
    if (!b.start || b.start < today) b.start = today;
    if (!b.end || b.end <= b.start) { const d = new Date(b.start + 'T12:00'); d.setDate(d.getDate() + 1); b.end = isoDate(d); }
    if (!b.delivery) b.delivery = 'pickup';
    const c = calc();

    body.innerHTML = `
      <div>${state.cart.map(i => {
        const t = toolById[i.id];
        return `<div class="cart-item">
          <div class="cart-item__icon">${media(t)}</div>
          <div><div class="cart-item__name">${esc(t.name)}</div><div class="cart-item__price">${fmt(dayPrice(t, c.days))} ₽ / сутки · залог ${fmt(t.deposit)} ₽</div></div>
          <div class="qty"><button data-qty="${t.id}" data-d="-1" aria-label="Меньше">−</button><span>${i.qty}</span><button data-qty="${t.id}" data-d="1" aria-label="Больше">+</button></div>
        </div>`;
      }).join('')}</div>

      <form class="form" id="bookingForm" novalidate>
        <div class="form__row">
          <label class="field"><span>Дата получения</span><input type="date" name="start" min="${today}" value="${b.start}" required></label>
          <label class="field"><span>Дата возврата</span><input type="date" name="end" min="${b.start}" value="${b.end}" required></label>
        </div>
        <div class="seg">
          <label><input type="radio" name="delivery" value="pickup" ${b.delivery === 'pickup' ? 'checked' : ''}>Самовывоз<small>Бесплатно</small></label>
          <label><input type="radio" name="delivery" value="delivery" ${b.delivery === 'delivery' ? 'checked' : ''}>Доставка<small>${fmt(CFG.deliveryPrice)} ₽</small></label>
        </div>
        <label class="field" ${b.delivery === 'delivery' ? '' : 'hidden'} data-address-field><span>Адрес доставки</span><input name="address" value="${esc(b.address || '')}" placeholder="Улица, дом, квартира"></label>

        <div class="summary">
          <div><span>Срок аренды</span><b>${c.days} ${plural(c.days, 'сутки', 'суток', 'суток')}</b></div>
          <div><span>Аренда</span><span>${fmt(c.base)} ₽</span></div>
          ${c.discount ? `<div class="discount"><span>Скидка ${Math.round(discountFor(c.days) * 100)}%</span><span>−${fmt(c.discount)} ₽</span></div>` : `<div class="muted"><span>От 3 суток скидка 10%, от 7 — 25%</span></div>`}
          ${c.delivery ? `<div><span>Доставка</span><span>${fmt(c.delivery)} ₽</span></div>` : ''}
          <div class="total"><span>Итого</span><span>${fmt(c.total)} ₽</span></div>
          <div class="muted"><span>+ возвратный залог</span><span>${fmt(c.deposit)} ₽</span></div>
        </div>

        <label class="field"><span>Ваше имя</span><input name="name" autocomplete="name" value="${esc(b.name || '')}" required></label>
        <label class="field"><span>Телефон</span><input name="phone" type="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" value="${esc(b.phone || '')}" required></label>
        <label class="field"><span>Комментарий</span><textarea name="comment" rows="2" placeholder="Что планируете делать? Поможем с выбором">${esc(b.comment || '')}</textarea></label>
        <label class="consent"><input type="checkbox" name="consent" ${b.consent ? 'checked' : ''}> <span>Согласен на обработку персональных данных для оформления брони</span></label>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Отправить заявку</button>
        <p class="deposit-note" style="text-align:center">Оплата при получении. Менеджер перезвонит и подтвердит бронь.</p>
      </form>`;
  }

  function readForm(form) {
    const fd = new FormData(form);
    Object.assign(state.booking, {
      start: fd.get('start'), end: fd.get('end'), delivery: fd.get('delivery'),
      address: fd.get('address') || '', name: fd.get('name'), phone: fd.get('phone'),
      comment: fd.get('comment'), consent: !!fd.get('consent'),
    });
    if (state.booking.end <= state.booking.start) {
      const d = new Date(state.booking.start + 'T12:00'); d.setDate(d.getDate() + 1);
      state.booking.end = isoDate(d);
    }
    store.set('dalrent_booking', { name: state.booking.name, phone: state.booking.phone });
  }

  function setError(input, msg) {
    const field = input.closest('.field');
    field.classList.add('is-error');
    if (!field.querySelector('.field__err')) field.insertAdjacentHTML('beforeend', `<span class="field__err">${msg}</span>`);
  }

  async function submitBooking(form) {
    readForm(form);
    $$('.field.is-error', form).forEach(f => { f.classList.remove('is-error'); const e = f.querySelector('.field__err'); if (e) e.remove(); });
    const b = state.booking;
    let ok = true;
    if (!b.name || b.name.trim().length < 2) { setError(form.name, 'Укажите имя'); ok = false; }
    if (b.phone.replace(/\D/g, '').length < 10) { setError(form.phone, 'Укажите телефон полностью'); ok = false; }
    if (b.delivery === 'delivery' && b.address.trim().length < 5) { setError(form.address, 'Укажите адрес доставки'); ok = false; }
    if (!b.consent) { toast('Нужно согласие на обработку данных'); ok = false; }
    if (!ok) return;

    const c = calc();
    const order = {
      number: 'DR-' + Date.now().toString().slice(-6),
      createdAt: new Date().toISOString(),
      customer: { name: b.name.trim(), phone: b.phone.trim(), comment: b.comment || '' },
      dates: { start: b.start, end: b.end, days: c.days },
      delivery: b.delivery === 'delivery' ? { type: 'Доставка', address: b.address } : { type: 'Самовывоз' },
      items: state.cart.map(i => ({ id: i.id, name: toolById[i.id].name, qty: i.qty, pricePerDay: dayPrice(toolById[i.id], c.days) })),
      total: c.total, deposit: c.deposit,
    };

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Отправляем…';
    try {
      if (CFG.formEndpoint) {
        const res = await fetch(CFG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ subject: 'Заявка ' + order.number, ...order, text: orderText(order) }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } else {
        const all = store.get('dalrent_orders', []);
        all.push(order);
        store.set('dalrent_orders', all);
        console.info('[DALRENT demo] Заявка сохранена в браузере:', order);
      }
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Отправить заявку';
      toast('Не удалось отправить. Позвоните нам: ' + CFG.phone);
      return;
    }

    state.cart = [];
    saveCart();
    renderGrid();
    $('#cartBody').innerHTML = `
      <div class="success">
        <div class="success__icon">✓</div>
        <h3>Заявка ${order.number} принята</h3>
        <p>Менеджер перезвонит на ${esc(order.customer.phone)} в течение 15 минут и подтвердит бронь.</p>
        <p>Сумма аренды: <b>${fmt(order.total)} ₽</b>, залог: <b>${fmt(order.deposit)} ₽</b></p>
        <button class="btn btn--dark" data-close>Готово</button>
      </div>`;
  }

  function orderText(o) {
    return [
      `Заявка ${o.number}`,
      `Клиент: ${o.customer.name}, ${o.customer.phone}`,
      `Даты: ${o.dates.start} — ${o.dates.end} (${o.dates.days} сут.)`,
      `${o.delivery.type}${o.delivery.address ? ': ' + o.delivery.address : ''}`,
      ...o.items.map(i => `• ${i.name} × ${i.qty} — ${i.pricePerDay} ₽/сут`),
      `Итого: ${o.total} ₽, залог: ${o.deposit} ₽`,
      o.customer.comment ? `Комментарий: ${o.customer.comment}` : '',
    ].filter(Boolean).join('\n');
  }

  // ---------- Тост ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2600);
  }

  function scrollToCatalog() { $('#catalog').scrollIntoView({ behavior: 'smooth' }); }

  // ---------- События ----------
  function bind() {
    document.addEventListener('click', e => {
      const t = e.target;
      const el = sel => t.closest(sel);

      if (el('[data-add]')) { e.stopPropagation(); addToCart(el('[data-add]').dataset.add); return; }
      if (el('[data-open]')) { openProduct(el('[data-open]').dataset.open); return; }
      if (el('[data-cat]')) {
        state.cat = el('[data-cat]').dataset.cat; update();
        if (window.innerWidth <= 860) $('#filters').classList.remove('is-open');
        return;
      }
      if (el('[data-task]')) {
        const id = el('[data-task]').dataset.task;
        state.task = state.task === id ? null : id;
        update();
        if (el('#heroTasks')) scrollToCatalog();
        return;
      }
      if (el('[data-reset]')) { resetFilters(); return; }
      if (el('[data-book]')) {
        addToCart(el('[data-book]').dataset.book, true);
        closeLayer($('#productModal'));
        renderCart(); openLayer('#cartDrawer');
        return;
      }
      if (el('[data-add-close]')) { addToCart(el('[data-add-close]').dataset.addClose); closeLayer($('#productModal')); return; }
      if (el('[data-qty]')) { const b = el('[data-qty]'); changeQty(b.dataset.qty, +b.dataset.d); return; }
      if (el('[data-goto-catalog]')) { closeLayer($('#cartDrawer')); scrollToCatalog(); return; }
      if (el('[data-close]')) { closeLayer(el('.modal, .drawer')); return; }
      if (el('#cartOpen')) { renderCart(); openLayer('#cartDrawer'); return; }
      if (el('#burger')) { $('#nav').classList.toggle('is-open'); return; }
      if (el('#nav a')) { $('#nav').classList.remove('is-open'); return; }
      if (el('#filtersToggle')) { $('#filters').classList.toggle('is-open'); return; }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const open = $$('.modal:not([hidden]), .drawer:not([hidden])').pop();
        if (open) closeLayer(open);
      }
      if (e.key === 'Enter' && e.target.matches('.card')) openProduct(e.target.dataset.open);
    });

    // Пересчёт брони при изменении дат / доставки
    document.addEventListener('change', e => {
      const form = e.target.closest('#bookingForm');
      if (!form) return;
      if (['start', 'end', 'delivery'].includes(e.target.name)) {
        readForm(form);
        renderCart();
      }
    });
    document.addEventListener('submit', e => {
      if (e.target.id === 'bookingForm') { e.preventDefault(); submitBooking(e.target); }
    });

    $('#heroSearch').addEventListener('submit', e => {
      e.preventDefault();
      state.query = $('#heroQuery').value;
      $('#query').value = state.query;
      state.cat = 'all';
      update();
      scrollToCatalog();
    });
    let qTimer;
    $('#query').addEventListener('input', e => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { state.query = e.target.value; renderGrid(); }, 150);
    });
    $('#sort').addEventListener('change', e => { state.sort = e.target.value; renderGrid(); });
    $('#onlyStock').addEventListener('change', e => { state.onlyStock = e.target.checked; renderGrid(); });
  }

  fillContacts();
  saveCart();
  update();
  bind();
})();
