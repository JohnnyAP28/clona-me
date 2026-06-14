const fs = require('node:fs');
const path = require('node:path');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function ensureDataDir() { if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); return DATA_DIR; }

// ═══════════════════════════════════════════════
//  TICKET MANAGER
// ═══════════════════════════════════════════════
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
function loadTickets() {
  try { if(fs.existsSync(TICKETS_FILE)) return JSON.parse(fs.readFileSync(TICKETS_FILE,'utf-8')); } catch(_) {}
  return { nextId:1, tickets:{} };
}
function saveTickets(d) { ensureDataDir(); fs.writeFileSync(TICKETS_FILE,JSON.stringify(d,null,2)); }
const tickets = loadTickets();

function createTicket(guildId, userId, channelId) {
  const id = tickets.nextId++;
  tickets.tickets[id] = { id, guildId, userId, channelId, status:'open', createdAt:new Date().toISOString(), closedAt:null };
  saveTickets(tickets);
  return tickets.tickets[id];
}
function getTicket(id) { return tickets.tickets[id] || null; }
function getTicketByChannel(channelId) {
  return Object.values(tickets.tickets).find(t=>t.channelId===channelId)||null;
}
function closeTicket(id) {
  const t = tickets.tickets[id]; if(!t) return null;
  t.status = 'closed'; t.closedAt = new Date().toISOString();
  saveTickets(tickets); return t;
}
function listOpenTickets(guildId) {
  return Object.values(tickets.tickets).filter(t=>t.guildId===guildId&&t.status==='open');
}
function getUserOpenTickets(guildId, userId) {
  return Object.values(tickets.tickets).filter(t=>t.guildId===guildId&&t.userId===userId&&t.status==='open');
}

// ═══════════════════════════════════════════════
//  COUPON MANAGER
// ═══════════════════════════════════════════════
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');
function loadCoupons() {
  try { if(fs.existsSync(COUPONS_FILE)) return JSON.parse(fs.readFileSync(COUPONS_FILE,'utf-8')); } catch(_) {}
  return {};
}
function saveCoupons(d) { ensureDataDir(); fs.writeFileSync(COUPONS_FILE,JSON.stringify(d,null,2)); }
const coupons = loadCoupons();

function createCoupon(code, discount, maxUses, expiresAt) {
  code = code.toUpperCase().trim();
  coupons[code] = { code, discount:parseFloat(discount), maxUses:parseInt(maxUses)||0, uses:0, expiresAt:expiresAt||null, createdAt:new Date().toISOString() };
  saveCoupons(coupons);
  return coupons[code];
}
function validateCoupon(code) {
  code = code.toUpperCase().trim();
  const c = coupons[code]; if(!c) return {valid:false,reason:'Cupom não encontrado.'};
  if(c.expiresAt && new Date(c.expiresAt) < new Date()) return {valid:false,reason:'Cupom expirado.'};
  if(c.maxUses > 0 && c.uses >= c.maxUses) return {valid:false,reason:'Cupom esgotado.'};
  return {valid:true,coupon:c};
}
function useCoupon(code) {
  code = code.toUpperCase().trim();
  const c = coupons[code]; if(!c) return null;
  c.uses++; saveCoupons(coupons); return c;
}
function listCoupons() { return Object.values(coupons); }
function deleteCoupon(code) { code = code.toUpperCase().trim(); const r = delete coupons[code]; saveCoupons(coupons); return r; }

// ═══════════════════════════════════════════════
//  RAFFLE MANAGER
// ═══════════════════════════════════════════════
const RAFFLES_FILE = path.join(DATA_DIR, 'raffles.json');
function loadRaffles() {
  try { if(fs.existsSync(RAFFLES_FILE)) return JSON.parse(fs.readFileSync(RAFFLES_FILE,'utf-8')); } catch(_) {}
  return { nextId:1, raffles:{}, activeTimers:{} };
}
function saveRaffles(d) { ensureDataDir(); fs.writeFileSync(RAFFLES_FILE,JSON.stringify(d,null,2)); }
const raffles = loadRaffles();

function createRaffle(guildId, channelId, prize, winnerCount, durationMinutes, createdBy) {
  const id = raffles.nextId++;
  const endAt = new Date(Date.now() + durationMinutes*60000).toISOString();
  const r = { id, guildId, channelId, prize, winnerCount, durationMinutes, createdBy, participants:[], status:'active', createdAt:new Date().toISOString(), endAt, winners:[] };
  raffles.raffles[id] = r;
  saveRaffles(raffles);
  return r;
}
function joinRaffle(id, userId) {
  const r = raffles.raffles[id]; if(!r||r.status!=='active') return {ok:false,reason:'Sorteio não encontrado ou encerrado.'};
  if(r.participants.includes(userId)) return {ok:false,reason:'Você já está participando.'};
  r.participants.push(userId); saveRaffles(raffles); return {ok:true,count:r.participants.length};
}
function drawRaffle(id) {
  const r = raffles.raffles[id]; if(!r||r.status!=='active') return null;
  const pool = [...r.participants]; const winners = [];
  for(let i=0;i<r.winnerCount&&pool.length>0;i++) {
    const idx = Math.floor(Math.random()*pool.length);
    winners.push(pool.splice(idx,1)[0]);
  }
  r.winners = winners; r.status = 'finished'; saveRaffles(raffles); return r;
}
function getRaffle(id) { return raffles.raffles[id]||null; }
function listActiveRaffles(guildId) { return Object.values(raffles.raffles).filter(r=>r.guildId===guildId&&r.status==='active'); }

module.exports = {
  // Tickets
  createTicket, getTicket, getTicketByChannel, closeTicket, listOpenTickets, getUserOpenTickets,
  // Coupons
  createCoupon, validateCoupon, useCoupon, listCoupons, deleteCoupon,
  // Raffles
  createRaffle, joinRaffle, drawRaffle, getRaffle, listActiveRaffles,
};
