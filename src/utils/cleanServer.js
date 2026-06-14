const config = require('../config');
async function cleanServer(guild) {
  const r = { name: config.defaultServerName, iconSet: false, rolesDeleted: 0, channelsDeleted: 0, errors: 0, factoryChannelCreated: false };
  const chs = await guild.channels.fetch();
  const cats = [...chs.values()].filter(c => c.type === 4);
  for (const c of cats) { try { await c.delete('PRiMOBOT'); r.channelsDeleted++; await sleep(config.rateLimitDelay); } catch (e) { console.error('[CLEAN] cat:', e.message); r.errors++; } }
  const remain = await guild.channels.fetch();
  for (const [,c] of remain) { try { await c.delete('PRiMOBOT'); r.channelsDeleted++; await sleep(config.rateLimitDelay); } catch (e) { if (e.code !== 10003 && e.code !== 50013) { console.error('[CLEAN] ch:', e.message); r.errors++; } } }
  const roles = await guild.roles.fetch();
  for (const [,ro] of roles) { if (ro.name === '@everyone' || ro.managed) continue; try { await ro.delete('PRiMOBOT'); r.rolesDeleted++; await sleep(config.rateLimitDelay); } catch (e) { console.error('[CLEAN] role:', e.message); r.errors++; } }
  try { await guild.setName(config.defaultServerName, 'PRiMOBOT'); await sleep(config.rateLimitDelay); } catch (e) { r.errors++; }
  if (config.defaultIconUrl) { try { const buf = await downloadImg(config.defaultIconUrl); await guild.setIcon(`data:image/jpeg;base64,${buf.toString('base64')}`, 'PRiMOBOT'); r.iconSet = true; } catch (e) { r.errors++; } }
  try { const cat = await guild.channels.create({ name: config.factoryCategory, type: 4, reason: 'PRiMOBOT' }); await sleep(config.rateLimitDelay); await guild.channels.create({ name: config.factoryChannel, type: 0, parent: cat.id, topic: 'PRiMOBOT • Comandos do bot', reason: 'PRiMOBOT' }); r.factoryChannelCreated = true; } catch (e) { r.errors++; }
  return r;
}
async function downloadImg(url) { if (typeof fetch !== 'undefined') { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); } const mod = url.startsWith('https') ? require('node:https') : require('node:http'); return new Promise((resolve, reject) => { mod.get(url, res => { if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`)); const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks))); }).on('error', reject); }); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
module.exports = { cleanServer };
