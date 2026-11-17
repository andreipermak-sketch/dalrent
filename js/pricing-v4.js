// Единый расчёт для карточек, корзины и заявки.
(function (root) {
  'use strict';
  function rateStarts(tool) {
    return tool.rates ? [1, ...Object.keys(tool.rates).map(Number).filter(d => Number.isInteger(d) && d > 1).sort((a, b) => a - b)] : [1, 3, 7];
  }
  function dayPrice(tool, days) {
    if (tool.rates) {
      const start = rateStarts(tool).filter(d => days >= d).pop();
      return start > 1 ? tool.rates[start] : tool.price;
    }
    return Math.round(tool.price * (days >= 7 ? .75 : days >= 3 ? .9 : 1));
  }
  function rateBands(tool) {
    const starts = rateStarts(tool);
    return starts.map((start, i) => ({ start, end: starts[i + 1] ? starts[i + 1] - 1 : null, price: dayPrice(tool, start) }));
  }
  function calculate(cart, tools, days, delivery) {
    let base = 0, rent = 0, deposit = 0, consumables = 0;
    const consumableItems = [];
    cart.forEach(i => {
      const t = tools[i.id];
      base += t.price * days * i.qty;
      rent += dayPrice(t, days) * days * i.qty;
      deposit += t.deposit * i.qty;
      if (t.consumables) {
        const c = t.consumables;
        const quantity = c.qty * i.qty;
        const total = quantity * c.unitPrice;
        consumables += total;
        consumableItems.push({ name: c.name, quantity, unitPrice: c.unitPrice, total });
      }
    });
    const total = rent + consumables + delivery;
    return { days, base, rent, discount: base - rent, deposit, consumables, consumableItems, delivery, total, payable: total + deposit };
  }
  root.DALRENT_PRICING = { dayPrice, rateBands, calculate };
})(typeof window === 'undefined' ? globalThis : window);
